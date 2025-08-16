"""
동적 포지션 사이징 및 리스크 관리 시스템
- Kelly Criterion 기반 포지션 사이징
- MDD 기반 자동 포지션 축소
- 연속 손실 시 리스크 축소
"""

import logging
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class DynamicPositionSizer:
    """동적 포지션 사이징 관리자"""
    
    def __init__(self, 
                 initial_capital: float = 10000.0,
                 max_position_pct: float = 0.25,  # 최대 25% 포지션
                 mdd_threshold: float = 0.15,     # MDD 15% 시 포지션 축소
                 kelly_lookback: int = 100):      # Kelly 계산용 과거 거래 수
        """
        초기화
        
        Args:
            initial_capital: 초기 자본금
            max_position_pct: 최대 포지션 비율 (0~1)
            mdd_threshold: MDD 임계치 (0~1)
            kelly_lookback: Kelly 계산용 과거 거래 수
        """
        self.initial_capital = initial_capital
        self.current_capital = initial_capital
        self.max_position_pct = max_position_pct
        self.mdd_threshold = mdd_threshold
        self.kelly_lookback = kelly_lookback
        
        # 성과 추적
        self.peak_capital = initial_capital
        self.current_mdd = 0.0
        self.trade_history: List[Dict] = []
        self.capital_history: List[float] = [initial_capital]
        
        # 연속 손실 추적
        self.consecutive_losses = 0
        self.max_consecutive_losses = 5
        
    def calculate_kelly_fraction(self, recent_trades: List[Dict]) -> float:
        """
        Kelly Criterion을 사용한 최적 포지션 크기 계산
        
        Args:
            recent_trades: 최근 거래 기록
            
        Returns:
            Kelly fraction (0~1)
        """
        if len(recent_trades) < 10:
            return 0.01  # 데이터 부족 시 보수적 접근
            
        returns = [trade['return_pct'] / 100 for trade in recent_trades[-self.kelly_lookback:]]
        returns = np.array(returns)
        
        # 승률과 평균 수익/손실 계산
        wins = returns[returns > 0]
        losses = returns[returns < 0]
        
        if len(wins) == 0 or len(losses) == 0:
            return 0.01
            
        win_rate = len(wins) / len(returns)
        avg_win = np.mean(wins)
        avg_loss = abs(np.mean(losses))
        
        # Kelly Fraction = (bp - q) / b
        # b = avg_win/avg_loss (배당률)
        # p = win_rate (승률)
        # q = 1 - p (패률)
        
        if avg_loss == 0:
            return 0.01
            
        b = avg_win / avg_loss
        p = win_rate
        q = 1 - p
        
        kelly_fraction = (b * p - q) / b
        
        # Kelly fraction을 보수적으로 조정 (Kelly의 25% 사용)
        conservative_kelly = max(0, min(kelly_fraction * 0.25, self.max_position_pct))
        
        logger.info(f"Kelly 계산: 승률={p:.3f}, 평균승={avg_win:.3f}, 평균패={avg_loss:.3f}, Kelly={kelly_fraction:.3f}, 보수적Kelly={conservative_kelly:.3f}")
        
        return conservative_kelly
    
    def calculate_mdd_adjustment(self) -> float:
        """
        현재 MDD에 따른 포지션 조정 계수 계산
        
        Returns:
            조정 계수 (0~1)
        """
        if self.current_mdd < self.mdd_threshold:
            return 1.0
        
        # MDD가 임계치를 초과하면 점진적으로 포지션 축소
        # MDD 30%에서 포지션을 50%까지 축소
        max_reduction = 0.5
        excess_mdd = self.current_mdd - self.mdd_threshold
        reduction_factor = min(excess_mdd / 0.15, 1.0)  # 15% 추가 MDD에서 최대 축소
        
        adjustment = 1.0 - (max_reduction * reduction_factor)
        
        logger.warning(f"MDD 조정: 현재MDD={self.current_mdd:.3f}, 조정계수={adjustment:.3f}")
        
        return adjustment
    
    def calculate_consecutive_loss_adjustment(self) -> float:
        """
        연속 손실에 따른 포지션 조정 계수 계산
        
        Returns:
            조정 계수 (0~1)
        """
        if self.consecutive_losses < 3:
            return 1.0
        
        # 연속 손실 3회부터 포지션 축소 시작
        reduction = min(0.1 * (self.consecutive_losses - 2), 0.5)  # 최대 50% 축소
        return 1.0 - reduction
    
    def get_position_size(self, signal_confidence: float, recent_trades: List[Dict]) -> float:
        """
        모든 요소를 고려한 최종 포지션 크기 계산
        
        Args:
            signal_confidence: 신호 신뢰도 (0~1)
            recent_trades: 최근 거래 기록
            
        Returns:
            포지션 크기 (달러 금액)
        """
        # Kelly Criterion 기반 기본 포지션
        kelly_fraction = self.calculate_kelly_fraction(recent_trades)
        
        # 신호 신뢰도 조정
        confidence_adjustment = signal_confidence
        
        # MDD 조정
        mdd_adjustment = self.calculate_mdd_adjustment()
        
        # 연속 손실 조정
        loss_adjustment = self.calculate_consecutive_loss_adjustment()
        
        # 최종 포지션 크기
        final_fraction = kelly_fraction * confidence_adjustment * mdd_adjustment * loss_adjustment
        position_size = self.current_capital * final_fraction
        
        # 최소/최대 제한
        min_position = 100.0  # 최소 $100
        max_position = self.current_capital * self.max_position_pct
        
        position_size = max(min_position, min(position_size, max_position))
        
        logger.info(f"포지션 계산: Kelly={kelly_fraction:.3f}, 신뢰도={confidence_adjustment:.3f}, "
                   f"MDD조정={mdd_adjustment:.3f}, 손실조정={loss_adjustment:.3f}, "
                   f"최종크기=${position_size:.2f}")
        
        return position_size
    
    def update_capital(self, trade_pnl: float, trade_return_pct: float):
        """
        거래 결과에 따른 자본 및 통계 업데이트
        
        Args:
            trade_pnl: 거래 손익 (달러)
            trade_return_pct: 거래 수익률 (%)
        """
        # 자본 업데이트
        self.current_capital += trade_pnl
        self.capital_history.append(self.current_capital)
        
        # 거래 기록 저장
        trade_record = {
            'timestamp': datetime.now(),
            'pnl': trade_pnl,
            'return_pct': trade_return_pct,
            'capital_after': self.current_capital
        }
        self.trade_history.append(trade_record)
        
        # 피크 및 MDD 업데이트
        if self.current_capital > self.peak_capital:
            self.peak_capital = self.current_capital
            self.current_mdd = 0.0
        else:
            self.current_mdd = (self.peak_capital - self.current_capital) / self.peak_capital
        
        # 연속 손실 카운트 업데이트
        if trade_pnl < 0:
            self.consecutive_losses += 1
        else:
            self.consecutive_losses = 0
        
        logger.info(f"자본 업데이트: ${self.current_capital:.2f}, MDD: {self.current_mdd:.3f}, "
                   f"연속손실: {self.consecutive_losses}")
    
    def should_trigger_retraining(self) -> bool:
        """
        재학습 트리거 조건 확인
        
        Returns:
            재학습 필요 여부
        """
        # MDD 30% 이상
        if self.current_mdd >= 0.30:
            logger.warning(f"재학습 트리거: MDD {self.current_mdd:.1%} >= 30%")
            return True
        
        # 연속 손실 7회 이상
        if self.consecutive_losses >= 7:
            logger.warning(f"재학습 트리거: 연속 손실 {self.consecutive_losses}회 >= 7회")
            return True
        
        # 최근 20거래 승률이 30% 이하
        if len(self.trade_history) >= 20:
            recent_trades = self.trade_history[-20:]
            recent_wins = sum(1 for trade in recent_trades if trade['pnl'] > 0)
            recent_win_rate = recent_wins / 20
            
            if recent_win_rate <= 0.30:
                logger.warning(f"재학습 트리거: 최근 승률 {recent_win_rate:.1%} <= 30%")
                return True
        
        return False
    
    def get_risk_metrics(self) -> Dict:
        """
        현재 리스크 메트릭 반환
        
        Returns:
            리스크 메트릭 딕셔너리
        """
        if len(self.capital_history) < 2:
            return {
                'current_capital': self.current_capital,
                'total_return_pct': 0.0,
                'max_drawdown_pct': 0.0,
                'consecutive_losses': 0,
                'needs_retraining': False
            }
        
        total_return_pct = (self.current_capital - self.initial_capital) / self.initial_capital * 100
        
        return {
            'current_capital': self.current_capital,
            'peak_capital': self.peak_capital,
            'total_return_pct': total_return_pct,
            'max_drawdown_pct': self.current_mdd * 100,
            'consecutive_losses': self.consecutive_losses,
            'total_trades': len(self.trade_history),
            'needs_retraining': self.should_trigger_retraining()
        }

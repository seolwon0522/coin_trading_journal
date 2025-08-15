"""
전략 점수 기반 필터링 시스템
- 90점 이상 전략만 실행
- 동적 임계값 조정
- 실시간 점수 계산
"""

import logging
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@dataclass
class StrategySignal:
    """전략 신호 데이터 클래스"""
    symbol: str
    timestamp: datetime
    strategy_type: str  # breakout, trend, counter_trend
    entry_price: float
    stop_loss: float
    take_profit: float
    score: float
    confidence: float
    risk_level: str
    # 한글 주석: 신호 생성 시점의 특징값들을 함께 저장 (ML 스코어링 용)
    features: Dict[str, float] | None = None

class StrategyFilter:
    """전략 점수 기반 필터링"""
    
    def __init__(self, min_score: float = 90.0, rolling_window: int = 20):
        """
        필터 초기화
        
        Args:
            min_score: 최소 허용 점수
            rolling_window: 이동평균 윈도우 크기
        """
        self.min_score = min_score
        self.rolling_window = rolling_window
        self.score_history = []
        self.dynamic_threshold = True
        # 한글 주석: 적응형 정책 파라미터 (자동 조정 대상)
        self.min_confidence: float = 0.4
        self.allow_high_risk: bool = True
        
    def should_execute_strategy(self, signal: StrategySignal) -> Tuple[bool, str]:
        """
        전략 실행 여부 판단
        
        Args:
            signal: 전략 신호
            
        Returns:
            (실행여부, 이유)
        """
        # 한글 주석: 기본 점수 필터링
        if signal.score < self.min_score:
            return False, f"점수 부족: {signal.score:.1f} < {self.min_score}"
        
        # 한글 주석: 동적 임계값 적용
        if self.dynamic_threshold:
            dynamic_min = self._calculate_dynamic_threshold()
            if signal.score < dynamic_min:
                return False, f"동적 임계값 미달: {signal.score:.1f} < {dynamic_min:.1f}"
        
        # 한글 주석: 리스크 레벨 체크
        if not self._check_risk_level(signal):
            return False, f"리스크 레벨 초과: {signal.risk_level}"
        
        # 한글 주석: 신뢰도 체크 (완화: 0.4)
        if signal.confidence < self.min_confidence:
            return False, f"신뢰도 부족: {signal.confidence:.2f} < {self.min_confidence:.2f}"
        
        # 한글 주석: 모든 조건 통과
        self._update_score_history(signal.score)
        return True, f"실행 승인: 점수 {signal.score:.1f}, 신뢰도 {signal.confidence:.2f}"
    
    def _calculate_dynamic_threshold(self) -> float:
        """동적 임계값 계산"""
        if len(self.score_history) < self.rolling_window:
            return self.min_score
        
        # 한글 주석: 최근 성과의 이동평균 + 표준편차 고려
        recent_scores = self.score_history[-self.rolling_window:]
        mean_score = np.mean(recent_scores)
        std_score = np.std(recent_scores)
        
        # 한글 주석: 보수적 접근 (평균 + 0.5 * 표준편차)
        dynamic_threshold = mean_score + 0.5 * std_score
        
        # 한글 주석: 기본 최소값보다 낮아지지 않도록 제한
        return max(dynamic_threshold, self.min_score)
    
    def _check_risk_level(self, signal: StrategySignal) -> bool:
        """리스크 레벨 검증"""
        risk_limits = {
            "low": True,      # 항상 허용
            "medium": True,   # 허용
            "high": self.allow_high_risk,     # 고위험: 정책에 따라 허용/거부
            "extreme": False  # 극고위험 거부
        }
        
        return risk_limits.get(signal.risk_level, False)
    
    def _update_score_history(self, score: float):
        """점수 히스토리 업데이트"""
        self.score_history.append(score)
        
        # 한글 주석: 히스토리 크기 제한
        if len(self.score_history) > self.rolling_window * 2:
            self.score_history = self.score_history[-self.rolling_window:]
    
    def get_filter_stats(self) -> Dict:
        """필터 통계 조회"""
        if not self.score_history:
            return {"message": "데이터 없음"}
        
        recent_scores = self.score_history[-self.rolling_window:] if len(self.score_history) >= self.rolling_window else self.score_history
        
        return {
            "current_threshold": self.min_score,
            "dynamic_threshold": self._calculate_dynamic_threshold() if self.dynamic_threshold else None,
            "recent_avg_score": np.mean(recent_scores),
            "recent_std_score": np.std(recent_scores),
            "total_signals": len(self.score_history),
            "recent_signals": len(recent_scores),
            "min_confidence": self.min_confidence,
            "allow_high_risk": self.allow_high_risk
        }

    # ===== 적응형 정책 =====
    def adapt_thresholds(self, executed_trades: List[Dict]) -> Dict:
        """실행된 거래 성과 기반으로 필터 정책 자동 조정
        - 성과 양호(승률>60% & PF>1.2): 완화
        - 성과 저조(승률<45% 또는 PF<1.0): 강화
        """
        if not executed_trades:
            # 데이터가 없으면 미세 완화로 더 많은 샘플을 유도
            self.min_score = max(70.0, self.min_score - 1.0)
            self.min_confidence = max(0.3, self.min_confidence - 0.02)
            return self._current_policy()

        import pandas as pd
        df = pd.DataFrame(executed_trades)
        win_rate = (df['pnl'] > 0).mean() * 100.0
        gross_profit = float(df.loc[df['pnl']>0, 'pnl'].sum())
        gross_loss = float(df.loc[df['pnl']<0, 'pnl'].sum())
        profit_factor = (gross_profit / abs(gross_loss)) if gross_loss < 0 else 2.0

        # 조정 로직
        if win_rate > 60.0 and profit_factor > 1.2:
            # 완화
            self.min_score = max(70.0, self.min_score - 2.0)
            self.min_confidence = max(0.3, self.min_confidence - 0.05)
            self.allow_high_risk = True
        elif win_rate < 45.0 or profit_factor < 1.0:
            # 강화
            self.min_score = min(95.0, self.min_score + 2.0)
            self.min_confidence = min(0.8, self.min_confidence + 0.05)
            self.allow_high_risk = False
        else:
            # 미세 조정 없음
            pass

        return self._current_policy()

    def _current_policy(self) -> Dict:
        return {
            'min_score': round(self.min_score, 2),
            'min_confidence': round(self.min_confidence, 2),
            'allow_high_risk': self.allow_high_risk
        }

class BacktestingDataCollector:
    """백테스팅 데이터 수집기"""
    
    def __init__(self):
        self.executed_trades = []
        self.rejected_signals = []
        
    def record_executed_trade(self, signal: StrategySignal, result: Dict):
        """실행된 거래 기록"""
        trade_record = {
            "timestamp": signal.timestamp,
            "symbol": signal.symbol,
            "strategy_type": signal.strategy_type,
            "entry_price": signal.entry_price,
            "stop_loss": signal.stop_loss,
            "take_profit": signal.take_profit,
            "strategy_score": signal.score,
            "confidence": signal.confidence,
            "risk_level": signal.risk_level,
            
            # 한글 주석: 거래 결과
            "exit_price": result.get("exit_price"),
            "exit_timestamp": result.get("exit_timestamp"),
            "pnl": result.get("pnl"),
            "return_pct": result.get("return_pct"),
            "duration_minutes": result.get("duration_minutes"),
            "exit_reason": result.get("exit_reason")  # profit, stop_loss, timeout
        }
        
        self.executed_trades.append(trade_record)
        logger.info(f"거래 기록 추가: {signal.symbol} {signal.strategy_type} 수익률 {result.get('return_pct', 0):.2f}%")
    
    def record_rejected_signal(self, signal: StrategySignal, reason: str):
        """거부된 신호 기록"""
        rejection_record = {
            "timestamp": signal.timestamp,
            "symbol": signal.symbol,
            "strategy_type": signal.strategy_type,
            "score": signal.score,
            "confidence": signal.confidence,
            "rejection_reason": reason
        }
        
        self.rejected_signals.append(rejection_record)
    
    def get_ml_training_data(self) -> pd.DataFrame:
        """ML 학습용 데이터 생성"""
        if not self.executed_trades:
            return pd.DataFrame()
        
        # 한글 주석: 실행된 거래만 ML 학습 데이터로 사용
        df = pd.DataFrame(self.executed_trades)
        
        # 한글 주석: ML 피처 추가 계산
        df = self._add_ml_features(df)
        
        return df
    
    def _add_ml_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """ML 피처 추가"""
        # 한글 주석: 기존 피처를 ML 피처로 매핑
        df['entry_timing_score'] = df['strategy_score']  # 임시 매핑
        df['exit_timing_score'] = df['strategy_score'] * 0.9  # 임시 계산
        df['risk_mgmt_score'] = df['confidence'] * 100
        df['pnl_ratio'] = df['pnl'] / df['entry_price']
        
        # 한글 주석: 타겟 변수
        df['target_return_pct'] = df['return_pct']
        
        return df
    
    def export_training_data(self, filepath: str):
        """학습 데이터 내보내기"""
        df = self.get_ml_training_data()
        if not df.empty:
            df.to_csv(filepath, index=False)
            logger.info(f"ML 학습 데이터 저장: {filepath} ({len(df)}건)")
        else:
            logger.warning("내보낼 학습 데이터가 없습니다")

def create_strategy_filter(min_score: float = 90.0) -> StrategyFilter:
    """전략 필터 생성"""
    return StrategyFilter(min_score=min_score)

# 한글 주석: 사용 예시
if __name__ == "__main__":
    # 테스트용 신호 생성
    test_signal = StrategySignal(
        symbol="BTCUSDT",
        timestamp=datetime.now(),
        strategy_type="breakout",
        entry_price=45000.0,
        stop_loss=44000.0,
        take_profit=47000.0,
        score=92.5,
        confidence=0.85,
        risk_level="medium"
    )
    
    # 필터 테스트
    filter_engine = create_strategy_filter()
    should_execute, reason = filter_engine.should_execute_strategy(test_signal)
    
    print(f"실행 여부: {should_execute}")
    print(f"이유: {reason}")
    print(f"필터 통계: {filter_engine.get_filter_stats()}")

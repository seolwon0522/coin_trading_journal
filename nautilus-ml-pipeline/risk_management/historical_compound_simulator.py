"""
기존 거래 기록을 활용한 복리 효과 시뮬레이션
- 데이터베이스의 10년치 거래 기록 활용
- Kelly Criterion 적용
- 실시간 MDD 모니터링
"""

import logging
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List
from sqlalchemy import text
import sys
from pathlib import Path

# 상위 디렉토리 모듈 임포트
sys.path.append(str(Path(__file__).parent.parent))
from database_manager import BacktestDatabaseManager
from risk_management.position_sizer import DynamicPositionSizer

logger = logging.getLogger(__name__)

class HistoricalCompoundSimulator:
    """기존 거래 기록을 활용한 복리 시뮬레이션"""
    
    def __init__(self, initial_capital: float = 10000.0):
        """
        시뮬레이터 초기화
        
        Args:
            initial_capital: 초기 자본금
        """
        self.initial_capital = initial_capital
        self.db_manager = BacktestDatabaseManager()
        self.position_sizer = DynamicPositionSizer(
            initial_capital=initial_capital,
            max_position_pct=0.20,  # 최대 20% 포지션
            mdd_threshold=0.15,     # MDD 15% 시 포지션 축소
            kelly_lookback=100      # 최근 100거래로 Kelly 계산
        )
        
    def load_historical_trades(self, start_year: int = 2016, end_year: int = 2025) -> pd.DataFrame:
        """
        데이터베이스에서 역사적 거래 기록 로드
        
        Args:
            start_year: 시작 연도
            end_year: 종료 연도
            
        Returns:
            거래 기록 DataFrame
        """
        with self.db_manager.engine.connect() as conn:
            query = text("""
                SELECT 
                    timestamp,
                    symbol,
                    strategy_type,
                    entry_price,
                    exit_price,
                    pnl,
                    return_pct,
                    duration_minutes,
                    exit_reason,
                    strategy_score,
                    confidence,
                    risk_level
                FROM backtest_trades 
                WHERE EXTRACT(YEAR FROM timestamp) >= :start_year 
                  AND EXTRACT(YEAR FROM timestamp) <= :end_year
                ORDER BY timestamp ASC
            """)
            
            df = pd.read_sql(query, conn, params={
                'start_year': start_year,
                'end_year': end_year
            })
            
        logger.info(f"로드된 거래 기록: {len(df)}개 ({start_year}-{end_year})")
        return df
    
    def simulate_compound_trading(self, trades_df: pd.DataFrame) -> Dict:
        """
        복리 거래 시뮬레이션 실행
        
        Args:
            trades_df: 거래 기록 DataFrame
            
        Returns:
            시뮬레이션 결과
        """
        print(f"🚀 복리 거래 시뮬레이션 시작")
        print(f"초기 자본: ${self.initial_capital:,.2f}")
        print(f"총 거래 수: {len(trades_df):,}개")
        print("=" * 60)
        
        simulation_results = []
        retraining_triggers = []
        
        for i, row in trades_df.iterrows():
            # 최근 거래 기록 (Kelly 계산용)
            recent_trades = []
            if len(simulation_results) > 0:
                for r in simulation_results[-100:]:  # 최근 100거래
                    recent_trades.append({
                        'return_pct': r.get('original_return_pct', 0),
                        'pnl': r.get('new_pnl', 0)
                    })
            
            # 동적 포지션 크기 계산
            confidence = row.get('confidence', 0.5)
            if pd.isna(confidence):
                confidence = 0.5
                
            position_size = self.position_sizer.get_position_size(
                signal_confidence=confidence,
                recent_trades=recent_trades
            )
            
            # 원래 거래의 수익률을 포지션 크기에 맞게 조정
            original_return_pct = row['return_pct']
            
            # 새로운 PnL 계산 (동적 포지션 크기 적용)
            if not pd.isna(original_return_pct):
                new_pnl = position_size * (original_return_pct / 100)
            else:
                new_pnl = 0
            
            # 포지션 사이저 업데이트
            self.position_sizer.update_capital(new_pnl, original_return_pct)
            
            # 결과 기록
            result = {
                'timestamp': row['timestamp'],
                'symbol': row['symbol'],
                'strategy_type': row['strategy_type'],
                'original_pnl': row['pnl'],
                'original_return_pct': original_return_pct,
                'position_size': position_size,
                'new_pnl': new_pnl,
                'capital_after': self.position_sizer.current_capital,
                'mdd': self.position_sizer.current_mdd,
                'consecutive_losses': self.position_sizer.consecutive_losses
            }
            simulation_results.append(result)
            
            # 재학습 트리거 확인
            if self.position_sizer.should_trigger_retraining():
                trigger_info = {
                    'timestamp': row['timestamp'],
                    'capital': self.position_sizer.current_capital,
                    'mdd': self.position_sizer.current_mdd,
                    'consecutive_losses': self.position_sizer.consecutive_losses,
                    'trade_index': i
                }
                retraining_triggers.append(trigger_info)
                logger.warning(f"재학습 트리거 발생: {row['timestamp']} (MDD: {self.position_sizer.current_mdd:.1%})")
            
            # 진행률 표시 (1000거래마다)
            if (i + 1) % 1000 == 0:
                progress = (i + 1) / len(trades_df) * 100
                current_capital = self.position_sizer.current_capital
                total_return = (current_capital - self.initial_capital) / self.initial_capital * 100
                print(f"진행률: {progress:.1f}% | 자본: ${current_capital:,.2f} | 수익률: {total_return:+.2f}% | MDD: {self.position_sizer.current_mdd:.1%}")
        
        # 최종 결과
        final_metrics = self.position_sizer.get_risk_metrics()
        
        return {
            'simulation_results': simulation_results,
            'retraining_triggers': retraining_triggers,
            'final_metrics': final_metrics,
            'initial_capital': self.initial_capital,
            'final_capital': final_metrics['current_capital'],
            'total_return_pct': final_metrics['total_return_pct'],
            'max_drawdown_pct': final_metrics['max_drawdown_pct'],
            'total_trades': len(simulation_results),
            'retraining_count': len(retraining_triggers)
        }
    
    def print_results(self, results: Dict):
        """시뮬레이션 결과 출력"""
        print("\n" + "=" * 60)
        print("🎯 복리 거래 시뮬레이션 결과")
        print("=" * 60)
        
        print(f"초기 자본:    ${results['initial_capital']:,.2f}")
        print(f"최종 자본:    ${results['final_capital']:,.2f}")
        print(f"절대 수익:    ${results['final_capital'] - results['initial_capital']:,.2f}")
        print(f"총 수익률:    {results['total_return_pct']:+.2f}%")
        print(f"최대 MDD:     {results['max_drawdown_pct']:.2f}%")
        print(f"총 거래 수:   {results['total_trades']:,}개")
        print(f"재학습 횟수:  {results['retraining_count']}회")
        
        # 연평균 수익률 계산 (CAGR)
        years = (len(results['simulation_results']) / 365.25) if results['simulation_results'] else 1
        if years > 0:
            cagr = ((results['final_capital'] / results['initial_capital']) ** (1/years) - 1) * 100
            print(f"연평균 수익률: {cagr:.2f}%")
        
        print("\n🔥 기존 시스템 vs 새로운 시스템:")
        print(f"기존 (고정 포지션): 단순 PnL 합계")
        print(f"새로운 (복리):     Kelly Criterion + 동적 포지션 + 리스크 관리")
        
        if results['retraining_triggers']:
            print(f"\n⚠️  재학습 트리거 발생 시점:")
            for trigger in results['retraining_triggers'][:5]:  # 처음 5개만 표시
                print(f"  {trigger['timestamp']} | MDD: {trigger['mdd']:.1%} | 자본: ${trigger['capital']:,.2f}")

def run_compound_simulation():
    """복리 시뮬레이션 실행"""
    simulator = HistoricalCompoundSimulator(initial_capital=10000.0)
    
    # 전체 기간 거래 기록 로드
    trades_df = simulator.load_historical_trades(start_year=2016, end_year=2025)
    
    if len(trades_df) == 0:
        print("❌ 거래 기록이 없습니다.")
        return
    
    # 복리 시뮬레이션 실행
    results = simulator.simulate_compound_trading(trades_df)
    
    # 결과 출력
    simulator.print_results(results)
    
    return results

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    run_compound_simulation()

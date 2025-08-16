"""
노틸러스 트레이더 백테스팅 러너
- 전략 점수 기반 백테스팅 실행
- ML 파이프라인과 연동
- 고품질 거래 데이터 생성
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import pandas as pd
import sys
import os

# 한글 주석: 노틸러스 대신 독립적인 백테스팅 시뮬레이터 사용
# 복잡한 의존성을 피하고 순수 Python으로 구현

from .strategy_filter import StrategyFilter, BacktestingDataCollector, StrategySignal
# 한글 주석: 동적 포지션 사이징 시스템 임포트
sys.path.append(str(Path(__file__).parent.parent))
from risk_management.position_sizer import DynamicPositionSizer

logger = logging.getLogger(__name__)

class MLBacktestStrategy:
    """ML 피드백 기반 백테스팅 전략"""
    
    def __init__(self, strategy_filter: StrategyFilter, data_collector: BacktestingDataCollector, scoring_config: Dict | None = None):
        """
        전략 초기화
        
        Args:
            strategy_filter: 전략 점수 필터
            data_collector: 데이터 수집기
        """
        self.strategy_filter = strategy_filter
        self.data_collector = data_collector
        self.signals_generated = []
        self.trades_executed = []
        # 한글 주석: 스코어링 모드 (baseline | ml | hybrid)
        scoring_config = scoring_config or {}
        self.scoring_mode: str = scoring_config.get('mode', 'baseline')
        self.hybrid_weight: float = float(scoring_config.get('hybrid_weight', 0.4))
        
        # 한글 주석: 모델 매니저 캐싱 (무한 로딩 방지)
        self._model_manager = None
        self._cached_model = None
        
    def generate_signals(self, bars: List[Dict]) -> List[StrategySignal]:
        """
        가격 데이터로부터 거래 신호 생성
        
        Args:
            bars: 가격 바 데이터
            
        Returns:
            거래 신호 리스트
        """
        signals = []
        
        for i, bar in enumerate(bars[20:], 20):  # 한글 주석: 최소 20개 바 필요
            # 한글 주석: 간단한 기술적 분석 기반 신호 생성
            signal = self._analyze_bar_pattern(bars[i-20:i+1], bar)
            if signal:
                signals.append(signal)
                
        return signals
    
    def _analyze_bar_pattern(self, recent_bars: List[Dict], current_bar: Dict) -> Optional[StrategySignal]:
        """바 패턴 분석하여 신호 생성"""
        if len(recent_bars) < 20:
            return None
            
        # 한글 주석: 가격 및 볼륨 데이터 추출
        closes = [float(bar['close']) for bar in recent_bars]
        volumes = [float(bar['volume']) for bar in recent_bars]
        
        # 한글 주석: 단순 이동평균 (0 나눗셈 방지)
        sma_short = sum(closes[-5:]) / 5
        sma_long = sum(closes[-20:]) / 20
        if sma_long == 0:
            sma_long = 1e-9
        
        # 한글 주석: 볼륨 증가 확인
        avg_volume = sum(volumes[-10:]) / 10
        current_volume = float(current_bar['volume'])
        volume_spike = current_volume > avg_volume * 1.5
        
        # 한글 주석: RSI 계산 (단순화)
        rsi = self._calculate_simple_rsi(closes)
        if rsi is None:
            return None
        
        current_price = float(current_bar['close'])
        
        # 한글 주석: 전략별 신호 생성
        if sma_short > sma_long and 30 < rsi < 70:
            # Breakout 전략
            base_score = self._calculate_strategy_score('breakout', rsi, volume_spike, current_price, closes)
            feat = {'sma_short': sma_short, 'sma_long': sma_long, 'rsi': rsi, 'volume_spike': float(volume_spike), 'price': current_price}
            score = self._compute_score('breakout', base_score, feat)
            confidence = min(0.9, (sma_short - sma_long) / sma_long + 0.5)
            
            return StrategySignal(
                symbol=current_bar.get('symbol', 'BTCUSDT'),
                timestamp=current_bar['timestamp'],
                strategy_type='breakout',
                entry_price=current_price,
                stop_loss=current_price * 0.98,
                take_profit=current_price * 1.04,
                score=score,
                confidence=confidence,
                risk_level='medium',
                features=feat
            )
            
        elif sma_short < sma_long and rsi > 55:
            # Trend 전략 (하락 추세)
            base_score = self._calculate_strategy_score('trend', rsi, volume_spike, current_price, closes)
            feat = {'sma_short': sma_short, 'sma_long': sma_long, 'rsi': rsi, 'volume_spike': float(volume_spike), 'price': current_price}
            score = self._compute_score('trend', base_score, feat)
            confidence = min(0.85, (sma_long - sma_short) / sma_long + 0.4)
            
            return StrategySignal(
                symbol=current_bar.get('symbol', 'BTCUSDT'),
                timestamp=current_bar['timestamp'],
                strategy_type='trend',
                entry_price=current_price,
                stop_loss=current_price * 1.02,
                take_profit=current_price * 0.96,
                score=score,
                confidence=confidence,
                risk_level='medium',
                features=feat
            )
            
        elif rsi is not None and (rsi > 80 or rsi < 20):
            # Counter Trend 전략
            base_score = self._calculate_strategy_score('counter_trend', rsi, volume_spike, current_price, closes)
            feat = {'sma_short': sma_short, 'sma_long': sma_long, 'rsi': rsi, 'volume_spike': float(volume_spike), 'price': current_price, 'direction': 1.0 if (rsi < 20) else -1.0}
            score = self._compute_score('counter_trend', base_score, feat)
            confidence = 0.6 + abs(50 - rsi) / 50 * 0.3
            
            direction = 'sell' if rsi > 80 else 'buy'
            risk_level = 'high' if abs(50 - rsi) > 25 else 'medium'
            
            return StrategySignal(
                symbol=current_bar.get('symbol', 'BTCUSDT'),
                timestamp=current_bar['timestamp'],
                strategy_type='counter_trend',
                entry_price=current_price,
                stop_loss=current_price * (1.03 if direction == 'buy' else 0.97),
                take_profit=current_price * (0.97 if direction == 'buy' else 1.03),
                score=score,
                confidence=confidence,
                risk_level=risk_level,
                features=feat
            )
        
        return None
    
    def _calculate_simple_rsi(self, prices: List[float], period: int = 14) -> Optional[float]:
        """단순 RSI 계산"""
        if len(prices) < period + 1:
            return None
            
        deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        gains = [d if d > 0 else 0 for d in deltas[-period:]]
        losses = [-d if d < 0 else 0 for d in deltas[-period:]]
        
        avg_gain = sum(gains) / period if gains else 0.01
        avg_loss = sum(losses) / period if losses else 0.01
        
        # 한글 주석: 0 나눗셈 방지
        if avg_loss == 0:
            avg_loss = 1e-9
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def _calculate_strategy_score(self, strategy_type: str, rsi: float, volume_spike: bool, 
                                 current_price: float, price_history: List[float]) -> float:
        """전략별 점수 계산"""
        base_score = 70.0
        
        # 한글 주석: 전략별 기본 점수 조정
        strategy_multipliers = {
            'breakout': 1.0,
            'trend': 0.95,
            'counter_trend': 0.85
        }
        
        score = base_score * strategy_multipliers.get(strategy_type, 1.0)
        
        # 한글 주석: RSI 기반 점수 조정
        if 40 <= rsi <= 60:
            score += 10  # 중립 구간
        elif 30 <= rsi <= 70:
            score += 5   # 양호한 구간
        else:
            score -= 5   # 극단적 구간
            
        # 한글 주석: 볼륨 스파이크 보너스
        if volume_spike:
            score += 8
            
        # 한글 주석: 가격 변동성 고려
        if len(price_history) >= 10:
            volatility = self._calculate_volatility(price_history[-10:])
            if volatility > 0.03:  # 3% 이상 변동성
                score -= 5
            elif volatility < 0.01:  # 1% 미만 변동성
                score += 5
        
        # 한글 주석: 점수 범위 제한
        return max(50.0, min(100.0, score))
    
    def _calculate_volatility(self, prices: List[float]) -> float:
        """가격 변동성 계산"""
        if len(prices) < 2:
            return 0.0
            
        returns = [(prices[i] - prices[i-1]) / prices[i-1] for i in range(1, len(prices))]
        mean_return = sum(returns) / len(returns)
        variance = sum((r - mean_return) ** 2 for r in returns) / len(returns)
        
        return variance ** 0.5

    # ===== 스코어링 모드 통합 =====
    def _compute_score(self, strategy_type: str, base_score: float, feat: Dict[str, float]) -> float:
        if self.scoring_mode == 'baseline':
            return base_score
        elif self.scoring_mode == 'ml':
            ml_score = self._ml_strategy_score(strategy_type, feat)
            return ml_score
        elif self.scoring_mode == 'hybrid':
            ml_score = self._ml_strategy_score(strategy_type, feat)
            w = max(0.0, min(1.0, self.hybrid_weight))
            return (1 - w) * base_score + w * ml_score
        return base_score

    def _ml_strategy_score(self, strategy_type: str, feat: Dict[str, float]) -> float:
        """최신 ML 모델로 return_pct 예측 → 0~100 점수로 정규화 (캐싱 지원)"""
        try:
            import pandas as pd
            
            # 한글 주석: 모델 매니저 캐싱 (처음 한 번만 생성)
            if self._model_manager is None:
                from ml_pipeline.model_trainer import ModelManager
                self._model_manager = ModelManager()
            
            # 한글 주석: 모델 캐싱 (5분마다 새로고침)
            if self._cached_model is None:
                self._cached_model = self._model_manager.load_latest_model()
                if self._cached_model is None:
                    return 50.0
            
            row = {
                'entry_timing_score': (feat.get('sma_short',0)-feat.get('sma_long',0)) / max(feat.get('sma_long',1e-9),1e-9) * 100 + (50 - abs(50 - feat.get('rsi',50))),
                'exit_timing_score': 70.0,
                'risk_mgmt_score': 80.0,
                'pnl_ratio': 0.01,
                'volatility': abs(feat.get('sma_short',0)-feat.get('sma_long',0))/max(feat.get('sma_long',1e-9),1e-9)*10,
                'market_condition': 1,
                'volume_profile': 1.0 + feat.get('volume_spike',0)*0.5,
            }
            X = pd.DataFrame([row])
            ret = float(self._cached_model.predict(X)[0])
            return max(0.0, min(100.0, 50 + ret))
        except Exception:
            return 50.0

class NautilusBacktestRunner:
    """노틸러스 백테스팅 실행기"""
    
    def __init__(self, config_path: str = "config/ml_config.yaml", initial_capital: float = 10000.0):
        """
        백테스팅 러너 초기화
        
        Args:
            config_path: 설정 파일 경로
            initial_capital: 초기 자본금
        """
        import yaml
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = yaml.safe_load(f)
            
        self.strategy_filter = StrategyFilter(min_score=80.0)
        # 한글 주석: 동적 임계값 비활성화로 거래 발생률 상향
        self.strategy_filter.dynamic_threshold = False
        self.data_collector = BacktestingDataCollector()
        scoring_conf = self.config.get('scoring', {}) if isinstance(self.config, dict) else {}
        self.strategy = MLBacktestStrategy(self.strategy_filter, self.data_collector, scoring_config=scoring_conf)
        
        # 한글 주석: 동적 포지션 사이징 시스템 초기화
        self.position_sizer = DynamicPositionSizer(
            initial_capital=initial_capital,
            max_position_pct=0.20,  # 최대 20% 포지션
            mdd_threshold=0.15,     # MDD 15% 시 포지션 축소
            kelly_lookback=50       # 최근 50거래로 Kelly 계산
        )
        
    def create_sample_data(self, symbol: str = "BTCUSDT", days: int = 30,
                           start_date: Optional[datetime] = None,
                           end_date: Optional[datetime] = None,
                           timeframe: str = "1m") -> List[Dict]:
        """샘플 데이터 생성 (실제 데이터 대신 임시용)
        Args:
            symbol: 심볼
            days: 기간(일) - start/end가 없을 때만 사용
            start_date: 시작 일시
            end_date: 종료 일시
            timeframe: '1m' | '5m' | '1h'
        """
        import random

        # 타임프레임 → 분 단위 변환
        tf_to_min = {"1m": 1, "5m": 5, "1h": 60}
        step_min = tf_to_min.get(timeframe, 1)

        if start_date is None:
            start_time = datetime.now() - timedelta(days=days)
        else:
            start_time = start_date

        if end_date is None:
            end_time = datetime.now()
        else:
            end_time = end_date

        total_minutes = max(1, int((end_time - start_time).total_seconds() // 60))
        num_bars = max(1, total_minutes // step_min)

        # 과도한 메모리 사용 방지 (약식 제한)
        max_bars = 400_000
        if num_bars > max_bars:
            # 타임프레임을 자동 상향
            if timeframe == "1m":
                step_min = 5
                timeframe = "5m"
            elif timeframe == "5m":
                step_min = 60
                timeframe = "1h"
            num_bars = max(1, total_minutes // step_min)

        bars: List[Dict] = []
        base_price = 45000.0
        current_price = base_price

        for i in range(num_bars):
            # 랜덤 워크 + 완만한 트렌드
            change = random.gauss(0, 0.002)
            if (i % (int(1440/step_min))) < (int(720/step_min)):
                change += 0.0001

            current_price = max(current_price * (1 + change), 1.0)

            high = current_price * (1 + abs(random.gauss(0, 0.001)))
            low = current_price * (1 - abs(random.gauss(0, 0.001)))
            open_price = current_price * (1 + random.gauss(0, 0.0005))
            volume = random.randint(100, 10000)

            timestamp = start_time + timedelta(minutes=i * step_min)
            bars.append({
                'symbol': symbol,
                'open': open_price,
                'high': high,
                'low': low,
                'close': current_price,
                'volume': volume,
                'timestamp': timestamp
            })

        return bars
    
    def run_backtest(self, symbol: str = "BTCUSDT", days: int = 30,
                     start_date: Optional[datetime] = None,
                     end_date: Optional[datetime] = None,
                     timeframe: str = "1m") -> str:
        """
        백테스팅 실행
        
        Args:
            symbol: 거래 심볼
            days: 백테스팅 기간 (일)
            
        Returns:
            결과 파일 경로
        """
        logger.info(f"백테스팅 시작: {symbol}, {days}일간")
        
        # 한글 주석: 샘플 데이터 생성 (실제로는 외부 데이터 소스 사용)
        bars = self.create_sample_data(symbol, days,
                                       start_date=start_date,
                                       end_date=end_date,
                                       timeframe=timeframe)
        
        # 한글 주석: 전략 신호 생성
        signals = self.strategy.generate_signals(bars)
        logger.info(f"총 {len(signals)}개 신호 생성")
        
        # 한글 주석: 신호 필터링 및 거래 실행 시뮬레이션
        executed_trades = []
        rejected_signals = []
        
        for signal in signals:
            should_execute, reason = self.strategy_filter.should_execute_strategy(signal)
            
            if should_execute:
                # 한글 주석: 동적 포지션 사이징 적용
                recent_trade_data = [
                    {
                        'return_pct': trade.get('return_pct', 0),
                        'pnl': trade.get('pnl', 0)
                    } for trade in executed_trades[-50:]  # 최근 50거래
                ]
                
                position_size = self.position_sizer.get_position_size(
                    signal_confidence=signal.confidence,
                    recent_trades=recent_trade_data
                )
                
                # 한글 주석: 거래 실행 시뮬레이션 (동적 포지션 크기 적용)
                trade_result = self._simulate_trade_execution(signal, bars, position_size)
                
                # 한글 주석: 포지션 사이저 업데이트
                self.position_sizer.update_capital(trade_result['pnl'], trade_result['return_pct'])
                
                # 한글 주석: 재학습 트리거 확인
                if self.position_sizer.should_trigger_retraining():
                    logger.warning("재학습 트리거 조건 충족! 모델 재훈련을 권장합니다.")
                
                self.data_collector.record_executed_trade(signal, trade_result)
                executed_trades.append(trade_result)
                logger.debug(f"거래 실행: {signal.symbol} {signal.strategy_type} 포지션: ${position_size:.0f} PnL: {trade_result['pnl']:.2f}")
            else:
                self.data_collector.record_rejected_signal(signal, reason)
                rejected_signals.append({'signal': signal, 'reason': reason})
                
        # 한글 주석: 실행된 거래 성과를 기반으로 정책 자동 조정
        try:
            policy = self.strategy_filter.adapt_thresholds(executed_trades)
            logger.info(f"필터 정책 자동 조정: {policy}")
        except Exception as e:
            logger.warning(f"정책 자동 조정 실패: {e}")

        # 한글 주석: 결과 저장 (거래가 있을 때만)
        results_file = None
        if executed_trades:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            results_file = f"data/backtest_results/backtest_{symbol}_{timestamp}.csv"
            
            # CSV 저장 (호환성 유지)
            self.data_collector.export_training_data(results_file)
            logger.info(f"백테스트 결과 저장: {results_file} ({len(executed_trades)}건 거래)")
        else:
            logger.info(f"실행된 거래가 없어 결과 파일을 생성하지 않습니다. (신호: {len(signals)}개, 거부: {len(rejected_signals)}개)")
        
        # 한글 주석: 데이터베이스에도 저장 (고성능 조회를 위해)
        try:
            sys.path.append(str(Path(__file__).parent.parent))
            from database_manager import BacktestDatabaseManager
            
            db_manager = BacktestDatabaseManager()
            backtest_run_id = db_manager.save_backtest_results(results_file)
            logger.info(f"데이터베이스 저장 완료: 실행ID {backtest_run_id}")
        except Exception as e:
            logger.warning(f"데이터베이스 저장 실패 (CSV는 정상 저장됨): {e}")
            
        # 한글 주석: 백테스팅 요약 (동적 포지션 사이징 메트릭 포함)
        total_pnl = sum(trade['pnl'] for trade in executed_trades)
        win_rate = len([t for t in executed_trades if t['pnl'] > 0]) / len(executed_trades) if executed_trades else 0
        
        # 리스크 메트릭 가져오기
        risk_metrics = self.position_sizer.get_risk_metrics()
        
        logger.info(f"백테스팅 완료:")
        logger.info(f"  - 실행된 거래: {len(executed_trades)}건")
        logger.info(f"  - 거부된 신호: {len(rejected_signals)}건")
        logger.info(f"  - 총 PnL: ${total_pnl:.2f}")
        logger.info(f"  - 승률: {win_rate:.1%}")
        logger.info(f"  - 최종 자본: ${risk_metrics['current_capital']:.2f}")
        logger.info(f"  - 총 수익률: {risk_metrics['total_return_pct']:.2f}%")
        logger.info(f"  - 최대 MDD: {risk_metrics['max_drawdown_pct']:.2f}%")
        logger.info(f"  - 연속 손실: {risk_metrics['consecutive_losses']}회")
        
        if risk_metrics['needs_retraining']:
            logger.warning("  ⚠️  재학습 권장 조건 충족!")
        
        if results_file:
            logger.info(f"  - 결과 파일: {results_file}")
        else:
            logger.info("  - 결과 파일: 생성되지 않음 (거래 없음)")
        
        return results_file
    
    def _simulate_trade_execution(self, signal: StrategySignal, bars: List[Dict], position_size: float = 1000.0) -> Dict:
        """거래 실행 시뮬레이션"""
        # 한글 주석: 실제 백테스팅 엔진 대신 간단한 시뮬레이션
        entry_price = signal.entry_price
        stop_loss = signal.stop_loss
        take_profit = signal.take_profit
        
        # 한글 주석: 신호 이후 가격 변동 찾기
        signal_time = signal.timestamp
        future_bars = [b for b in bars if b['timestamp'] > signal_time][:60]  # 최대 1시간
        
        if not future_bars:
            # 한글 주석: 데이터 부족 시 중립적 결과
            exit_price = entry_price
            exit_time = signal_time + timedelta(minutes=30)
            pnl = 0
            exit_reason = "timeout"
        else:
            # 한글 주석: 손절/익절 시뮬레이션
            exit_price = entry_price
            exit_time = signal_time
            exit_reason = "timeout"
            
            for bar in future_bars:
                high_price = bar['high']
                low_price = bar['low']
                
                if signal.strategy_type in ['breakout', 'counter_trend']:
                    # 한글 주석: 롱 포지션
                    if high_price >= take_profit:
                        exit_price = take_profit
                        exit_time = bar['timestamp']
                        exit_reason = "profit"
                        break
                    elif low_price <= stop_loss:
                        exit_price = stop_loss
                        exit_time = bar['timestamp']
                        exit_reason = "stop_loss"
                        break
                else:
                    # 한글 주석: 숏 포지션 (trend)
                    if low_price <= take_profit:
                        exit_price = take_profit
                        exit_time = bar['timestamp']
                        exit_reason = "profit"
                        break
                    elif high_price >= stop_loss:
                        exit_price = stop_loss
                        exit_time = bar['timestamp']
                        exit_reason = "stop_loss"
                        break
                        
                exit_price = bar['close']
                exit_time = bar['timestamp']
        
        # 한글 주석: PnL 계산 (동적 포지션 크기 적용)
        if signal.strategy_type == 'trend':
            # 숏 포지션
            pnl = (entry_price - exit_price) / entry_price * position_size
        else:
            # 롱 포지션
            pnl = (exit_price - entry_price) / entry_price * position_size
            
        return_pct = ((exit_price - entry_price) / entry_price) * 100
        duration_minutes = (exit_time - signal_time).total_seconds() / 60
        
        return {
            'exit_price': exit_price,
            'exit_timestamp': exit_time,
            'pnl': pnl,
            'return_pct': return_pct,
            'duration_minutes': duration_minutes,
            'exit_reason': exit_reason
        }

def run_nautilus_backtest(
    symbol: str = "BTCUSDT",
    days: int = 30,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    timeframe: str = "1m",
) -> str:
    """노틸러스 백테스팅 실행
    Args:
        symbol: 심볼
        days: 기간(일), start/end 없을 때 사용
        start_date: 시작 일시(UTC)
        end_date: 종료 일시(UTC)
        timeframe: '1m' | '5m' | '1h'
    """
    runner = NautilusBacktestRunner()
    return runner.run_backtest(
        symbol=symbol,
        days=days,
        start_date=start_date,
        end_date=end_date,
        timeframe=timeframe,
    )

if __name__ == "__main__":
    # 한글 주석: 백테스팅 단독 실행
    logging.basicConfig(level=logging.INFO)
    result_file = run_nautilus_backtest()
    print(f"백테스팅 완료: {result_file}")

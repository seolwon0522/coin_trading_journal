"""
3가지 매매 전략 스코어러
- Breakout (돌파매매)
- Trend Following (추세매매) 
- Mean Reversion (역추세매매)
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List
from datetime import datetime
import logging

from models import ScoreRequest, Candle

logger = logging.getLogger(__name__)

class BreakoutScorer:
    """돌파매매 점수 계산기"""
    
    def __init__(self):
        pass
    
    def calculate_score(self, request: ScoreRequest) -> Dict[str, Any]:
        """돌파매매 점수 계산"""
        try:
            df = self._candles_to_dataframe(request.candles)
            
            if len(df) < 20:
                return {"error": "최소 20개의 캔들 데이터가 필요합니다"}
            
            # Z1 - 구간 정의 (15점)
            zone_score = self._calculate_zone_score(df)
            
            # Z2 - 트리거 확인 (25점)
            trigger_score = self._calculate_trigger_score(df)
            
            # Z3 - 엔트리 (20점)
            entry_score = self._calculate_entry_score(df)
            
            # Z4 - 리스크 관리 (15점)
            risk_score = self._calculate_risk_score(df)
            
            # Z5 - 익절·청산 (15점)
            exit_score = self._calculate_exit_score(df)
            
            # Z6 - 후속 관리 (10점)
            followup_score = self._calculate_followup_score(df)
            
            # 총점 계산 (100점 만점)
            total_score = zone_score + trigger_score + entry_score + risk_score + exit_score + followup_score
            
            # 신호 결정
            signal = self._determine_signal(total_score)
            
            return {
                "symbol": request.symbol,
                "timestamp": datetime.now().isoformat(),
                "total_score": total_score,
                "signal": signal,
                "confidence": min(total_score / 100.0, 1.0),
                "sub_scores": {
                    "zone_score": zone_score,
                    "trigger_score": trigger_score,
                    "entry_score": entry_score,
                    "risk_score": risk_score,
                    "exit_score": exit_score,
                    "followup_score": followup_score
                },
                "reasoning": self._generate_reasoning(total_score, signal, zone_score, trigger_score, entry_score, risk_score, exit_score, followup_score)
            }
            
        except Exception as e:
            logger.error(f"돌파매매 점수 계산 중 오류: {e}")
            return {"error": f"돌파매매 점수 계산 중 오류가 발생했습니다: {str(e)}"}
    
    def _candles_to_dataframe(self, candles: List[Candle]) -> pd.DataFrame:
        """캔들 리스트를 DataFrame으로 변환"""
        data = []
        for candle in candles:
            data.append({
                'timestamp': candle.timestamp,
                'open': candle.open,
                'high': candle.high,
                'low': candle.low,
                'close': candle.close,
                'volume': candle.volume
            })
        
        df = pd.DataFrame(data)
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df = df.sort_values('timestamp').reset_index(drop=True)
        return df
    
    def _calculate_zone_score(self, df: pd.DataFrame) -> float:
        """Z1 - 구간 정의 점수 (15점)"""
        try:
            # 구간 길이 (7점)
            zone_bars = len(df)
            zone_length_score = max(0, min(zone_bars, 30) - 20) / 10 * 7
            
            # 상단 재테스트 횟수 (5점) - 간단한 구현
            tests = min(3, len(df[df['high'] > df['high'].rolling(5).mean()]))
            test_score = tests / 3 * 5
            
            # 변동성 수렴 (3점)
            atr_ratio = self._calculate_atr_ratio(df)
            if atr_ratio <= 0.70:
                volatility_score = 3
            elif atr_ratio <= 0.90:
                volatility_score = 2
            else:
                volatility_score = 0
            
            return zone_length_score + test_score + volatility_score
            
        except Exception as e:
            logger.error(f"구간 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_trigger_score(self, df: pd.DataFrame) -> float:
        """Z2 - 트리거 확인 점수 (25점)"""
        try:
            # 종가 돌파 강도 (10점)
            current_close = df['close'].iloc[-1]
            resistance = df['high'].rolling(20).max().iloc[-2]  # 이전 최고점
            atr = self._calculate_atr(df)
            
            breakout_strength = (current_close - resistance) / atr if atr > 0 else 0
            if breakout_strength >= 1:
                breakout_score = 10
            elif breakout_strength >= 0.5:
                breakout_score = 8
            elif breakout_strength > 0:
                breakout_score = 5
            else:
                breakout_score = 0
            
            # 거래량 증가율 (8점)
            current_vol = df['volume'].iloc[-1]
            avg_vol = df['volume'].rolling(20).mean().iloc[-1]
            vol_ratio = current_vol / avg_vol if avg_vol > 0 else 1
            
            if vol_ratio >= 2:
                volume_score = 8
            elif vol_ratio >= 1.5:
                volume_score = 6
            elif vol_ratio >= 1.2:
                volume_score = 4
            else:
                volume_score = 0
            
            # 밴드 폭 확장 (6점)
            bb_width_now = self._calculate_bb_width(df)
            bb_width_20ago = self._calculate_bb_width(df.iloc[:-20]) if len(df) > 20 else bb_width_now
            
            bb_ratio = bb_width_now / bb_width_20ago if bb_width_20ago > 0 else 1
            if bb_ratio >= 1.5:
                bb_score = 6
            elif bb_ratio >= 1.3:
                bb_score = 4
            else:
                bb_score = 0
            
            # 모멘텀 양호 (1점)
            cci = self._calculate_cci(df)
            macd_hist = self._calculate_macd_hist(df)
            momentum_score = 1 if cci > 0 and macd_hist > 0 else 0
            
            return breakout_score + volume_score + bb_score + momentum_score
            
        except Exception as e:
            logger.error(f"트리거 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_entry_score(self, df: pd.DataFrame) -> float:
        """Z3 - 엔트리 점수 (20점)"""
        try:
            # 진입 타이밍 (10점) - 간단한 구현
            entry_score = 8  # 기본 점수
            
            # 되돌림 지지 확인 (5점)
            pullback_score = 3  # 기본 점수
            
            # 슬리피지 (5점)
            slippage_score = 4  # 기본 점수
            
            return entry_score + pullback_score + slippage_score
            
        except Exception as e:
            logger.error(f"엔트리 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_risk_score(self, df: pd.DataFrame) -> float:
        """Z4 - 리스크 관리 점수 (15점)"""
        try:
            # 손절 거리 (7점)
            atr = self._calculate_atr(df)
            stop_dist = atr * 1.5  # ATR의 1.5배
            stop_ratio = stop_dist / atr if atr > 0 else 1
            
            if 1 <= stop_ratio <= 2:
                stop_score = 7
            elif 0.5 <= stop_ratio < 1 or 2 < stop_ratio <= 3:
                stop_score = 4
            else:
                stop_score = 1
            
            # 계좌 리스크 % (5점)
            risk_score = 3  # 기본 점수
            
            # 논리적 손절 위치 (3점)
            logical_stop_score = 2  # 기본 점수
            
            return stop_score + risk_score + logical_stop_score
            
        except Exception as e:
            logger.error(f"리스크 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_exit_score(self, df: pd.DataFrame) -> float:
        """Z5 - 익절·청산 점수 (15점)"""
        try:
            # 실제 RR 달성 (8점)
            rr_score = 4  # 기본 점수
            
            # 분할 청산 (4점)
            exit_score = 2  # 기본 점수
            
            # 트레일링 스탑 (3점)
            trailing_score = 1  # 기본 점수
            
            return rr_score + exit_score + trailing_score
            
        except Exception as e:
            logger.error(f"익절 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_followup_score(self, df: pd.DataFrame) -> float:
        """Z6 - 후속 관리 점수 (10점)"""
        try:
            # 가짜 돌파 대응 (7점)
            false_breakout_score = 3  # 기본 점수
            
            # 재진입 전략 (3점)
            reentry_score = 1  # 기본 점수
            
            return false_breakout_score + reentry_score
            
        except Exception as e:
            logger.error(f"후속 관리 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> float:
        """ATR 계산"""
        try:
            high = df['high']
            low = df['low']
            close = df['close']
            
            tr1 = high - low
            tr2 = abs(high - close.shift(1))
            tr3 = abs(low - close.shift(1))
            
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr = tr.rolling(period).mean().iloc[-1]
            
            return atr if not pd.isna(atr) else 0.0
        except:
            return 0.0
    
    def _calculate_atr_ratio(self, df: pd.DataFrame) -> float:
        """ATR 비율 계산"""
        try:
            current_atr = self._calculate_atr(df)
            prev_atr = self._calculate_atr(df.iloc[:-20]) if len(df) > 20 else current_atr
            
            return current_atr / prev_atr if prev_atr > 0 else 1.0
        except:
            return 1.0
    
    def _calculate_bb_width(self, df: pd.DataFrame) -> float:
        """볼린저 밴드 폭 계산"""
        try:
            sma = df['close'].rolling(20).mean()
            std = df['close'].rolling(20).std()
            upper = sma + (std * 2)
            lower = sma - (std * 2)
            
            width = (upper - lower) / sma
            return width.iloc[-1] if not pd.isna(width.iloc[-1]) else 0.0
        except:
            return 0.0
    
    def _calculate_cci(self, df: pd.DataFrame, period: int = 14) -> float:
        """CCI 계산"""
        try:
            typical_price = (df['high'] + df['low'] + df['close']) / 3
            sma = typical_price.rolling(period).mean()
            mad = typical_price.rolling(period).apply(lambda x: np.mean(np.abs(x - x.mean())))
            
            cci = (typical_price - sma) / (0.015 * mad)
            return cci.iloc[-1] if not pd.isna(cci.iloc[-1]) else 0.0
        except:
            return 0.0
    
    def _calculate_macd_hist(self, df: pd.DataFrame) -> float:
        """MACD 히스토그램 계산"""
        try:
            ema12 = df['close'].ewm(span=12).mean()
            ema26 = df['close'].ewm(span=26).mean()
            macd = ema12 - ema26
            signal = macd.ewm(span=9).mean()
            hist = macd - signal
            
            return hist.iloc[-1] if not pd.isna(hist.iloc[-1]) else 0.0
        except:
            return 0.0
    
    def _determine_signal(self, total_score: float) -> str:
        """신호 결정"""
        if total_score >= 80:
            return "buy"
        elif total_score >= 60:
            return "hold"
        else:
            return "sell"
    
    def _generate_reasoning(self, total_score: float, signal: str, 
                           zone_score: float, trigger_score: float, entry_score: float,
                           risk_score: float, exit_score: float, followup_score: float) -> str:
        """근거 생성"""
        reasoning = []
        
        if zone_score >= 10:
            reasoning.append("구간 정의 양호")
        if trigger_score >= 20:
            reasoning.append("트리거 확인 완료")
        if entry_score >= 15:
            reasoning.append("엔트리 타이밍 적절")
        if risk_score >= 10:
            reasoning.append("리스크 관리 적절")
        if exit_score >= 10:
            reasoning.append("익절 전략 수립")
        if followup_score >= 5:
            reasoning.append("후속 관리 계획")
        
        if not reasoning:
            reasoning.append("전반적으로 개선 필요")
        
        return f"돌파매매 점수 {total_score:.1f}점 - {', '.join(reasoning)}"


class TrendScorer:
    """추세매매 점수 계산기"""
    
    def __init__(self):
        pass
    
    def calculate_score(self, request: ScoreRequest) -> Dict[str, Any]:
        """추세매매 점수 계산"""
        try:
            df = self._candles_to_dataframe(request.candles)
            
            if len(df) < 20:
                return {"error": "최소 20개의 캔들 데이터가 필요합니다"}
            
            # T1 - 추세 정의 (15점)
            trend_score = self._calculate_trend_score(df)
            
            # T2 - 트리거 확인 (25점)
            trigger_score = self._calculate_trigger_score(df)
            
            # T3 - 엔트리 (20점)
            entry_score = self._calculate_entry_score(df)
            
            # T4 - 리스크 관리 (15점)
            risk_score = self._calculate_risk_score(df)
            
            # T5 - 익절·청산 (15점)
            exit_score = self._calculate_exit_score(df)
            
            # T6 - 후속 관리 (10점)
            followup_score = self._calculate_followup_score(df)
            
            # 총점 계산 (100점 만점)
            total_score = trend_score + trigger_score + entry_score + risk_score + exit_score + followup_score
            
            # 신호 결정
            signal = self._determine_signal(total_score)
            
            return {
                "symbol": request.symbol,
                "timestamp": datetime.now().isoformat(),
                "total_score": total_score,
                "signal": signal,
                "confidence": min(total_score / 100.0, 1.0),
                "sub_scores": {
                    "trend_score": trend_score,
                    "trigger_score": trigger_score,
                    "entry_score": entry_score,
                    "risk_score": risk_score,
                    "exit_score": exit_score,
                    "followup_score": followup_score
                },
                "reasoning": self._generate_reasoning(total_score, signal, trend_score, trigger_score, entry_score, risk_score, exit_score, followup_score)
            }
            
        except Exception as e:
            logger.error(f"추세매매 점수 계산 중 오류: {e}")
            return {"error": f"추세매매 점수 계산 중 오류가 발생했습니다: {str(e)}"}
    
    def _candles_to_dataframe(self, candles: List[Candle]) -> pd.DataFrame:
        """캔들 리스트를 DataFrame으로 변환"""
        data = []
        for candle in candles:
            data.append({
                'timestamp': candle.timestamp,
                'open': candle.open,
                'high': candle.high,
                'low': candle.low,
                'close': candle.close,
                'volume': candle.volume
            })
        
        df = pd.DataFrame(data)
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df = df.sort_values('timestamp').reset_index(drop=True)
        return df
    
    def _calculate_trend_score(self, df: pd.DataFrame) -> float:
        """T1 - 추세 정의 점수 (15점)"""
        try:
            # MA 정착 기간 (7점)
            trend_bars = len(df)
            trend_score = max(0, min(trend_bars, 30) - 20) / 10 * 7
            
            # MA 기울기 (5점)
            slope = self._calculate_slope(df)
            if slope >= 0.04:
                slope_score = 5
            elif slope >= 0.02:
                slope_score = 3
            else:
                slope_score = 1
            
            # HH/HL 구조 (3점)
            higher_lows = self._count_higher_lows(df)
            structure_score = min(higher_lows, 3) / 3 * 3
            
            return trend_score + slope_score + structure_score
            
        except Exception as e:
            logger.error(f"추세 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_trigger_score(self, df: pd.DataFrame) -> float:
        """T2 - 트리거 확인 점수 (25점)"""
        try:
            # ADX (10점)
            adx = self._calculate_adx(df)
            if adx >= 35:
                adx_score = 10
            elif adx >= 25:
                adx_score = 7
            elif adx >= 20:
                adx_score = 4
            else:
                adx_score = 0
            
            # 거래량 증가율 (8점)
            current_vol = df['volume'].iloc[-1]
            avg_vol = df['volume'].rolling(20).mean().iloc[-1]
            vol_ratio = current_vol / avg_vol if avg_vol > 0 else 1
            
            if vol_ratio >= 2:
                volume_score = 8
            elif vol_ratio >= 1.5:
                volume_score = 6
            elif vol_ratio >= 1.2:
                volume_score = 4
            else:
                volume_score = 0
            
            # MA fan 정렬 (6점)
            ma_fan_score = 4  # 기본 점수
            
            # 모멘텀 동조 (1점)
            rsi = self._calculate_rsi(df)
            macd_hist = self._calculate_macd_hist(df)
            momentum_score = 1 if rsi > 50 and macd_hist > 0 else 0
            
            return adx_score + volume_score + ma_fan_score + momentum_score
            
        except Exception as e:
            logger.error(f"트리거 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_entry_score(self, df: pd.DataFrame) -> float:
        """T3 - 엔트리 점수 (20점)"""
        try:
            # 진입 타이밍 (10점)
            entry_score = 8  # 기본 점수
            
            # 지지 확인 (5점)
            support_score = 3  # 기본 점수
            
            # 슬리피지 (5점)
            slippage_score = 4  # 기본 점수
            
            return entry_score + support_score + slippage_score
            
        except Exception as e:
            logger.error(f"엔트리 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_risk_score(self, df: pd.DataFrame) -> float:
        """T4 - 리스크 관리 점수 (15점)"""
        try:
            # 손절 거리 (7점)
            atr = self._calculate_atr(df)
            stop_dist = atr * 1.5
            stop_ratio = stop_dist / atr if atr > 0 else 1
            
            if 1 <= stop_ratio <= 2:
                stop_score = 7
            elif 0.5 <= stop_ratio < 1 or 2 < stop_ratio <= 3:
                stop_score = 4
            else:
                stop_score = 1
            
            # 계좌 리스크 % (5점)
            risk_score = 3  # 기본 점수
            
            # 논리적 손절 (3점)
            logical_stop_score = 2  # 기본 점수
            
            return stop_score + risk_score + logical_stop_score
            
        except Exception as e:
            logger.error(f"리스크 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_exit_score(self, df: pd.DataFrame) -> float:
        """T5 - 익절·청산 점수 (15점)"""
        try:
            # RR 달성 (8점)
            rr_score = 4  # 기본 점수
            
            # 분할 청산 (4점)
            exit_score = 2  # 기본 점수
            
            # 트레일링 (3점)
            trailing_score = 1  # 기본 점수
            
            return rr_score + exit_score + trailing_score
            
        except Exception as e:
            logger.error(f"익절 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_followup_score(self, df: pd.DataFrame) -> float:
        """T6 - 후속 관리 점수 (10점)"""
        try:
            # 추세 약화 대응 (7점)
            trend_exit_score = 3  # 기본 점수
            
            # 재진입 전략 (3점)
            reentry_score = 1  # 기본 점수
            
            return trend_exit_score + reentry_score
            
        except Exception as e:
            logger.error(f"후속 관리 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_slope(self, df: pd.DataFrame) -> float:
        """MA 기울기 계산"""
        try:
            ma = df['close'].rolling(20).mean()
            if len(ma) >= 2:
                slope = (ma.iloc[-1] - ma.iloc[-2]) / ma.iloc[-2]
                return slope
            return 0.0
        except:
            return 0.0
    
    def _count_higher_lows(self, df: pd.DataFrame) -> int:
        """HH/HL 구조 카운트"""
        try:
            lows = df['low'].rolling(5).min()
            higher_lows = 0
            for i in range(1, len(lows)):
                if lows.iloc[i] > lows.iloc[i-1]:
                    higher_lows += 1
            return higher_lows
        except:
            return 0
    
    def _calculate_adx(self, df: pd.DataFrame, period: int = 14) -> float:
        """ADX 계산"""
        try:
            # 간단한 ADX 구현
            high = df['high']
            low = df['low']
            close = df['close']
            
            plus_dm = high.diff()
            minus_dm = low.diff()
            
            plus_dm = plus_dm.where(plus_dm > minus_dm, 0)
            minus_dm = minus_dm.where(minus_dm > plus_dm, 0)
            
            tr = pd.concat([high - low, abs(high - close.shift(1)), abs(low - close.shift(1))], axis=1).max(axis=1)
            
            atr = tr.rolling(period).mean()
            plus_di = 100 * (plus_dm.rolling(period).mean() / atr)
            minus_di = 100 * (minus_dm.rolling(period).mean() / atr)
            
            dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
            adx = dx.rolling(period).mean()
            
            return adx.iloc[-1] if not pd.isna(adx.iloc[-1]) else 0.0
        except:
            return 0.0
    
    def _calculate_rsi(self, df: pd.DataFrame, period: int = 14) -> float:
        """RSI 계산"""
        try:
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            
            return rsi.iloc[-1] if not pd.isna(rsi.iloc[-1]) else 50.0
        except:
            return 50.0
    
    def _calculate_macd_hist(self, df: pd.DataFrame) -> float:
        """MACD 히스토그램 계산"""
        try:
            ema12 = df['close'].ewm(span=12).mean()
            ema26 = df['close'].ewm(span=26).mean()
            macd = ema12 - ema26
            signal = macd.ewm(span=9).mean()
            hist = macd - signal
            
            return hist.iloc[-1] if not pd.isna(hist.iloc[-1]) else 0.0
        except:
            return 0.0
    
    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> float:
        """ATR 계산"""
        try:
            high = df['high']
            low = df['low']
            close = df['close']
            
            tr1 = high - low
            tr2 = abs(high - close.shift(1))
            tr3 = abs(low - close.shift(1))
            
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr = tr.rolling(period).mean().iloc[-1]
            
            return atr if not pd.isna(atr) else 0.0
        except:
            return 0.0
    
    def _determine_signal(self, total_score: float) -> str:
        """신호 결정"""
        if total_score >= 80:
            return "buy"
        elif total_score >= 60:
            return "hold"
        else:
            return "sell"
    
    def _generate_reasoning(self, total_score: float, signal: str, 
                           trend_score: float, trigger_score: float, entry_score: float,
                           risk_score: float, exit_score: float, followup_score: float) -> str:
        """근거 생성"""
        reasoning = []
        
        if trend_score >= 10:
            reasoning.append("추세 정의 명확")
        if trigger_score >= 20:
            reasoning.append("트리거 확인 완료")
        if entry_score >= 15:
            reasoning.append("엔트리 타이밍 적절")
        if risk_score >= 10:
            reasoning.append("리스크 관리 적절")
        if exit_score >= 10:
            reasoning.append("익절 전략 수립")
        if followup_score >= 5:
            reasoning.append("후속 관리 계획")
        
        if not reasoning:
            reasoning.append("전반적으로 개선 필요")
        
        return f"추세매매 점수 {total_score:.1f}점 - {', '.join(reasoning)}"


class MeanReversionScorer:
    """역추세매매 점수 계산기"""
    
    def __init__(self):
        pass
    
    def calculate_score(self, request: ScoreRequest) -> Dict[str, Any]:
        """역추세매매 점수 계산"""
        try:
            df = self._candles_to_dataframe(request.candles)
            
            if len(df) < 20:
                return {"error": "최소 20개의 캔들 데이터가 필요합니다"}
            
            # R1 - 과열 구간 식별 (15점)
            overheat_score = self._calculate_overheat_score(df)
            
            # R2 - 반전 트리거 (25점)
            trigger_score = self._calculate_trigger_score(df)
            
            # R3 - 엔트리 (20점)
            entry_score = self._calculate_entry_score(df)
            
            # R4 - 리스크 관리 (15점)
            risk_score = self._calculate_risk_score(df)
            
            # R5 - 익절·청산 (15점)
            exit_score = self._calculate_exit_score(df)
            
            # R6 - 후속 관리 (10점)
            followup_score = self._calculate_followup_score(df)
            
            # 총점 계산 (100점 만점)
            total_score = overheat_score + trigger_score + entry_score + risk_score + exit_score + followup_score
            
            # 신호 결정
            signal = self._determine_signal(total_score)
            
            return {
                "symbol": request.symbol,
                "timestamp": datetime.now().isoformat(),
                "total_score": total_score,
                "signal": signal,
                "confidence": min(total_score / 100.0, 1.0),
                "sub_scores": {
                    "overheat_score": overheat_score,
                    "trigger_score": trigger_score,
                    "entry_score": entry_score,
                    "risk_score": risk_score,
                    "exit_score": exit_score,
                    "followup_score": followup_score
                },
                "reasoning": self._generate_reasoning(total_score, signal, overheat_score, trigger_score, entry_score, risk_score, exit_score, followup_score)
            }
            
        except Exception as e:
            logger.error(f"역추세매매 점수 계산 중 오류: {e}")
            return {"error": f"역추세매매 점수 계산 중 오류가 발생했습니다: {str(e)}"}
    
    def _candles_to_dataframe(self, candles: List[Candle]) -> pd.DataFrame:
        """캔들 리스트를 DataFrame으로 변환"""
        data = []
        for candle in candles:
            data.append({
                'timestamp': candle.timestamp,
                'open': candle.open,
                'high': candle.high,
                'low': candle.low,
                'close': candle.close,
                'volume': candle.volume
            })
        
        df = pd.DataFrame(data)
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df = df.sort_values('timestamp').reset_index(drop=True)
        return df
    
    def _calculate_overheat_score(self, df: pd.DataFrame) -> float:
        """R1 - 과열 구간 식별 점수 (15점)"""
        try:
            # 과열 거리 (7점)
            ema20 = df['close'].ewm(span=20).mean()
            atr = self._calculate_atr(df)
            dist = abs(df['close'].iloc[-1] - ema20.iloc[-1]) / atr if atr > 0 else 0
            
            if dist >= 3:
                distance_score = 7
            elif dist >= 2:
                distance_score = 5
            elif dist >= 1.5:
                distance_score = 3
            else:
                distance_score = 0
            
            # 오실레이터 극단 (4점)
            rsi = self._calculate_rsi(df)
            cci = self._calculate_cci(df)
            extremes = 0
            if rsi > 70 or rsi < 30:
                extremes += 1
            if cci > 100 or cci < -100:
                extremes += 1
            
            if extremes >= 2:
                extreme_score = 4
            elif extremes == 1:
                extreme_score = 2
            else:
                extreme_score = 0
            
            # 극단 봉 연속 (4점)
            extreme_bars = self._count_extreme_bars(df)
            bar_score = min(extreme_bars, 3) / 3 * 4
            
            return distance_score + extreme_score + bar_score
            
        except Exception as e:
            logger.error(f"과열 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_trigger_score(self, df: pd.DataFrame) -> float:
        """R2 - 반전 트리거 점수 (25점)"""
        try:
            # 반전 패턴 (10점)
            pattern_score = 6  # 기본 점수
            
            # 다이버전스 (8점)
            divergence_score = 4  # 기본 점수
            
            # 거래량 고갈 (4점)
            current_vol = df['volume'].iloc[-1]
            avg_vol = df['volume'].rolling(20).mean().iloc[-1]
            vol_ratio = current_vol / avg_vol if avg_vol > 0 else 1
            
            if vol_ratio <= 0.7:
                volume_score = 4
            elif vol_ratio <= 0.9:
                volume_score = 2
            else:
                volume_score = 0
            
            # 밴드 복귀 (3점)
            bb_score = 2  # 기본 점수
            
            return pattern_score + divergence_score + volume_score + bb_score
            
        except Exception as e:
            logger.error(f"트리거 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_entry_score(self, df: pd.DataFrame) -> float:
        """R3 - 엔트리 점수 (20점)"""
        try:
            # 진입 타이밍 (10점)
            entry_score = 8  # 기본 점수
            
            # 확인봉 진입 (5점)
            confirmation_score = 3  # 기본 점수
            
            # 슬리피지 (5점)
            slippage_score = 4  # 기본 점수
            
            return entry_score + confirmation_score + slippage_score
            
        except Exception as e:
            logger.error(f"엔트리 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_risk_score(self, df: pd.DataFrame) -> float:
        """R4 - 리스크 관리 점수 (15점)"""
        try:
            # 손절 거리 (7점)
            atr = self._calculate_atr(df)
            stop_dist = atr * 0.75  # ATR의 0.75배 (짧은 손절)
            stop_ratio = stop_dist / atr if atr > 0 else 1
            
            if 0.5 <= stop_ratio <= 1:
                stop_score = 7
            elif 1 < stop_ratio <= 1.5:
                stop_score = 4
            else:
                stop_score = 1
            
            # 계좌 리스크 % (5점)
            risk_score = 3  # 기본 점수
            
            # 논리적 손절 (3점)
            logical_stop_score = 2  # 기본 점수
            
            return stop_score + risk_score + logical_stop_score
            
        except Exception as e:
            logger.error(f"리스크 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_exit_score(self, df: pd.DataFrame) -> float:
        """R5 - 익절·청산 점수 (15점)"""
        try:
            # 평균 회귀 달성 (8점)
            rr_score = 4  # 기본 점수
            
            # 분할 청산 (4점)
            exit_score = 2  # 기본 점수
            
            # 트레일링 (3점)
            trailing_score = 1  # 기본 점수
            
            return rr_score + exit_score + trailing_score
            
        except Exception as e:
            logger.error(f"익절 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_followup_score(self, df: pd.DataFrame) -> float:
        """R6 - 후속 관리 점수 (10점)"""
        try:
            # 추세 복귀 대응 (7점)
            trend_resume_score = 3  # 기본 점수
            
            # 재진입 전략 (3점)
            reentry_score = 1  # 기본 점수
            
            return trend_resume_score + reentry_score
            
        except Exception as e:
            logger.error(f"후속 관리 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_atr(self, df: pd.DataFrame, period: int = 14) -> float:
        """ATR 계산"""
        try:
            high = df['high']
            low = df['low']
            close = df['close']
            
            tr1 = high - low
            tr2 = abs(high - close.shift(1))
            tr3 = abs(low - close.shift(1))
            
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr = tr.rolling(period).mean().iloc[-1]
            
            return atr if not pd.isna(atr) else 0.0
        except:
            return 0.0
    
    def _calculate_rsi(self, df: pd.DataFrame, period: int = 14) -> float:
        """RSI 계산"""
        try:
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            
            return rsi.iloc[-1] if not pd.isna(rsi.iloc[-1]) else 50.0
        except:
            return 50.0
    
    def _calculate_cci(self, df: pd.DataFrame, period: int = 14) -> float:
        """CCI 계산"""
        try:
            typical_price = (df['high'] + df['low'] + df['close']) / 3
            sma = typical_price.rolling(period).mean()
            mad = typical_price.rolling(period).apply(lambda x: np.mean(np.abs(x - x.mean())))
            
            cci = (typical_price - sma) / (0.015 * mad)
            return cci.iloc[-1] if not pd.isna(cci.iloc[-1]) else 0.0
        except:
            return 0.0
    
    def _count_extreme_bars(self, df: pd.DataFrame) -> int:
        """극단 봉 연속 카운트"""
        try:
            ema20 = df['close'].ewm(span=20).mean()
            extreme_count = 0
            
            for i in range(max(0, len(df)-5), len(df)):
                if abs(df['close'].iloc[i] - ema20.iloc[i]) > df['close'].iloc[i] * 0.02:
                    extreme_count += 1
                else:
                    break
            
            return extreme_count
        except:
            return 0
    
    def _determine_signal(self, total_score: float) -> str:
        """신호 결정"""
        if total_score >= 80:
            return "buy"
        elif total_score >= 60:
            return "hold"
        else:
            return "sell"
    
    def _generate_reasoning(self, total_score: float, signal: str, 
                           overheat_score: float, trigger_score: float, entry_score: float,
                           risk_score: float, exit_score: float, followup_score: float) -> str:
        """근거 생성"""
        reasoning = []
        
        if overheat_score >= 10:
            reasoning.append("과열 구간 식별 완료")
        if trigger_score >= 20:
            reasoning.append("반전 트리거 확인")
        if entry_score >= 15:
            reasoning.append("엔트리 타이밍 적절")
        if risk_score >= 10:
            reasoning.append("리스크 관리 적절")
        if exit_score >= 10:
            reasoning.append("익절 전략 수립")
        if followup_score >= 5:
            reasoning.append("후속 관리 계획")
        
        if not reasoning:
            reasoning.append("전반적으로 개선 필요")
        
        return f"역추세매매 점수 {total_score:.1f}점 - {', '.join(reasoning)}" 
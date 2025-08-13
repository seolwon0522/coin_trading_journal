"""
돌파매매 점수 계산 모듈
pandas와 numpy를 사용하여 기술적 지표를 계산하고 점수를 산출
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from models import ScoreRequest, Candle

logger = logging.getLogger(__name__)

class BreakoutScorer:
    """
    돌파매매 점수 계산 클래스
    다양한 기술적 지표를 종합하여 매매 점수를 계산
    """
    
    def __init__(self):
        """초기화"""
        pass
    
    def breakout_score(self, request: ScoreRequest) -> Dict[str, Any]:
        """
        돌파매매 점수 계산 메인 함수
        
        Args:
            request: 점수 계산 요청 데이터
            
        Returns:
            점수 계산 결과 딕셔너리
        """
        try:
            # 캔들 데이터를 DataFrame으로 변환
            df = self._candles_to_dataframe(request.candles)
            
            if len(df) < 20:
                return {"error": "최소 20개의 캔들 데이터가 필요합니다"}
            
            # 각 점수 계산
            bollinger_score = self._calculate_bollinger_score(df)
            rsi_score = self._calculate_rsi_score(df)
            volume_score = self._calculate_volume_score(df)
            ma_score = self._calculate_ma_score(df)
            momentum_score = self._calculate_momentum_score(df)
            breakout_score = self._calculate_breakout_level_score(df)
            volatility_score = self._calculate_volatility_score(df)
            trend_score = self._calculate_trend_score(df)
            
            # 가중 평균으로 총점 계산
            weights = {
                'bollinger': 0.2,
                'rsi': 0.15,
                'volume': 0.15,
                'ma': 0.15,
                'momentum': 0.1,
                'breakout': 0.1,
                'volatility': 0.1,
                'trend': 0.05
            }
            
            total_score = (
                bollinger_score * weights['bollinger'] +
                rsi_score * weights['rsi'] +
                volume_score * weights['volume'] +
                ma_score * weights['ma'] +
                momentum_score * weights['momentum'] +
                breakout_score * weights['breakout'] +
                volatility_score * weights['volatility'] +
                trend_score * weights['trend']
            )
            
            # 신호 결정
            signal = self._determine_signal(total_score)
            
            # 신뢰도 계산
            confidence = self._calculate_confidence(total_score, df)
            
            # 지표값 추출
            indicators = {}
            if request.include_indicators:
                indicators = self._extract_indicators(df)
            
            # 근거 생성
            reasoning = self._generate_reasoning(
                total_score, signal, bollinger_score, rsi_score, 
                volume_score, ma_score, momentum_score, breakout_score,
                volatility_score, trend_score
            )
            
            return {
                "symbol": request.symbol,
                "timestamp": datetime.now().isoformat(),
                "total_score": round(total_score, 4),
                "signal": signal,
                "confidence": round(confidence, 4),
                "indicators": indicators,
                "reasoning": reasoning,
                "sub_scores": {
                    "bollinger_score": round(bollinger_score, 4),
                    "rsi_score": round(rsi_score, 4),
                    "volume_score": round(volume_score, 4),
                    "ma_score": round(ma_score, 4),
                    "momentum_score": round(momentum_score, 4),
                    "breakout_score": round(breakout_score, 4),
                    "volatility_score": round(volatility_score, 4),
                    "trend_score": round(trend_score, 4)
                }
            }
            
        except Exception as e:
            logger.error(f"점수 계산 중 오류 발생: {e}")
            return {"error": f"점수 계산 중 오류가 발생했습니다: {str(e)}"}
    
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
    
    def _calculate_bollinger_score(self, df: pd.DataFrame) -> float:
        """
        볼린저 밴드 점수 계산
        가격이 상단 밴드를 돌파하는 정도를 평가
        """
        try:
            # 이동평균 계산
            df['sma_20'] = df['close'].rolling(window=20).mean()
            df['std_20'] = df['close'].rolling(window=20).std()
            
            # 볼린저 밴드 계산
            df['bb_upper'] = df['sma_20'] + (df['std_20'] * 2)
            df['bb_middle'] = df['sma_20']
            df['bb_lower'] = df['sma_20'] - (df['std_20'] * 2)
            
            # 최신 데이터
            current_close = df['close'].iloc[-1]
            current_upper = df['bb_upper'].iloc[-1]
            current_middle = df['bb_middle'].iloc[-1]
            
            # 돌파 정도 계산 (0~1)
            if current_close > current_upper:
                # 상단 밴드 돌파
                breakout_ratio = (current_close - current_upper) / current_upper
                score = min(breakout_ratio * 10, 1.0)  # 최대 1.0
            else:
                # 상단 밴드 근처 (0.8~1.0)
                proximity = 1 - abs(current_close - current_upper) / current_upper
                score = max(proximity * 0.8, 0.0)
            
            # 볼린저 밴드 위치 보정
            bb_position = (current_close - current_middle) / (current_upper - current_middle)
            if bb_position > 0.8:
                score *= 1.2  # 상단 밴드 근처일 때 가중치
            elif bb_position < 0.2:
                score *= 0.5  # 하단 밴드 근처일 때 감점
            
            return min(max(score, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"볼린저 밴드 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_rsi_score(self, df: pd.DataFrame) -> float:
        """
        RSI 점수 계산
        RSI가 적정 범위에 있는지 평가
        """
        try:
            # RSI 계산
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['rsi'] = 100 - (100 / (1 + rs))
            
            current_rsi = df['rsi'].iloc[-1]
            
            # RSI 점수 계산 (30~70이 적정)
            if 30 <= current_rsi <= 70:
                # 적정 범위
                score = 1.0 - abs(current_rsi - 50) / 50
            elif current_rsi > 70:
                # 과매수 구간
                score = max(0.0, 1.0 - (current_rsi - 70) / 30)
            else:
                # 과매도 구간
                score = max(0.0, 1.0 - (30 - current_rsi) / 30)
            
            return min(max(score, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"RSI 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_volume_score(self, df: pd.DataFrame) -> float:
        """
        거래량 점수 계산
        거래량이 증가하는지 평가
        """
        try:
            # 거래량 이동평균
            df['volume_sma_20'] = df['volume'].rolling(window=20).mean()
            
            current_volume = df['volume'].iloc[-1]
            avg_volume = df['volume_sma_20'].iloc[-1]
            
            # 거래량 비율
            volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0
            
            # 거래량 점수 계산
            if volume_ratio > 1.5:
                score = min((volume_ratio - 1.5) * 2, 1.0)  # 높은 거래량
            elif volume_ratio > 1.0:
                score = (volume_ratio - 1.0) * 2  # 평균 이상
            else:
                score = volume_ratio  # 평균 이하
            
            return min(max(score, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"거래량 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_ma_score(self, df: pd.DataFrame) -> float:
        """
        이동평균 점수 계산
        단기/장기 이동평균의 관계를 평가
        """
        try:
            # 이동평균 계산
            df['sma_5'] = df['close'].rolling(window=5).mean()
            df['sma_20'] = df['close'].rolling(window=20).mean()
            
            current_close = df['close'].iloc[-1]
            current_sma_5 = df['sma_5'].iloc[-1]
            current_sma_20 = df['sma_20'].iloc[-1]
            
            # 이동평균 관계 평가
            if current_sma_5 > current_sma_20:
                # 골든크로스 상황
                ma_ratio = current_sma_5 / current_sma_20
                score = min((ma_ratio - 1.0) * 10, 1.0)
            else:
                # 데드크로스 상황
                ma_ratio = current_sma_20 / current_sma_5
                score = max(0.0, 1.0 - (ma_ratio - 1.0) * 5)
            
            # 현재가와 단기 이동평균의 관계
            price_ma_ratio = current_close / current_sma_5
            if price_ma_ratio > 1.0:
                score *= 1.2  # 현재가가 단기 이동평균 위
            else:
                score *= 0.8  # 현재가가 단기 이동평균 아래
            
            return min(max(score, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"이동평균 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_momentum_score(self, df: pd.DataFrame) -> float:
        """
        모멘텀 점수 계산
        가격 모멘텀을 평가
        """
        try:
            # 모멘텀 계산 (5일 수익률)
            df['momentum_5'] = df['close'].pct_change(periods=5)
            
            current_momentum = df['momentum_5'].iloc[-1]
            
            # 모멘텀 점수 계산
            if current_momentum > 0.05:  # 5% 이상 상승
                score = min(current_momentum * 10, 1.0)
            elif current_momentum > 0:
                score = current_momentum * 10
            else:
                score = max(0.0, 1.0 + current_momentum * 10)
            
            return min(max(score, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"모멘텀 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_breakout_level_score(self, df: pd.DataFrame) -> float:
        """
        돌파 레벨 점수 계산
        최근 고점 돌파 여부를 평가
        """
        try:
            # 최근 20일 고점
            recent_high = df['high'].rolling(window=20).max().iloc[-1]
            current_close = df['close'].iloc[-1]
            
            # 돌파 정도 계산
            if current_close > recent_high:
                breakout_ratio = (current_close - recent_high) / recent_high
                score = min(breakout_ratio * 20, 1.0)
            else:
                # 고점 근처
                proximity = 1 - abs(current_close - recent_high) / recent_high
                score = max(proximity * 0.5, 0.0)
            
            return min(max(score, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"돌파 레벨 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_volatility_score(self, df: pd.DataFrame) -> float:
        """
        변동성 점수 계산
        적정한 변동성인지 평가
        """
        try:
            # 변동성 계산 (ATR 기반)
            df['tr'] = np.maximum(
                df['high'] - df['low'],
                np.maximum(
                    abs(df['high'] - df['close'].shift(1)),
                    abs(df['low'] - df['close'].shift(1))
                )
            )
            df['atr'] = df['tr'].rolling(window=14).mean()
            
            current_atr = df['atr'].iloc[-1]
            current_close = df['close'].iloc[-1]
            
            # 변동성 비율
            volatility_ratio = current_atr / current_close
            
            # 적정 변동성 범위 (1~3%)
            if 0.01 <= volatility_ratio <= 0.03:
                score = 1.0
            elif volatility_ratio < 0.01:
                score = volatility_ratio * 100
            else:
                score = max(0.0, 1.0 - (volatility_ratio - 0.03) * 20)
            
            return min(max(score, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"변동성 점수 계산 오류: {e}")
            return 0.0
    
    def _calculate_trend_score(self, df: pd.DataFrame) -> float:
        """
        트렌드 점수 계산
        상승 트렌드인지 평가
        """
        try:
            # 트렌드 계산 (20일 선형 회귀)
            x = np.arange(len(df))
            y = df['close'].values
            
            if len(x) >= 20:
                recent_x = x[-20:]
                recent_y = y[-20:]
                
                # 선형 회귀
                slope = np.polyfit(recent_x, recent_y, 1)[0]
                
                # 기울기 점수
                if slope > 0:
                    score = min(slope / 100, 1.0)
                else:
                    score = max(0.0, 1.0 + slope / 100)
            else:
                score = 0.5  # 데이터 부족
            
            return min(max(score, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"트렌드 점수 계산 오류: {e}")
            return 0.0
    
    def _determine_signal(self, total_score: float) -> str:
        """총점을 바탕으로 매매 신호 결정"""
        if total_score > 0.7:
            return "buy"
        elif total_score < -0.3:
            return "sell"
        else:
            return "hold"
    
    def _calculate_confidence(self, total_score: float, df: pd.DataFrame) -> float:
        """신뢰도 계산"""
        # 점수의 절댓값이 클수록 신뢰도 높음
        base_confidence = min(abs(total_score), 1.0)
        
        # 데이터 품질에 따른 보정
        data_quality = min(len(df) / 100, 1.0)  # 데이터가 많을수록 신뢰도 높음
        
        return min(base_confidence * data_quality, 1.0)
    
    def _extract_indicators(self, df: pd.DataFrame) -> Dict[str, float]:
        """지표값 추출"""
        try:
            indicators = {}
            
            # 최신 값들 추출
            if 'close' in df.columns and len(df) > 0:
                indicators['close'] = float(df['close'].iloc[-1])
            
            if 'rsi' in df.columns and len(df) > 0:
                indicators['rsi'] = float(df['rsi'].iloc[-1])
            
            if 'bb_upper' in df.columns and len(df) > 0:
                indicators['bb_upper'] = float(df['bb_upper'].iloc[-1])
            
            if 'bb_lower' in df.columns and len(df) > 0:
                indicators['bb_lower'] = float(df['bb_lower'].iloc[-1])
            
            if 'sma_20' in df.columns and len(df) > 0:
                indicators['sma_20'] = float(df['sma_20'].iloc[-1])
            
            if 'volume_sma_20' in df.columns and len(df) > 0:
                indicators['volume_ratio'] = float(df['volume'].iloc[-1] / df['volume_sma_20'].iloc[-1])
            
            return indicators
            
        except Exception as e:
            logger.error(f"지표값 추출 오류: {e}")
            return {}
    
    def _generate_reasoning(self, total_score: float, signal: str, 
                           bollinger_score: float, rsi_score: float,
                           volume_score: float, ma_score: float,
                           momentum_score: float, breakout_score: float,
                           volatility_score: float, trend_score: float) -> str:
        """점수 계산 근거 생성"""
        reasons = []
        
        if bollinger_score > 0.7:
            reasons.append("볼린저 밴드 상단 돌파")
        elif bollinger_score < 0.3:
            reasons.append("볼린저 밴드 하단 근처")
        
        if rsi_score > 0.7:
            reasons.append("RSI 적정 수준")
        elif rsi_score < 0.3:
            reasons.append("RSI 과매수/과매도")
        
        if volume_score > 0.7:
            reasons.append("거래량 증가")
        elif volume_score < 0.3:
            reasons.append("거래량 부족")
        
        if ma_score > 0.7:
            reasons.append("이동평균 상승")
        elif ma_score < 0.3:
            reasons.append("이동평균 하락")
        
        if momentum_score > 0.7:
            reasons.append("강한 상승 모멘텀")
        elif momentum_score < 0.3:
            reasons.append("약한 모멘텀")
        
        if breakout_score > 0.7:
            reasons.append("고점 돌파")
        
        if volatility_score > 0.7:
            reasons.append("적정 변동성")
        elif volatility_score < 0.3:
            reasons.append("과도한 변동성")
        
        if trend_score > 0.7:
            reasons.append("상승 트렌드")
        elif trend_score < 0.3:
            reasons.append("하락 트렌드")
        
        if not reasons:
            reasons.append("중립적인 시장 상황")
        
        return ", ".join(reasons) 
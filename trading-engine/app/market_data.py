# 시장 데이터 및 기술적 분석 기능
import requests
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class MarketDataProvider:
    """시장 데이터 제공자 - 바이낸스 API 연동"""
    
    def __init__(self):
        self.base_url = "https://api.binance.com/api/v3"
        
    def get_klines(
        self, 
        symbol: str, 
        interval: str = "1h", 
        limit: int = 100,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Dict]:
        """캔들스틱 데이터 조회"""
        try:
            url = f"{self.base_url}/klines"
            params = {
                "symbol": symbol.upper(),
                "interval": interval,
                "limit": min(limit, 1000)  # 바이낸스 최대 1000개
            }
            
            if start_time:
                params["startTime"] = int(start_time.timestamp() * 1000)
            if end_time:
                params["endTime"] = int(end_time.timestamp() * 1000)
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            raw_data = response.json()
            
            # 캔들스틱 데이터 파싱
            klines = []
            for item in raw_data:
                kline = {
                    "open_time": datetime.fromtimestamp(item[0] / 1000),
                    "open": float(item[1]),
                    "high": float(item[2]),
                    "low": float(item[3]),
                    "close": float(item[4]),
                    "volume": float(item[5]),
                    "close_time": datetime.fromtimestamp(item[6] / 1000),
                    "quote_volume": float(item[7]),
                    "trade_count": int(item[8]),
                    "taker_buy_base_volume": float(item[9]),
                    "taker_buy_quote_volume": float(item[10])
                }
                klines.append(kline)
            
            logger.info(f"캔들스틱 데이터 조회 성공: {symbol} {interval} {len(klines)}개")
            return klines
            
        except Exception as e:
            logger.error(f"캔들스틱 데이터 조회 실패: {symbol} - {e}")
            return []
    
    def get_24hr_ticker(self, symbol: str) -> Dict:
        """24시간 가격 변동 정보"""
        try:
            url = f"{self.base_url}/ticker/24hr"
            params = {"symbol": symbol.upper()}
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return {
                "symbol": data["symbol"],
                "price": float(data["lastPrice"]),
                "price_change": float(data["priceChange"]),
                "price_change_percent": float(data["priceChangePercent"]),
                "high": float(data["highPrice"]),
                "low": float(data["lowPrice"]),
                "volume": float(data["volume"]),
                "quote_volume": float(data["quoteVolume"]),
                "open": float(data["openPrice"]),
                "prev_close": float(data["prevClosePrice"]),
                "weighted_avg": float(data["weightedAvgPrice"]),
                "trade_count": int(data["count"])
            }
            
        except Exception as e:
            logger.error(f"24시간 티커 조회 실패: {symbol} - {e}")
            return {}

class TechnicalAnalyzer:
    """기술적 분석 도구"""
    
    @staticmethod
    def calculate_sma(prices: List[float], period: int) -> float:
        """단순 이동평균 계산"""
        if len(prices) < period:
            return 0.0
        return sum(prices[-period:]) / period
    
    @staticmethod
    def calculate_atr(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> float:
        """ATR (Average True Range) 계산"""
        if len(highs) < period + 1 or len(lows) < period + 1 or len(closes) < period + 1:
            return 0.0
        
        true_ranges = []
        for i in range(1, len(highs)):
            tr1 = highs[i] - lows[i]
            tr2 = abs(highs[i] - closes[i-1])
            tr3 = abs(lows[i] - closes[i-1])
            true_ranges.append(max(tr1, tr2, tr3))
        
        if len(true_ranges) < period:
            return 0.0
            
        return sum(true_ranges[-period:]) / period
    
    @staticmethod
    def calculate_bollinger_bands(prices: List[float], period: int = 20, std_dev: float = 2) -> Tuple[float, float, float]:
        """볼린저 밴드 계산 (상단, 중단, 하단)"""
        if len(prices) < period:
            return 0.0, 0.0, 0.0
        
        recent_prices = prices[-period:]
        sma = sum(recent_prices) / period
        
        variance = sum((price - sma) ** 2 for price in recent_prices) / period
        std = variance ** 0.5
        
        upper_band = sma + (std_dev * std)
        lower_band = sma - (std_dev * std)
        
        return upper_band, sma, lower_band
    
    @staticmethod
    def calculate_volume_ratio(current_volume: float, avg_volume: float) -> float:
        """거래량 비율 계산"""
        if avg_volume <= 0:
            return 1.0
        return current_volume / avg_volume
    
    @staticmethod
    def find_range_high(highs: List[float], period: int = 20) -> float:
        """최근 N일간 고점 찾기"""
        if len(highs) < period:
            return max(highs) if highs else 0.0
        return max(highs[-period:])
    
    @staticmethod
    def calculate_wick_ratio(open_price: float, high: float, low: float, close: float) -> Tuple[float, float]:
        """캔들의 윗꼬리, 아랫꼬리 비율 계산"""
        body_size = abs(close - open_price)
        if body_size == 0:
            return 0.0, 0.0
        
        if close > open_price:  # 양봉
            upper_wick = high - close
            lower_wick = open_price - low
        else:  # 음봉
            upper_wick = high - open_price  
            lower_wick = close - low
        
        upper_wick_ratio = upper_wick / body_size if body_size > 0 else 0
        lower_wick_ratio = lower_wick / body_size if body_size > 0 else 0
        
        return upper_wick_ratio, lower_wick_ratio

class MarketDataService:
    """통합 시장 데이터 서비스"""
    
    def __init__(self):
        self.provider = MarketDataProvider()
        self.analyzer = TechnicalAnalyzer()
    
    def get_trade_indicators(
        self, 
        symbol: str, 
        entry_time: datetime,
        entry_price: float,
        interval: str = "1h"
    ) -> Dict:
        """거래 시점의 기술적 지표 계산"""
        try:
            # 충분한 데이터를 위해 100개 캔들 조회
            end_time = entry_time + timedelta(hours=1)  # 진입 시간 이후 1시간
            start_time = entry_time - timedelta(days=7)  # 7일 전부터
            
            klines = self.provider.get_klines(
                symbol=symbol,
                interval=interval,
                limit=200,
                start_time=start_time,
                end_time=end_time
            )
            
            if not klines:
                return {}
            
            # 데이터 추출
            closes = [k["close"] for k in klines]
            highs = [k["high"] for k in klines]
            lows = [k["low"] for k in klines]
            volumes = [k["volume"] for k in klines]
            
            # 진입 시점 캔들 찾기
            entry_candle = None
            for i, kline in enumerate(klines):
                if kline["open_time"] <= entry_time <= kline["close_time"]:
                    entry_candle = kline
                    break
            
            if not entry_candle:
                # 가장 가까운 캔들 사용
                entry_candle = min(klines, key=lambda k: abs((k["open_time"] - entry_time).total_seconds()))
            
            # 기술적 지표 계산
            indicators = {
                "volume": entry_candle["volume"],
                "averageVolume": self.analyzer.calculate_sma(volumes, 20),
                "prevRangeHigh": self.analyzer.find_range_high(highs[:-1], 20),  # 현재 캔들 제외
                "atr": self.analyzer.calculate_atr(highs, lows, closes, 14),
                "htfTrend": self._determine_trend(closes, 50),  # 50 SMA 기준
                "htfTrend2": self._determine_trend(closes, 200),  # 200 SMA 기준
            }
            
            # 볼린저 밴드
            upper, middle, lower = self.analyzer.calculate_bollinger_bands(closes, 20)
            indicators["bollingerUpper"] = upper
            indicators["bollingerMiddle"] = middle
            indicators["bollingerLower"] = lower
            indicators["bollingerPercent"] = (entry_price - lower) / (upper - lower) if upper > lower else 0.5
            
            # 캔들 품질 (윗꼬리, 아랫꼬리 비율)
            upper_wick, lower_wick = self.analyzer.calculate_wick_ratio(
                entry_candle["open"], entry_candle["high"], 
                entry_candle["low"], entry_candle["close"]
            )
            indicators["entryCandleUpperWickRatio"] = upper_wick
            indicators["entryCandleLowerWickRatio"] = lower_wick
            
            logger.info(f"기술적 지표 계산 완료: {symbol} @ {entry_time}")
            return indicators
            
        except Exception as e:
            logger.error(f"기술적 지표 계산 실패: {symbol} @ {entry_time} - {e}")
            return {}
    
    def _determine_trend(self, closes: List[float], period: int) -> str:
        """트렌드 방향 결정 (이동평균 기반)"""
        if len(closes) < period + 5:
            return "sideways"
        
        sma_current = self.analyzer.calculate_sma(closes, period)
        sma_prev = self.analyzer.calculate_sma(closes[:-5], period)  # 5캔들 전
        
        current_price = closes[-1]
        
        if current_price > sma_current and sma_current > sma_prev:
            return "up"
        elif current_price < sma_current and sma_current < sma_prev:
            return "down"
        else:
            return "sideways"
    
    def validate_symbol(self, symbol: str) -> bool:
        """심볼 유효성 검사"""
        try:
            ticker = self.provider.get_24hr_ticker(symbol)
            return bool(ticker)
        except:
            return False

# 전역 인스턴스
market_service = MarketDataService()
# 고급 기술적 지표 구현
from typing import List, Tuple
import math

class AdvancedIndicators:
    """고급 기술적 지표 계산 클래스"""
    
    @staticmethod
    def calculate_rsi(prices: List[float], period: int = 14) -> float:
        """RSI (Relative Strength Index) 계산"""
        if len(prices) < period + 1:
            return 50.0
        
        gains = []
        losses = []
        
        for i in range(1, len(prices)):
            change = prices[i] - prices[i-1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        if len(gains) < period:
            return 50.0
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    @staticmethod
    def calculate_macd(prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[float, float, float]:
        """MACD (Moving Average Convergence Divergence) 계산"""
        if len(prices) < slow:
            return 0.0, 0.0, 0.0
        
        # EMA 계산 함수
        def ema(data: List[float], period: int) -> List[float]:
            if len(data) < period:
                return data
            
            multiplier = 2 / (period + 1)
            ema_values = [data[0]]  # 첫 값은 그대로
            
            for i in range(1, len(data)):
                ema_val = (data[i] * multiplier) + (ema_values[-1] * (1 - multiplier))
                ema_values.append(ema_val)
            
            return ema_values
        
        # 빠른선과 느린선 EMA 계산
        fast_ema = ema(prices, fast)
        slow_ema = ema(prices, slow)
        
        if len(fast_ema) < slow or len(slow_ema) < slow:
            return 0.0, 0.0, 0.0
        
        # MACD 라인 계산
        macd_line = fast_ema[-1] - slow_ema[-1]
        
        # 시그널 라인은 MACD의 EMA (간단화)
        signal_line = macd_line * 0.8  # 근사치
        
        # 히스토그램
        histogram = macd_line - signal_line
        
        return macd_line, signal_line, histogram
    
    @staticmethod
    def calculate_stochastic(highs: List[float], lows: List[float], closes: List[float], k_period: int = 14) -> Tuple[float, float]:
        """스토캐스틱 오실레이터 계산"""
        if len(highs) < k_period or len(lows) < k_period or len(closes) < k_period:
            return 50.0, 50.0
        
        # %K 계산
        recent_highs = highs[-k_period:]
        recent_lows = lows[-k_period:]
        current_close = closes[-1]
        
        highest_high = max(recent_highs)
        lowest_low = min(recent_lows)
        
        if highest_high == lowest_low:
            k_percent = 50.0
        else:
            k_percent = ((current_close - lowest_low) / (highest_high - lowest_low)) * 100
        
        # %D는 %K의 3일 이동평균 (간단화)
        d_percent = k_percent * 0.8  # 근사치
        
        return k_percent, d_percent
    
    @staticmethod
    def detect_support_resistance(highs: List[float], lows: List[float], period: int = 20) -> Tuple[List[float], List[float]]:
        """지지선과 저항선 감지"""
        if len(highs) < period or len(lows) < period:
            return [], []
        
        supports = []
        resistances = []
        
        # 간단한 지지/저항 감지 (극값 기반)
        for i in range(period//2, len(lows) - period//2):
            # 지지선 감지 (저점)
            is_support = True
            current_low = lows[i]
            
            for j in range(i - period//2, i + period//2 + 1):
                if j != i and lows[j] < current_low:
                    is_support = False
                    break
            
            if is_support:
                supports.append(current_low)
        
        for i in range(period//2, len(highs) - period//2):
            # 저항선 감지 (고점)
            is_resistance = True
            current_high = highs[i]
            
            for j in range(i - period//2, i + period//2 + 1):
                if j != i and highs[j] > current_high:
                    is_resistance = False
                    break
            
            if is_resistance:
                resistances.append(current_high)
        
        return supports, resistances
    
    @staticmethod
    def detect_trendline(highs: List[float], lows: List[float], prices: List[float]) -> float:
        """간단한 트렌드라인 감지"""
        if len(prices) < 20:
            return 0.0
        
        # 최근 20개 데이터로 간단한 선형회귀
        n = min(20, len(prices))
        recent_prices = prices[-n:]
        
        x_sum = sum(range(n))
        y_sum = sum(recent_prices)
        xy_sum = sum(i * recent_prices[i] for i in range(n))
        x2_sum = sum(i * i for i in range(n))
        
        # 기울기 계산
        slope = (n * xy_sum - x_sum * y_sum) / (n * x2_sum - x_sum * x_sum) if (n * x2_sum - x_sum * x_sum) != 0 else 0
        
        # 절편 계산
        intercept = (y_sum - slope * x_sum) / n
        
        # 현재 시점의 트렌드라인 값
        trendline_value = slope * (n - 1) + intercept
        
        return trendline_value
    
    @staticmethod
    def calculate_fibonacci_levels(high: float, low: float) -> Dict[str, float]:
        """피보나치 되돌림 레벨 계산"""
        diff = high - low
        
        return {
            "0%": high,
            "23.6%": high - (diff * 0.236),
            "38.2%": high - (diff * 0.382),
            "50%": high - (diff * 0.5),
            "61.8%": high - (diff * 0.618),
            "78.6%": high - (diff * 0.786),
            "100%": low
        }
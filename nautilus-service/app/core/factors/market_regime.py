"""
Market Regime Detection Module

시장 상황을 실시간으로 분류하여 전략 가중치를 자동 조정하는 모듈.

Regimes:
- TRENDING_UP: 상승 추세 (Strong upward momentum)
- TRENDING_DOWN: 하락 추세 (Strong downward momentum)
- RANGING: 횡보장 (Mean-reverting, low trend strength)
- HIGH_VOLATILITY: 고변동성 (Large price swings, uncertainty)
- BREAKOUT: 돌파 (Price breaking key levels with volume)

Methodology:
- ADX (Average Directional Index): Trend strength
- ATR (Average True Range): Volatility measurement
- Hurst Exponent: Mean-reversion tendency
- Volume Profile: Market participation
- Price Position: Relative to moving averages
"""

from enum import Enum
from typing import Dict, Optional, Tuple
from dataclasses import dataclass
import numpy as np
import pandas as pd
from datetime import datetime


class MarketRegime(Enum):
    """시장 상황 분류"""
    TRENDING_UP = "trending_up"
    TRENDING_DOWN = "trending_down"
    RANGING = "ranging"
    HIGH_VOLATILITY = "high_volatility"
    BREAKOUT = "breakout"


@dataclass
class RegimeMetrics:
    """시장 상황 메트릭"""
    regime: MarketRegime
    confidence: float  # 0.0 ~ 1.0
    trend_strength: float  # ADX value
    volatility: float  # ATR normalized
    mean_reversion: float  # Hurst exponent
    volume_strength: float  # Relative volume
    timestamp: datetime

    # Additional metrics
    adx: float
    atr: float
    hurst: float
    price_position: float  # Position relative to SMA (0=bottom, 1=top)

    def to_dict(self) -> Dict:
        """딕셔너리로 변환"""
        return {
            'regime': self.regime.value,
            'confidence': round(self.confidence, 4),
            'trend_strength': round(self.trend_strength, 4),
            'volatility': round(self.volatility, 4),
            'mean_reversion': round(self.mean_reversion, 4),
            'volume_strength': round(self.volume_strength, 4),
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'adx': round(self.adx, 4),
            'atr': round(self.atr, 4),
            'hurst': round(self.hurst, 4),
            'price_position': round(self.price_position, 4),
        }


class MarketRegimeDetector:
    """
    전문가급 시장 상황 감지기

    Uses multiple technical indicators to classify market regime:
    1. ADX (Average Directional Index) - Trend strength
    2. ATR (Average True Range) - Volatility
    3. Hurst Exponent - Mean reversion tendency
    4. Volume Profile - Market participation
    5. Moving Average Position - Price trend direction
    """

    def __init__(
        self,
        adx_period: int = 14,
        atr_period: int = 14,
        hurst_period: int = 100,
        sma_fast: int = 20,
        sma_slow: int = 50,
        # Regime thresholds (ADJUSTED for crypto volatility)
        trending_adx_threshold: float = 20.0,  # Lowered from 25.0
        ranging_adx_threshold: float = 15.0,   # Lowered from 20.0
        high_vol_threshold: float = 1.3,       # Lowered from 1.5 (crypto is volatile)
        breakout_volume_threshold: float = 1.5,  # Lowered from 2.0
        # Adaptive thresholds for different timeframes
        use_adaptive_thresholds: bool = True,  # Auto-adjust for daily data
    ):
        """
        Parameters:
            adx_period: ADX 계산 기간
            atr_period: ATR 계산 기간
            hurst_period: Hurst exponent 계산 기간
            sma_fast: 빠른 이동평균 기간
            sma_slow: 느린 이동평균 기간
            trending_adx_threshold: 추세장 판단 ADX 임계값
            ranging_adx_threshold: 횡보장 판단 ADX 임계값
            high_vol_threshold: 고변동성 판단 ATR 배수
            breakout_volume_threshold: 돌파 판단 거래량 배수
        """
        self.adx_period = adx_period
        self.atr_period = atr_period
        self.hurst_period = hurst_period
        self.sma_fast = sma_fast
        self.sma_slow = sma_slow

        self.trending_adx_threshold = trending_adx_threshold
        self.ranging_adx_threshold = ranging_adx_threshold
        self.high_vol_threshold = high_vol_threshold
        self.breakout_volume_threshold = breakout_volume_threshold
        self.use_adaptive_thresholds = use_adaptive_thresholds

    def detect(self, bars: pd.DataFrame) -> RegimeMetrics:
        """
        현재 시장 상황을 감지

        Parameters:
            bars: OHLCV DataFrame (timestamp index)
                Required columns: open, high, low, close, volume

        Returns:
            RegimeMetrics object with detected regime and metrics
        """
        if len(bars) < max(self.hurst_period, self.sma_slow):
            raise ValueError(
                f"Insufficient data: need at least {max(self.hurst_period, self.sma_slow)} bars, "
                f"got {len(bars)}"
            )

        # Calculate indicators
        adx = self._calculate_adx(bars)
        atr = self._calculate_atr(bars)
        atr_normalized = self._normalize_atr(bars, atr)
        hurst = self._calculate_hurst_exponent(bars)
        volume_strength = self._calculate_volume_strength(bars)
        price_position = self._calculate_price_position(bars)
        trend_direction = self._calculate_trend_direction(bars)

        # Detect regime based on indicators
        regime, confidence = self._classify_regime(
            adx=adx,
            atr_normalized=atr_normalized,
            hurst=hurst,
            volume_strength=volume_strength,
            price_position=price_position,
            trend_direction=trend_direction,
        )

        # Create metrics object
        metrics = RegimeMetrics(
            regime=regime,
            confidence=confidence,
            trend_strength=adx / 100.0,  # Normalize to 0-1
            volatility=atr_normalized,
            mean_reversion=hurst,
            volume_strength=volume_strength,
            timestamp=bars.index[-1] if hasattr(bars.index[-1], 'to_pydatetime') else datetime.now(),
            adx=adx,
            atr=atr,
            hurst=hurst,
            price_position=price_position,
        )

        return metrics

    def _calculate_adx(self, bars: pd.DataFrame) -> float:
        """
        Calculate Average Directional Index (ADX)

        ADX measures trend strength (0-100):
        - 0-20: Weak or no trend (ranging)
        - 20-40: Moderate trend
        - 40+: Strong trend
        """
        high = bars['high'].values
        low = bars['low'].values
        close = bars['close'].values

        # True Range
        tr1 = high - low
        tr2 = np.abs(high - np.roll(close, 1))
        tr3 = np.abs(low - np.roll(close, 1))
        tr = np.maximum(tr1, np.maximum(tr2, tr3))

        # Directional Movement
        up_move = high - np.roll(high, 1)
        down_move = np.roll(low, 1) - low

        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0)

        # Smoothed indicators
        atr = self._wilder_smooth(tr, self.adx_period)
        plus_di = 100 * self._wilder_smooth(plus_dm, self.adx_period) / atr
        minus_di = 100 * self._wilder_smooth(minus_dm, self.adx_period) / atr

        # DX and ADX
        dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di + 1e-10)
        adx = self._wilder_smooth(dx, self.adx_period)

        return float(adx[-1])

    def _calculate_atr(self, bars: pd.DataFrame) -> float:
        """
        Calculate Average True Range (ATR)

        ATR measures volatility in absolute price terms
        """
        high = bars['high'].values
        low = bars['low'].values
        close = bars['close'].values

        tr1 = high - low
        tr2 = np.abs(high - np.roll(close, 1))
        tr3 = np.abs(low - np.roll(close, 1))
        tr = np.maximum(tr1, np.maximum(tr2, tr3))

        atr = self._wilder_smooth(tr, self.atr_period)

        return float(atr[-1])

    def _normalize_atr(self, bars: pd.DataFrame, current_atr: float) -> float:
        """
        Normalize ATR relative to historical average

        Returns:
            Normalized ATR (1.0 = average, >1.5 = high volatility)
        """
        high = bars['high'].values
        low = bars['low'].values
        close = bars['close'].values

        tr1 = high - low
        tr2 = np.abs(high - np.roll(close, 1))
        tr3 = np.abs(low - np.roll(close, 1))
        tr = np.maximum(tr1, np.maximum(tr2, tr3))

        atr_values = self._wilder_smooth(tr, self.atr_period)
        avg_atr = np.mean(atr_values[-50:])  # 50-period average

        normalized = current_atr / (avg_atr + 1e-10)

        return float(normalized)

    def _calculate_hurst_exponent(self, bars: pd.DataFrame) -> float:
        """
        Calculate Hurst Exponent

        Hurst exponent indicates:
        - H < 0.5: Mean-reverting (good for ranging strategies)
        - H = 0.5: Random walk
        - H > 0.5: Trending (good for trend-following)
        """
        prices = bars['close'].values[-self.hurst_period:]

        if len(prices) < self.hurst_period:
            return 0.5  # Default to random walk

        # Log returns
        log_returns = np.log(prices[1:] / prices[:-1])

        # Calculate R/S statistic for different lags
        lags = range(2, min(20, len(log_returns) // 2))
        rs_values = []

        for lag in lags:
            # Split into subseries
            n_subseries = len(log_returns) // lag

            if n_subseries < 2:
                continue

            rs_lag = []
            for i in range(n_subseries):
                subseries = log_returns[i*lag:(i+1)*lag]

                if len(subseries) < 2:
                    continue

                mean_subseries = np.mean(subseries)
                cumdev = np.cumsum(subseries - mean_subseries)

                R = np.max(cumdev) - np.min(cumdev)  # Range
                S = np.std(subseries, ddof=1)  # Standard deviation

                if S > 0:
                    rs_lag.append(R / S)

            if rs_lag:
                rs_values.append(np.mean(rs_lag))

        if len(rs_values) < 2:
            return 0.5

        # Hurst exponent is the slope of log(R/S) vs log(lag)
        log_rs = np.log(rs_values)
        log_lags = np.log(list(lags)[:len(rs_values)])

        hurst = np.polyfit(log_lags, log_rs, 1)[0]

        # Clamp to reasonable range
        hurst = max(0.0, min(1.0, hurst))

        return float(hurst)

    def _calculate_volume_strength(self, bars: pd.DataFrame) -> float:
        """
        Calculate relative volume strength

        Returns:
            Volume multiplier relative to average (1.0 = average)
        """
        current_volume = bars['volume'].iloc[-1]
        avg_volume = bars['volume'].iloc[-20:].mean()  # 20-period average

        volume_strength = current_volume / (avg_volume + 1e-10)

        return float(volume_strength)

    def _calculate_price_position(self, bars: pd.DataFrame) -> float:
        """
        Calculate price position relative to moving averages

        Returns:
            Position: -1.0 (below all MAs) to +1.0 (above all MAs)
        """
        close = bars['close'].iloc[-1]
        sma_fast = bars['close'].iloc[-self.sma_fast:].mean()
        sma_slow = bars['close'].iloc[-self.sma_slow:].mean()

        # Calculate position relative to each MA
        pos_fast = (close - sma_fast) / (sma_fast + 1e-10)
        pos_slow = (close - sma_slow) / (sma_slow + 1e-10)

        # Average position (weighted toward fast MA)
        position = (pos_fast * 0.6 + pos_slow * 0.4)

        # Normalize to -1 to +1 range
        position = np.tanh(position * 10)  # Tanh squashes to [-1, 1]

        return float(position)

    def _calculate_trend_direction(self, bars: pd.DataFrame) -> float:
        """
        Calculate trend direction

        Returns:
            Direction: -1.0 (downtrend) to +1.0 (uptrend)
        """
        sma_fast = bars['close'].iloc[-self.sma_fast:].mean()
        sma_slow = bars['close'].iloc[-self.sma_slow:].mean()

        direction = (sma_fast - sma_slow) / (sma_slow + 1e-10)

        # Normalize to -1 to +1
        direction = np.tanh(direction * 10)

        return float(direction)

    def _classify_regime(
        self,
        adx: float,
        atr_normalized: float,
        hurst: float,
        volume_strength: float,
        price_position: float,
        trend_direction: float,
    ) -> Tuple[MarketRegime, float]:
        """
        Classify market regime based on indicators

        Returns:
            (regime, confidence)
        """
        # Use adaptive thresholds for daily data (lower ADX threshold)
        trending_threshold = self.trending_adx_threshold
        ranging_threshold = self.ranging_adx_threshold

        if self.use_adaptive_thresholds and adx < 25:  # Likely daily data
            # Lower thresholds by 20% for daily data
            trending_threshold *= 0.8  # 20 -> 16
            ranging_threshold *= 0.8   # 15 -> 12

        # Initialize regime scores
        scores = {
            MarketRegime.TRENDING_UP: 0.0,
            MarketRegime.TRENDING_DOWN: 0.0,
            MarketRegime.RANGING: 0.0,
            MarketRegime.HIGH_VOLATILITY: 0.0,
            MarketRegime.BREAKOUT: 0.0,
        }

        # === HIGH_VOLATILITY detection ===
        if atr_normalized > self.high_vol_threshold:
            scores[MarketRegime.HIGH_VOLATILITY] += 0.5
            if atr_normalized > self.high_vol_threshold * 1.5:
                scores[MarketRegime.HIGH_VOLATILITY] += 0.3

        # === BREAKOUT detection ===
        if volume_strength > self.breakout_volume_threshold:
            scores[MarketRegime.BREAKOUT] += 0.4
            if adx > self.trending_adx_threshold and abs(price_position) > 0.5:
                scores[MarketRegime.BREAKOUT] += 0.3

        # === TRENDING detection (IMPROVED sensitivity with adaptive thresholds) ===
        if adx > trending_threshold:
            trend_score = min(1.0, (adx - trending_threshold) / 25.0)  # Adjusted scale

            if trend_direction > 0.15:  # Uptrend (lowered from 0.2)
                scores[MarketRegime.TRENDING_UP] += 0.4 + trend_score * 0.4
                if hurst > 0.48:  # Persistent trend (lowered from 0.50)
                    scores[MarketRegime.TRENDING_UP] += 0.2
                # Additional boost for strong price position
                if price_position > 0.2:
                    scores[MarketRegime.TRENDING_UP] += 0.1
            elif trend_direction < -0.15:  # Downtrend (lowered from -0.2)
                scores[MarketRegime.TRENDING_DOWN] += 0.4 + trend_score * 0.4
                if hurst > 0.48:
                    scores[MarketRegime.TRENDING_DOWN] += 0.2
                if price_position < -0.2:
                    scores[MarketRegime.TRENDING_DOWN] += 0.1

        # Even if ADX is moderate, strong directional price movement should indicate trend
        if adx > ranging_threshold:
            if abs(trend_direction) > 0.3 or abs(price_position) > 0.25:
                if trend_direction > 0:
                    scores[MarketRegime.TRENDING_UP] += 0.15
                else:
                    scores[MarketRegime.TRENDING_DOWN] += 0.15

        # === RANGING detection ===
        if adx < ranging_threshold:
            scores[MarketRegime.RANGING] += 0.5
            if hurst < 0.45:  # Mean-reverting
                scores[MarketRegime.RANGING] += 0.3
            if abs(price_position) < 0.3:  # Price near center
                scores[MarketRegime.RANGING] += 0.2

        # Find regime with highest score
        regime = max(scores, key=scores.get)
        confidence = min(1.0, scores[regime])

        return regime, confidence

    @staticmethod
    def _wilder_smooth(data: np.ndarray, period: int) -> np.ndarray:
        """
        Wilder's smoothing (used in ADX calculation)

        Similar to EMA but with different smoothing factor
        """
        alpha = 1.0 / period
        smoothed = np.zeros_like(data)
        smoothed[0] = data[0]

        for i in range(1, len(data)):
            smoothed[i] = alpha * data[i] + (1 - alpha) * smoothed[i-1]

        return smoothed

    def get_strategy_weights(self, regime: MarketRegime) -> Dict[str, float]:
        """
        Get recommended strategy weights for detected regime

        Returns:
            Dictionary of strategy weights (sum to 1.0)
        """
        weight_configs = {
            MarketRegime.TRENDING_UP: {
                'trend_following': 0.60,
                'momentum': 0.25,
                'mean_reversion': 0.05,
                'microstructure': 0.05,
                'volatility': 0.05,
            },
            MarketRegime.TRENDING_DOWN: {
                'trend_following': 0.60,
                'momentum': 0.25,
                'mean_reversion': 0.05,
                'microstructure': 0.05,
                'volatility': 0.05,
            },
            MarketRegime.RANGING: {
                'mean_reversion': 0.50,
                'microstructure': 0.25,
                'volatility': 0.15,
                'trend_following': 0.05,
                'momentum': 0.05,
            },
            MarketRegime.HIGH_VOLATILITY: {
                'microstructure': 0.40,
                'volatility': 0.30,
                'mean_reversion': 0.15,
                'trend_following': 0.10,
                'momentum': 0.05,
            },
            MarketRegime.BREAKOUT: {
                'momentum': 0.40,
                'trend_following': 0.30,
                'volatility': 0.15,
                'microstructure': 0.10,
                'mean_reversion': 0.05,
            },
        }

        return weight_configs.get(regime, {
            'trend_following': 0.20,
            'momentum': 0.20,
            'mean_reversion': 0.20,
            'microstructure': 0.20,
            'volatility': 0.20,
        })

    # ===== VECTORIZED REGIME DETECTION =====
    # Detect regime for entire time series using rolling window

    def detect_series(self, bars: pd.DataFrame, window_size: Optional[int] = None,
                     use_confidence_scores: bool = True) -> pd.DataFrame:
        """
        Detect market regime for entire time series (VECTORIZED VERSION)

        Uses rolling window approach - at each timestamp, detect regime using
        past window_size bars of data. This ensures each timestamp can have
        different regime based on recent market conditions.

        Parameters:
            bars: OHLCV DataFrame (timestamp index)
            window_size: Size of rolling window for regime detection
                        If None, uses adaptive window based on data length
            use_confidence_scores: If True, use continuous confidence scores (0~1)
                                  instead of binary one-hot encoding.
                                  Recommended for ML features.

        Returns:
            DataFrame with regime features for each timestamp:

            If use_confidence_scores=True (RECOMMENDED for ML):
            - regime_trending_up_score: confidence score (0~1, continuous)
            - regime_trending_down_score: confidence score (0~1, continuous)
            - regime_ranging_score: confidence score (0~1, continuous)
            - regime_high_vol_score: confidence score (0~1, continuous)
            - regime_breakout_score: confidence score (0~1, continuous)

            If use_confidence_scores=False (legacy binary):
            - regime_trending_up: 1.0 if trending up, 0.0 otherwise
            - regime_trending_down: 1.0 if trending down, 0.0 otherwise
            - regime_ranging: 1.0 if ranging, 0.0 otherwise
            - regime_high_vol: 1.0 if high volatility, 0.0 otherwise
            - regime_breakout: 1.0 if breakout, 0.0 otherwise

            Always included (continuous metrics):
            - regime_confidence: overall confidence score (0-1)
            - regime_trend_strength: trend strength (0-1)
            - regime_volatility: volatility measure
            - regime_mean_reversion: mean reversion tendency
            - regime_volume_strength: volume strength
        """
        if window_size is None:
            # Adaptive window size based on data length and timeframe
            bar_count = len(bars)

            # Detect timeframe from data characteristics
            if bar_count < 500:  # Likely daily or weekly data
                # For daily data: use smaller window (50-100 bars = 2-3 months)
                window_size = min(80, max(50, bar_count - 30))
            else:  # Hourly or minute data
                # For high-frequency data: use standard window
                window_size = max(self.hurst_period, self.sma_slow) + 20

        if len(bars) < window_size:
            raise ValueError(
                f"Insufficient data: need at least {window_size} bars for rolling regime detection, "
                f"got {len(bars)} bars"
            )

        # Initialize result DataFrame
        result = pd.DataFrame(index=bars.index)

        # Initialize regime features based on mode
        if use_confidence_scores:
            # Continuous confidence scores (RECOMMENDED for ML)
            result['regime_trending_up_score'] = 0.0
            result['regime_trending_down_score'] = 0.0
            result['regime_ranging_score'] = 0.0
            result['regime_high_vol_score'] = 0.0
            result['regime_breakout_score'] = 0.0
        else:
            # Legacy binary one-hot encoding
            result['regime_trending_up'] = 0.0
            result['regime_trending_down'] = 0.0
            result['regime_ranging'] = 0.0
            result['regime_high_vol'] = 0.0
            result['regime_breakout'] = 0.0

        # Initialize continuous regime metrics (always included)
        result['regime_confidence'] = 0.0
        result['regime_trend_strength'] = 0.0
        result['regime_volatility'] = 0.0
        result['regime_mean_reversion'] = 0.0
        result['regime_volume_strength'] = 0.0

        # Rolling window regime detection
        for i in range(window_size, len(bars) + 1):
            # Get window of data
            window_bars = bars.iloc[i-window_size:i]

            # Detect regime for this window
            try:
                metrics = self.detect(window_bars)
                timestamp = window_bars.index[-1]
                regime_value = metrics.regime.value
                confidence = metrics.confidence

                # Set regime features based on mode
                if use_confidence_scores:
                    # Continuous confidence scores (RECOMMENDED)
                    # Score = confidence if this is the detected regime, else 0
                    result.loc[timestamp, 'regime_trending_up_score'] = confidence if regime_value == 'trending_up' else 0.0
                    result.loc[timestamp, 'regime_trending_down_score'] = confidence if regime_value == 'trending_down' else 0.0
                    result.loc[timestamp, 'regime_ranging_score'] = confidence if regime_value == 'ranging' else 0.0
                    result.loc[timestamp, 'regime_high_vol_score'] = confidence if regime_value == 'high_volatility' else 0.0
                    result.loc[timestamp, 'regime_breakout_score'] = confidence if regime_value == 'breakout' else 0.0
                else:
                    # Legacy binary one-hot encoding
                    result.loc[timestamp, 'regime_trending_up'] = 1.0 if regime_value == 'trending_up' else 0.0
                    result.loc[timestamp, 'regime_trending_down'] = 1.0 if regime_value == 'trending_down' else 0.0
                    result.loc[timestamp, 'regime_ranging'] = 1.0 if regime_value == 'ranging' else 0.0
                    result.loc[timestamp, 'regime_high_vol'] = 1.0 if regime_value == 'high_volatility' else 0.0
                    result.loc[timestamp, 'regime_breakout'] = 1.0 if regime_value == 'breakout' else 0.0

                # Set continuous regime metrics (always included)
                result.loc[timestamp, 'regime_confidence'] = confidence
                result.loc[timestamp, 'regime_trend_strength'] = metrics.trend_strength
                result.loc[timestamp, 'regime_volatility'] = metrics.volatility
                result.loc[timestamp, 'regime_mean_reversion'] = metrics.mean_reversion
                result.loc[timestamp, 'regime_volume_strength'] = metrics.volume_strength

            except Exception:
                # If regime detection fails for this window, keep as zeros
                continue

        return result

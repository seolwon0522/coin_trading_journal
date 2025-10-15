"""
Technical Factors Module

기술적 분석 기반 알파 팩터 계산 모듈.
Nautilus Trader의 built-in indicators를 활용하여 전문가급 시그널 생성.

Factors:
- Trend Following: EMA Cross, MACD, ADX
- Mean Reversion: RSI, Bollinger Bands
- Momentum: Price Momentum, Rate of Change
- Volatility: ATR, Bollinger Band Width
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from datetime import datetime

from nautilus_trader.indicators import (
    ExponentialMovingAverage,
    SimpleMovingAverage,
    AverageTrueRange,
    RelativeStrengthIndex,
    MovingAverageConvergenceDivergence,
    BollingerBands,
)
from nautilus_trader.model.data import Bar


class SignalStrength(Enum):
    """시그널 강도"""
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    NEUTRAL = "neutral"
    SELL = "sell"
    STRONG_SELL = "strong_sell"


@dataclass
class AlphaSignal:
    """알파 시그널"""
    value: float  # -1.0 (strong sell) to +1.0 (strong buy)
    strength: SignalStrength
    confidence: float  # 0.0 to 1.0
    components: Dict[str, float]  # Individual factor contributions
    timestamp: datetime

    def to_dict(self) -> Dict:
        """딕셔너리로 변환"""
        return {
            'value': round(self.value, 4),
            'strength': self.strength.value,
            'confidence': round(self.confidence, 4),
            'components': {k: round(v, 4) for k, v in self.components.items()},
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }


class TechnicalFactors:
    """
    기술적 분석 팩터 계산기

    Combines multiple technical indicators to generate alpha signals:
    - Trend Following: EMA Cross, MACD
    - Mean Reversion: RSI, Bollinger Bands
    - Momentum: Price momentum
    - Volatility: ATR
    """

    def __init__(
        self,
        # EMA parameters
        ema_fast_period: int = 12,
        ema_slow_period: int = 26,
        # RSI parameters
        rsi_period: int = 14,
        rsi_overbought: float = 70.0,
        rsi_oversold: float = 30.0,
        # MACD parameters
        macd_fast: int = 12,
        macd_slow: int = 26,
        macd_signal: int = 9,
        # Bollinger Bands parameters
        bb_period: int = 20,
        bb_std: float = 2.0,
        # ADX parameters
        adx_period: int = 14,
        # ATR parameters
        atr_period: int = 14,
        # Momentum parameters
        momentum_period: int = 20,
    ):
        """
        Initialize technical factors calculator

        Parameters:
            ema_fast_period: Fast EMA period
            ema_slow_period: Slow EMA period
            rsi_period: RSI calculation period
            rsi_overbought: RSI overbought threshold
            rsi_oversold: RSI oversold threshold
            macd_fast: MACD fast period
            macd_slow: MACD slow period
            macd_signal: MACD signal line period
            bb_period: Bollinger Bands period
            bb_std: Bollinger Bands standard deviation
            adx_period: ADX period
            atr_period: ATR period
            momentum_period: Momentum lookback period
        """
        # Store parameters
        self.ema_fast_period = ema_fast_period
        self.ema_slow_period = ema_slow_period
        self.rsi_period = rsi_period
        self.rsi_overbought = rsi_overbought
        self.rsi_oversold = rsi_oversold
        self.macd_fast = macd_fast
        self.macd_slow = macd_slow
        self.macd_signal = macd_signal
        self.bb_period = bb_period
        self.bb_std = bb_std
        self.adx_period = adx_period
        self.atr_period = atr_period
        self.momentum_period = momentum_period

        # Initialize Nautilus indicators
        self.ema_fast = ExponentialMovingAverage(ema_fast_period)
        self.ema_slow = ExponentialMovingAverage(ema_slow_period)
        self.rsi = RelativeStrengthIndex(rsi_period)
        self.macd = MovingAverageConvergenceDivergence(macd_fast, macd_slow, macd_signal)
        self.bb = BollingerBands(bb_period, bb_std)
        self.atr = AverageTrueRange(atr_period)

        # State tracking
        self.bars_processed = 0
        self.initialized = False

    def update(self, bar: Bar) -> None:
        """
        Update all indicators with new bar

        Parameters:
            bar: New price bar (Nautilus Bar object)
        """
        # Update all indicators
        self.ema_fast.update_raw(float(bar.close))
        self.ema_slow.update_raw(float(bar.close))
        self.rsi.update_raw(float(bar.close))
        self.macd.update_raw(float(bar.close))
        self.bb.update_raw(float(bar.close))
        self.atr.update_raw(
            float(bar.high),
            float(bar.low),
            float(bar.close),
        )

        self.bars_processed += 1

        # Check if initialized (need enough bars for all indicators)
        min_bars_needed = max(
            self.ema_slow_period,
            self.rsi_period,
            self.macd_slow + self.macd_signal,
            self.bb_period,
            self.atr_period,
            self.momentum_period,
        )

        if self.bars_processed >= min_bars_needed:
            self.initialized = True

    def calculate_alpha_series(self, bars: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate alpha signal series for all bars (VECTORIZED VERSION)

        Returns:
            DataFrame with columns for each component signal at each timestamp
        """
        if len(bars) < max(self.ema_slow_period, self.macd_slow + self.macd_signal, self.bb_period):
            raise ValueError(f"Insufficient data")

        # Calculate all signals as series
        ema_signals = self._calculate_ema_signal_series(bars)
        rsi_signals = self._calculate_rsi_signal_series(bars)
        macd_signals = self._calculate_macd_signal_series(bars)
        bb_signals = self._calculate_bb_signal_series(bars)
        momentum_signals = self._calculate_momentum_signal_series(bars)
        adx_signals = self._calculate_trend_strength_series(bars)

        # Combine signals
        combined = (
            ema_signals * 0.25 +
            macd_signals * 0.20 +
            rsi_signals * 0.20 +
            bb_signals * 0.20 +
            momentum_signals * 0.15
        )

        # Adjust by trend strength
        strong_trend = adx_signals > 0.5
        combined[strong_trend] *= (1.0 + adx_signals[strong_trend] * 0.3)
        combined[~strong_trend & (abs(combined) > 0.5)] *= (1.0 - adx_signals[~strong_trend & (abs(combined) > 0.5)] * 0.2)

        # Clamp to [-1, 1]
        combined = combined.clip(-1.0, 1.0)

        # Calculate confidence series
        confidence = self._calculate_confidence_series(
            ema_signals, rsi_signals, macd_signals, bb_signals, momentum_signals
        )

        # Create result DataFrame
        result = pd.DataFrame({
            'tech_ema': ema_signals,
            'tech_rsi': rsi_signals,
            'tech_macd': macd_signals,
            'tech_bollinger': bb_signals,
            'tech_momentum': momentum_signals,
            'tech_trend_strength': adx_signals,
            'tech_signal': combined,
            'tech_confidence': confidence,
        }, index=bars.index)

        return result

    def calculate_alpha(self, bars: pd.DataFrame) -> AlphaSignal:
        """
        Calculate alpha signal from technical factors

        Parameters:
            bars: OHLCV DataFrame

        Returns:
            AlphaSignal with combined technical signal
        """
        if len(bars) < max(self.ema_slow_period, self.macd_slow + self.macd_signal, self.bb_period):
            raise ValueError(f"Insufficient data: need at least {max(self.ema_slow_period, self.macd_slow + self.macd_signal, self.bb_period)} bars")

        # Calculate individual factor signals
        ema_signal = self._calculate_ema_signal(bars)
        rsi_signal = self._calculate_rsi_signal(bars)
        macd_signal = self._calculate_macd_signal(bars)
        bb_signal = self._calculate_bb_signal(bars)
        momentum_signal = self._calculate_momentum_signal(bars)
        adx_signal = self._calculate_trend_strength(bars)

        # Combine signals with weights
        # Trend following gets higher weight in trending markets
        # Mean reversion gets higher weight in ranging markets
        combined_signal = (
            ema_signal * 0.25 +
            macd_signal * 0.20 +
            rsi_signal * 0.20 +
            bb_signal * 0.20 +
            momentum_signal * 0.15
        )

        # Adjust by trend strength (ADX)
        # Strong trend: boost trend-following signals
        # Weak trend: boost mean-reversion signals
        if adx_signal > 0.5:  # Strong trend
            if combined_signal > 0:
                combined_signal *= (1.0 + adx_signal * 0.3)
            else:
                combined_signal *= (1.0 + adx_signal * 0.3)
        else:  # Weak trend - mean reversion
            if abs(combined_signal) > 0.5:
                combined_signal *= (1.0 - adx_signal * 0.2)

        # Clamp to [-1, 1]
        combined_signal = max(-1.0, min(1.0, combined_signal))

        # Determine strength
        strength = self._determine_strength(combined_signal)

        # Calculate confidence based on signal agreement
        confidence = self._calculate_confidence(
            ema_signal, rsi_signal, macd_signal, bb_signal, momentum_signal
        )

        # Component breakdown
        components = {
            'ema': ema_signal,
            'rsi': rsi_signal,
            'macd': macd_signal,
            'bollinger': bb_signal,
            'momentum': momentum_signal,
            'trend_strength': adx_signal,
        }

        return AlphaSignal(
            value=combined_signal,
            strength=strength,
            confidence=confidence,
            components=components,
            timestamp=bars.index[-1] if hasattr(bars.index[-1], 'to_pydatetime') else datetime.now(),
        )

    def _calculate_ema_signal(self, bars: pd.DataFrame) -> float:
        """
        Calculate EMA crossover signal

        Returns:
            Signal: -1.0 to +1.0
        """
        close = bars['close'].values

        # Calculate EMAs
        ema_fast = self._ema(close, self.ema_fast_period)
        ema_slow = self._ema(close, self.ema_slow_period)

        # Current crossover state
        current_diff = ema_fast[-1] - ema_slow[-1]
        prev_diff = ema_fast[-2] - ema_slow[-2]

        # Normalize by ATR for scale-independence
        atr = self._calculate_atr_array(bars)[-1]
        normalized_diff = current_diff / (atr + 1e-10)

        # Signal strength based on:
        # 1. Magnitude of separation
        # 2. Recent crossover
        signal = np.tanh(normalized_diff * 2)  # Squash to [-1, 1]

        # Boost signal if recent crossover
        if (current_diff > 0 and prev_diff <= 0):  # Bullish cross
            signal = max(signal, 0.7)
        elif (current_diff < 0 and prev_diff >= 0):  # Bearish cross
            signal = min(signal, -0.7)

        return float(signal)

    def _calculate_rsi_signal(self, bars: pd.DataFrame) -> float:
        """
        Calculate RSI signal

        Returns:
            Signal: -1.0 to +1.0
        """
        rsi = self._calculate_rsi_array(bars)[-1]

        # RSI signal (mean-reverting)
        if rsi >= self.rsi_overbought:
            # Overbought - sell signal
            signal = -((rsi - self.rsi_overbought) / (100 - self.rsi_overbought))
            signal = max(-1.0, signal)
        elif rsi <= self.rsi_oversold:
            # Oversold - buy signal
            signal = ((self.rsi_oversold - rsi) / self.rsi_oversold)
            signal = min(1.0, signal)
        else:
            # Neutral zone - weak signal based on direction
            if rsi > 50:
                signal = (rsi - 50) / (self.rsi_overbought - 50) * 0.3
            else:
                signal = (rsi - 50) / (50 - self.rsi_oversold) * 0.3

        return float(signal)

    def _calculate_macd_signal(self, bars: pd.DataFrame) -> float:
        """
        Calculate MACD signal

        Returns:
            Signal: -1.0 to +1.0
        """
        close = bars['close'].values

        # Calculate MACD
        ema_fast = self._ema(close, self.macd_fast)
        ema_slow = self._ema(close, self.macd_slow)
        macd_line = ema_fast - ema_slow
        signal_line = self._ema(macd_line, self.macd_signal)
        histogram = macd_line - signal_line

        # Current values
        current_hist = histogram[-1]
        prev_hist = histogram[-2]

        # Normalize by price for scale-independence
        normalized_hist = current_hist / (close[-1] + 1e-10)

        # Signal based on histogram
        signal = np.tanh(normalized_hist * 100)  # Squash to [-1, 1]

        # Boost signal if recent crossover
        if current_hist > 0 and prev_hist <= 0:  # Bullish cross
            signal = max(signal, 0.6)
        elif current_hist < 0 and prev_hist >= 0:  # Bearish cross
            signal = min(signal, -0.6)

        return float(signal)

    def _calculate_bb_signal(self, bars: pd.DataFrame) -> float:
        """
        Calculate Bollinger Bands signal (mean-reverting)

        Returns:
            Signal: -1.0 to +1.0
        """
        close = bars['close'].values

        # Calculate Bollinger Bands
        sma = self._sma(close, self.bb_period)
        std = self._rolling_std(close, self.bb_period)
        upper = sma + self.bb_std * std
        lower = sma - self.bb_std * std

        current_price = close[-1]
        current_sma = sma[-1]
        current_upper = upper[-1]
        current_lower = lower[-1]

        # Calculate %B (position within bands)
        if current_upper - current_lower > 0:
            percent_b = (current_price - current_lower) / (current_upper - current_lower)
        else:
            percent_b = 0.5

        # Mean-reverting signal
        if percent_b > 1.0:  # Above upper band - sell
            signal = -(percent_b - 1.0)
            signal = max(-1.0, signal)
        elif percent_b < 0.0:  # Below lower band - buy
            signal = -percent_b
            signal = min(1.0, signal)
        else:  # Within bands
            # Signal based on distance from middle
            signal = -(percent_b - 0.5) * 2 * 0.5  # Weak mean-reversion

        return float(signal)

    def _calculate_momentum_signal(self, bars: pd.DataFrame) -> float:
        """
        Calculate price momentum signal

        Returns:
            Signal: -1.0 to +1.0
        """
        close = bars['close'].values

        if len(close) < self.momentum_period + 1:
            return 0.0

        # Rate of change
        roc = (close[-1] - close[-self.momentum_period]) / (close[-self.momentum_period] + 1e-10)

        # Normalize
        signal = np.tanh(roc * 10)  # Squash to [-1, 1]

        return float(signal)

    def _calculate_trend_strength(self, bars: pd.DataFrame) -> float:
        """
        Calculate trend strength using ADX

        Returns:
            Strength: 0.0 (no trend) to 1.0 (strong trend)
        """
        high = bars['high'].values
        low = bars['low'].values
        close = bars['close'].values

        # Calculate ADX
        adx = self._calculate_adx_array(bars)[-1]

        # Normalize to 0-1
        strength = min(1.0, adx / 50.0)  # ADX of 50 = very strong trend

        return float(strength)

    def _determine_strength(self, signal: float) -> SignalStrength:
        """Determine signal strength category"""
        abs_signal = abs(signal)

        if signal > 0.7:
            return SignalStrength.STRONG_BUY
        elif signal > 0.3:
            return SignalStrength.BUY
        elif signal < -0.7:
            return SignalStrength.STRONG_SELL
        elif signal < -0.3:
            return SignalStrength.SELL
        else:
            return SignalStrength.NEUTRAL

    def _calculate_confidence(self, *signals: float) -> float:
        """
        Calculate confidence based on signal agreement

        High confidence when signals agree
        Low confidence when signals conflict
        """
        signals_array = np.array(signals)

        # Calculate agreement (low standard deviation = high agreement)
        std = np.std(signals_array)
        mean_abs = np.mean(np.abs(signals_array))

        # Confidence is high when:
        # 1. Signals have low disagreement (low std)
        # 2. Signals are strong (high mean absolute value)
        if mean_abs > 0.1:
            confidence = (1.0 - min(1.0, std / mean_abs)) * mean_abs
        else:
            confidence = 0.0

        return float(min(1.0, confidence))

    # Helper methods for indicator calculations

    @staticmethod
    def _ema(data: np.ndarray, period: int) -> np.ndarray:
        """Calculate Exponential Moving Average"""
        alpha = 2.0 / (period + 1)
        ema = np.zeros_like(data)
        ema[0] = data[0]

        for i in range(1, len(data)):
            ema[i] = alpha * data[i] + (1 - alpha) * ema[i-1]

        return ema

    @staticmethod
    def _sma(data: np.ndarray, period: int) -> np.ndarray:
        """Calculate Simple Moving Average"""
        sma = np.zeros_like(data)
        sma[:period-1] = np.nan

        for i in range(period-1, len(data)):
            sma[i] = np.mean(data[i-period+1:i+1])

        return sma

    @staticmethod
    def _rolling_std(data: np.ndarray, period: int) -> np.ndarray:
        """Calculate rolling standard deviation"""
        std = np.zeros_like(data)
        std[:period-1] = np.nan

        for i in range(period-1, len(data)):
            std[i] = np.std(data[i-period+1:i+1], ddof=1)

        return std

    def _calculate_rsi_array(self, bars: pd.DataFrame) -> np.ndarray:
        """Calculate RSI for entire array"""
        close = bars['close'].values
        deltas = np.diff(close)

        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)

        avg_gains = self._ema(np.concatenate([[0], gains]), self.rsi_period)
        avg_losses = self._ema(np.concatenate([[0], losses]), self.rsi_period)

        rs = avg_gains / (avg_losses + 1e-10)
        rsi = 100 - (100 / (1 + rs))

        return rsi

    def _calculate_atr_array(self, bars: pd.DataFrame) -> np.ndarray:
        """Calculate ATR for entire array"""
        high = bars['high'].values
        low = bars['low'].values
        close = bars['close'].values

        tr1 = high - low
        tr2 = np.abs(high - np.roll(close, 1))
        tr3 = np.abs(low - np.roll(close, 1))
        tr = np.maximum(tr1, np.maximum(tr2, tr3))

        atr = self._ema(tr, self.atr_period)

        return atr

    def _calculate_adx_array(self, bars: pd.DataFrame) -> np.ndarray:
        """Calculate ADX for entire array"""
        from app.core.factors.market_regime import MarketRegimeDetector

        # Reuse ADX calculation from market_regime
        detector = MarketRegimeDetector(adx_period=self.adx_period)

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
        atr = detector._wilder_smooth(tr, self.adx_period)
        plus_di = 100 * detector._wilder_smooth(plus_dm, self.adx_period) / (atr + 1e-10)
        minus_di = 100 * detector._wilder_smooth(minus_dm, self.adx_period) / (atr + 1e-10)

        # DX and ADX
        dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di + 1e-10)
        adx = detector._wilder_smooth(dx, self.adx_period)

        return adx

    # ===== VECTORIZED CALCULATION METHODS =====
    # These methods calculate signals for entire time series at once
    
    def _calculate_ema_signal_series(self, bars: pd.DataFrame) -> pd.Series:
        """Calculate EMA crossover signal for entire series"""
        close = bars['close'].values
        
        ema_fast = self._ema(close, self.ema_fast_period)
        ema_slow = self._ema(close, self.ema_slow_period)
        
        diff = ema_fast - ema_slow
        atr = self._calculate_atr_array(bars)
        
        normalized_diff = diff / (atr + 1e-10)
        signals = pd.Series(np.tanh(normalized_diff * 2), index=bars.index)
        
        # Detect crossovers
        prev_diff = np.roll(diff, 1)
        bullish_cross = (diff > 0) & (prev_diff <= 0)
        bearish_cross = (diff < 0) & (prev_diff >= 0)
        
        signals[bullish_cross] = signals[bullish_cross].clip(lower=0.7)
        signals[bearish_cross] = signals[bearish_cross].clip(upper=-0.7)
        
        return signals
    
    def _calculate_rsi_signal_series(self, bars: pd.DataFrame) -> pd.Series:
        """Calculate RSI signal for entire series"""
        rsi_values = self._calculate_rsi_array(bars)
        signals = pd.Series(0.0, index=bars.index)
        
        # Overbought
        overbought = rsi_values >= self.rsi_overbought
        signals[overbought] = -((rsi_values[overbought] - self.rsi_overbought) / (100 - self.rsi_overbought))
        signals[overbought] = signals[overbought].clip(lower=-1.0)
        
        # Oversold
        oversold = rsi_values <= self.rsi_oversold
        signals[oversold] = ((self.rsi_oversold - rsi_values[oversold]) / self.rsi_oversold)
        signals[oversold] = signals[oversold].clip(upper=1.0)
        
        # Neutral zone
        neutral = (~overbought) & (~oversold)
        above_50 = rsi_values > 50
        signals[neutral & above_50] = ((rsi_values[neutral & above_50] - 50) / (self.rsi_overbought - 50) * 0.3)
        signals[neutral & ~above_50] = ((rsi_values[neutral & ~above_50] - 50) / (50 - self.rsi_oversold) * 0.3)
        
        return signals
    
    def _calculate_macd_signal_series(self, bars: pd.DataFrame) -> pd.Series:
        """Calculate MACD signal for entire series"""
        close = bars['close'].values
        
        ema_fast = self._ema(close, self.macd_fast)
        ema_slow = self._ema(close, self.macd_slow)
        macd_line = ema_fast - ema_slow
        signal_line = self._ema(macd_line, self.macd_signal)
        histogram = macd_line - signal_line
        
        normalized_hist = histogram / (close + 1e-10)
        signals = pd.Series(np.tanh(normalized_hist * 100), index=bars.index)
        
        # Detect crossovers
        prev_hist = np.roll(histogram, 1)
        bullish_cross = (histogram > 0) & (prev_hist <= 0)
        bearish_cross = (histogram < 0) & (prev_hist >= 0)
        
        signals[bullish_cross] = signals[bullish_cross].clip(lower=0.6)
        signals[bearish_cross] = signals[bearish_cross].clip(upper=-0.6)
        
        return signals
    
    def _calculate_bb_signal_series(self, bars: pd.DataFrame) -> pd.Series:
        """Calculate Bollinger Bands signal for entire series"""
        close = bars['close'].values
        
        sma = self._sma(close, self.bb_period)
        std = self._rolling_std(close, self.bb_period)
        upper = sma + self.bb_std * std
        lower = sma - self.bb_std * std
        
        # Calculate %B
        band_width = upper - lower
        percent_b = np.where(band_width > 0, (close - lower) / band_width, 0.5)
        
        signals = pd.Series(0.0, index=bars.index)
        
        # Above upper band
        above = percent_b > 1.0
        signals[above] = -(percent_b[above] - 1.0)
        signals[above] = signals[above].clip(lower=-1.0)
        
        # Below lower band
        below = percent_b < 0.0
        signals[below] = -percent_b[below]
        signals[below] = signals[below].clip(upper=1.0)
        
        # Within bands
        within = (~above) & (~below)
        signals[within] = -(percent_b[within] - 0.5) * 2 * 0.5
        
        return signals
    
    def _calculate_momentum_signal_series(self, bars: pd.DataFrame) -> pd.Series:
        """Calculate momentum signal for entire series"""
        close = bars['close'].values
        
        if len(close) < self.momentum_period + 1:
            return pd.Series(0.0, index=bars.index)
        
        # Rate of change
        roc = np.zeros_like(close)
        for i in range(self.momentum_period, len(close)):
            roc[i] = (close[i] - close[i - self.momentum_period]) / (close[i - self.momentum_period] + 1e-10)
        
        signals = pd.Series(np.tanh(roc * 10), index=bars.index)
        
        return signals
    
    def _calculate_trend_strength_series(self, bars: pd.DataFrame) -> pd.Series:
        """Calculate trend strength (ADX) for entire series"""
        adx = self._calculate_adx_array(bars)
        
        # Normalize to 0-1
        strength = np.minimum(adx / 50.0, 1.0)
        
        return pd.Series(strength, index=bars.index)
    
    def _calculate_confidence_series(self, *signal_series) -> pd.Series:
        """Calculate confidence for entire series"""
        # Stack all signals into a DataFrame
        signals_df = pd.DataFrame(signal_series).T
        
        # Calculate std and mean across signals for each timestamp
        std = signals_df.std(axis=1)
        mean_abs = signals_df.abs().mean(axis=1)
        
        confidence = pd.Series(0.0, index=signals_df.index)
        
        mask = mean_abs > 0.1
        confidence[mask] = (1.0 - np.minimum(std[mask] / mean_abs[mask], 1.0)) * mean_abs[mask]
        
        return confidence.clip(0, 1.0)

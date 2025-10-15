"""
Microstructure Factors Module

시장 미시구조 기반 알파 팩터 계산 모듈.
단기 가격 움직임과 유동성을 분석하여 시그널 생성.

Factors:
- Orderbook Imbalance: 매수/매도 호가 불균형
- Volume Delta: 매수/매도 거래량 차이
- Trade Intensity: 거래 빈도 및 강도
- Spread Analysis: 호가 스프레드 분석
- Price Impact: 거래의 가격 영향력
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from datetime import datetime


@dataclass
class MicrostructureSignal:
    """미시구조 시그널"""
    value: float  # -1.0 (strong sell pressure) to +1.0 (strong buy pressure)
    buy_pressure: float  # 매수 압력 (0-1)
    sell_pressure: float  # 매도 압력 (0-1)
    liquidity: float  # 유동성 지표 (0-1, higher is more liquid)
    confidence: float  # 신뢰도 (0-1)
    components: Dict[str, float]
    timestamp: datetime

    def to_dict(self) -> Dict:
        """딕셔너리로 변환"""
        return {
            'value': round(self.value, 4),
            'buy_pressure': round(self.buy_pressure, 4),
            'sell_pressure': round(self.sell_pressure, 4),
            'liquidity': round(self.liquidity, 4),
            'confidence': round(self.confidence, 4),
            'components': {k: round(v, 4) for k, v in self.components.items()},
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }


class MicrostructureFactors:
    """
    시장 미시구조 팩터 계산기

    Analyzes market microstructure to generate alpha signals:
    - Orderbook Imbalance: Bid/Ask volume imbalance
    - Volume Delta: Buy/Sell volume difference
    - Trade Intensity: Frequency and magnitude of trades
    - Spread Analysis: Bid-ask spread patterns
    - Price Impact: Trade impact on price
    """

    def __init__(
        self,
        # Orderbook parameters
        orderbook_levels: int = 10,  # Number of orderbook levels to analyze
        imbalance_window: int = 20,  # Window for imbalance calculation
        # Volume parameters
        volume_window: int = 20,  # Window for volume analysis
        volume_percentile: float = 0.8,  # High volume threshold
        # Trade intensity parameters
        intensity_window: int = 10,  # Window for trade intensity
        # Spread parameters
        spread_window: int = 20,  # Window for spread analysis
    ):
        """
        Initialize microstructure factors calculator

        Parameters:
            orderbook_levels: Number of orderbook levels to analyze
            imbalance_window: Window size for imbalance calculation
            volume_window: Window for volume analysis
            volume_percentile: Percentile for high volume detection
            intensity_window: Window for trade intensity
            spread_window: Window for spread analysis
        """
        self.orderbook_levels = orderbook_levels
        self.imbalance_window = imbalance_window
        self.volume_window = volume_window
        self.volume_percentile = volume_percentile
        self.intensity_window = intensity_window
        self.spread_window = spread_window

    def calculate_alpha(self, bars: pd.DataFrame) -> MicrostructureSignal:
        """
        Calculate microstructure alpha signal

        Parameters:
            bars: OHLCV DataFrame with additional columns if available:
                  - buy_volume, sell_volume (if available)
                  - trades_count (if available)

        Returns:
            MicrostructureSignal with market microstructure analysis
        """
        if len(bars) < max(self.imbalance_window, self.volume_window):
            raise ValueError(
                f"Insufficient data: need at least {max(self.imbalance_window, self.volume_window)} bars"
            )

        # Calculate individual microstructure signals
        volume_delta_signal = self._calculate_volume_delta_signal(bars)
        trade_intensity_signal = self._calculate_trade_intensity_signal(bars)
        spread_signal = self._calculate_spread_signal(bars)
        price_impact_signal = self._calculate_price_impact_signal(bars)

        # Combine signals
        # Volume delta is most reliable, gets highest weight
        combined_signal = (
            volume_delta_signal * 0.40 +
            trade_intensity_signal * 0.25 +
            price_impact_signal * 0.20 +
            spread_signal * 0.15
        )

        # Clamp to [-1, 1]
        combined_signal = max(-1.0, min(1.0, combined_signal))

        # Calculate buy/sell pressure
        buy_pressure = max(0.0, combined_signal)
        sell_pressure = max(0.0, -combined_signal)

        # Calculate liquidity from volume and spread
        liquidity = self._calculate_liquidity(bars)

        # Calculate confidence based on signal agreement
        confidence = self._calculate_confidence(
            volume_delta_signal,
            trade_intensity_signal,
            spread_signal,
            price_impact_signal,
        )

        # Component breakdown
        components = {
            'volume_delta': volume_delta_signal,
            'trade_intensity': trade_intensity_signal,
            'spread': spread_signal,
            'price_impact': price_impact_signal,
        }

        return MicrostructureSignal(
            value=combined_signal,
            buy_pressure=buy_pressure,
            sell_pressure=sell_pressure,
            liquidity=liquidity,
            confidence=confidence,
            components=components,
            timestamp=bars.index[-1] if hasattr(bars.index[-1], 'to_pydatetime') else datetime.now(),
        )

    def _calculate_volume_delta_signal(self, bars: pd.DataFrame) -> float:
        """
        Calculate volume delta signal

        Volume delta = cumulative (buy_volume - sell_volume)
        Positive delta = buying pressure
        Negative delta = selling pressure

        If buy/sell volume not available, estimate from price movement
        """
        if 'buy_volume' in bars.columns and 'sell_volume' in bars.columns:
            # Use actual buy/sell volume
            buy_vol = bars['buy_volume'].values[-self.volume_window:]
            sell_vol = bars['sell_volume'].values[-self.volume_window:]
        else:
            # Estimate from price movement and volume
            close = bars['close'].values[-self.volume_window:]
            open_price = bars['open'].values[-self.volume_window:]
            volume = bars['volume'].values[-self.volume_window:]

            # Estimate buy volume when close > open
            buy_ratio = np.where(close > open_price, (close - open_price) / (close + 1e-10), 0)
            buy_vol = volume * (0.5 + buy_ratio * 0.5)
            sell_vol = volume - buy_vol

        # Calculate cumulative delta
        delta = np.sum(buy_vol) - np.sum(sell_vol)
        total_volume = np.sum(buy_vol) + np.sum(sell_vol)

        # Normalize to [-1, 1]
        if total_volume > 0:
            signal = delta / total_volume
        else:
            signal = 0.0

        # Apply smoothing - strong signal only if sustained
        signal = np.tanh(signal * 2)

        return float(signal)

    def _calculate_trade_intensity_signal(self, bars: pd.DataFrame) -> float:
        """
        Calculate trade intensity signal

        High buy intensity = many large upward price moves
        High sell intensity = many large downward price moves
        """
        close = bars['close'].values[-self.intensity_window:]
        volume = bars['volume'].values[-self.intensity_window:]

        # Price changes
        price_changes = np.diff(close)

        # Volume-weighted price changes
        volume_weights = volume[1:] / (np.sum(volume[1:]) + 1e-10)
        weighted_changes = price_changes * volume_weights

        # Cumulative weighted change
        cumulative_change = np.sum(weighted_changes)

        # Normalize by average price
        avg_price = np.mean(close)
        normalized_change = cumulative_change / (avg_price + 1e-10)

        # Convert to signal
        signal = np.tanh(normalized_change * 50)

        return float(signal)

    def _calculate_spread_signal(self, bars: pd.DataFrame) -> float:
        """
        Calculate spread-based signal

        Narrowing spread = increased buying pressure
        Widening spread = increased selling pressure or uncertainty

        Since we don't have actual bid/ask, estimate from high-low range
        """
        high = bars['high'].values[-self.spread_window:]
        low = bars['low'].values[-self.spread_window:]
        close = bars['close'].values[-self.spread_window:]

        # Estimate spread from high-low range
        spread = high - low
        avg_spread = np.mean(spread)

        # Current spread vs average
        current_spread = spread[-1]
        spread_ratio = current_spread / (avg_spread + 1e-10)

        # Price position within spread
        price_position = (close[-1] - low[-1]) / (spread[-1] + 1e-10)

        # Signal interpretation:
        # - Narrow spread + high price position = bullish
        # - Narrow spread + low price position = bearish
        # - Wide spread = uncertainty (neutral)

        if spread_ratio < 0.8:  # Narrow spread
            # Use price position as signal
            signal = (price_position - 0.5) * 2  # Convert [0,1] to [-1,1]
        elif spread_ratio > 1.2:  # Wide spread
            signal = 0.0  # Uncertainty
        else:  # Normal spread
            signal = (price_position - 0.5) * 1.0

        return float(np.clip(signal, -1.0, 1.0))

    def _calculate_price_impact_signal(self, bars: pd.DataFrame) -> float:
        """
        Calculate price impact signal

        Large volume with small price change = strong resistance/support
        Small volume with large price change = low liquidity, higher risk

        Strong buy impact = large volume + upward price movement
        Strong sell impact = large volume + downward price movement
        """
        close = bars['close'].values[-self.volume_window:]
        volume = bars['volume'].values[-self.volume_window:]

        # Price changes
        price_changes = np.diff(close) / (close[:-1] + 1e-10)

        # Volume changes
        avg_volume = np.mean(volume)
        volume_ratio = volume[1:] / (avg_volume + 1e-10)

        # Impact = price_change * volume_ratio
        # Positive impact = upward price movement with high volume
        impacts = price_changes * volume_ratio

        # Recent impact (weighted toward recent data)
        weights = np.linspace(0.5, 1.0, len(impacts))
        weighted_impact = np.sum(impacts * weights) / np.sum(weights)

        # Convert to signal
        signal = np.tanh(weighted_impact * 100)

        return float(signal)

    def _calculate_liquidity(self, bars: pd.DataFrame) -> float:
        """
        Calculate liquidity score

        Higher liquidity = higher volume, tighter spreads
        Returns: 0.0 (illiquid) to 1.0 (highly liquid)
        """
        volume = bars['volume'].values[-self.volume_window:]
        high = bars['high'].values[-self.spread_window:]
        low = bars['low'].values[-self.spread_window:]

        # Volume score (relative to average)
        current_volume = volume[-1]
        avg_volume = np.mean(volume)
        volume_score = min(1.0, current_volume / (avg_volume + 1e-10))

        # Spread score (inverse of spread ratio)
        spread = high - low
        current_spread = spread[-1]
        avg_spread = np.mean(spread)
        spread_score = min(1.0, avg_spread / (current_spread + 1e-10))

        # Combined liquidity score
        liquidity = (volume_score * 0.6 + spread_score * 0.4)

        return float(liquidity)

    def _calculate_confidence(self, *signals: float) -> float:
        """
        Calculate confidence based on signal agreement

        High confidence when all microstructure signals agree
        Low confidence when signals conflict
        """
        signals_array = np.array(signals)

        # Remove zero signals (no information)
        non_zero_signals = signals_array[np.abs(signals_array) > 0.1]

        if len(non_zero_signals) < 2:
            return 0.0

        # Calculate agreement (low standard deviation = high agreement)
        std = np.std(non_zero_signals)
        mean_abs = np.mean(np.abs(non_zero_signals))

        if mean_abs > 0.1:
            # Confidence is high when:
            # 1. Signals have low disagreement (low std)
            # 2. Signals are strong (high mean absolute value)
            confidence = (1.0 - min(1.0, std / mean_abs)) * mean_abs
        else:
            confidence = 0.0

        return float(min(1.0, confidence))

    # ===== VECTORIZED CALCULATION METHODS =====
    # These methods calculate signals for entire time series at once

    def calculate_alpha_series(self, bars: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate microstructure alpha signal series for all bars (VECTORIZED VERSION)

        Returns:
            DataFrame with columns for each component signal at each timestamp
        """
        if len(bars) < max(self.imbalance_window, self.volume_window):
            raise ValueError(
                f"Insufficient data: need at least {max(self.imbalance_window, self.volume_window)} bars"
            )

        # Calculate all signals as series
        volume_delta_signals = self._calculate_volume_delta_signal_series(bars)
        trade_intensity_signals = self._calculate_trade_intensity_signal_series(bars)
        spread_signals = self._calculate_spread_signal_series(bars)
        price_impact_signals = self._calculate_price_impact_signal_series(bars)

        # Combine signals (same weights as scalar version)
        combined = (
            volume_delta_signals * 0.40 +
            trade_intensity_signals * 0.25 +
            price_impact_signals * 0.20 +
            spread_signals * 0.15
        )

        # Clamp to [-1, 1]
        combined = combined.clip(-1.0, 1.0)

        # Calculate buy/sell pressure
        buy_pressure = combined.clip(lower=0.0)
        sell_pressure = (-combined).clip(lower=0.0)

        # Calculate liquidity series
        liquidity = self._calculate_liquidity_series(bars)

        # Calculate confidence series
        confidence = self._calculate_confidence_series(
            volume_delta_signals,
            trade_intensity_signals,
            spread_signals,
            price_impact_signals,
        )

        # Create result DataFrame
        result = pd.DataFrame({
            'micro_volume_delta': volume_delta_signals,
            'micro_trade_intensity': trade_intensity_signals,
            'micro_spread': spread_signals,
            'micro_price_impact': price_impact_signals,
            'micro_signal': combined,
            'micro_buy_pressure': buy_pressure,
            'micro_sell_pressure': sell_pressure,
            'micro_liquidity': liquidity,
            'micro_confidence': confidence,
        }, index=bars.index)

        return result

    def _calculate_volume_delta_signal_series(self, bars: pd.DataFrame) -> pd.Series:
        """Calculate volume delta signal for entire series"""
        close = bars['close'].values
        open_price = bars['open'].values
        volume = bars['volume'].values

        # Estimate buy/sell volume from price movement
        if 'buy_volume' in bars.columns and 'sell_volume' in bars.columns:
            buy_vol = bars['buy_volume'].values
            sell_vol = bars['sell_volume'].values
        else:
            # Estimate: when close > open, more buying pressure
            buy_ratio = np.where(close > open_price, (close - open_price) / (close + 1e-10), 0)
            buy_vol = volume * (0.5 + buy_ratio * 0.5)
            sell_vol = volume - buy_vol

        # Calculate rolling delta
        signals = pd.Series(0.0, index=bars.index)

        for i in range(self.volume_window, len(bars)):
            window_buy = buy_vol[i-self.volume_window:i]
            window_sell = sell_vol[i-self.volume_window:i]

            delta = np.sum(window_buy) - np.sum(window_sell)
            total = np.sum(window_buy) + np.sum(window_sell)

            if total > 0:
                signal = delta / total
            else:
                signal = 0.0

            # Apply smoothing
            signals.iloc[i] = np.tanh(signal * 2)

        return signals

    def _calculate_trade_intensity_signal_series(self, bars: pd.DataFrame) -> pd.Series:
        """Calculate trade intensity signal for entire series"""
        close = bars['close'].values
        volume = bars['volume'].values

        signals = pd.Series(0.0, index=bars.index)

        for i in range(self.intensity_window, len(bars)):
            window_close = close[i-self.intensity_window:i]
            window_volume = volume[i-self.intensity_window:i]

            # Price changes
            price_changes = np.diff(window_close)

            # Volume-weighted price changes
            volume_weights = window_volume[1:] / (np.sum(window_volume[1:]) + 1e-10)
            weighted_changes = price_changes * volume_weights

            # Cumulative weighted change
            cumulative_change = np.sum(weighted_changes)

            # Normalize by average price
            avg_price = np.mean(window_close)
            normalized_change = cumulative_change / (avg_price + 1e-10)

            # Convert to signal
            signals.iloc[i] = np.tanh(normalized_change * 50)

        return signals

    def _calculate_spread_signal_series(self, bars: pd.DataFrame) -> pd.Series:
        """Calculate spread signal for entire series"""
        high = bars['high'].values
        low = bars['low'].values
        close = bars['close'].values

        signals = pd.Series(0.0, index=bars.index)

        for i in range(self.spread_window, len(bars)):
            window_high = high[i-self.spread_window:i]
            window_low = low[i-self.spread_window:i]
            window_close = close[i-self.spread_window:i]

            # Estimate spread from high-low range
            spread = window_high - window_low
            avg_spread = np.mean(spread)

            # Current spread vs average
            current_spread = spread[-1]
            spread_ratio = current_spread / (avg_spread + 1e-10)

            # Price position within spread
            price_position = (window_close[-1] - window_low[-1]) / (current_spread + 1e-10)

            # Signal interpretation
            if spread_ratio < 0.8:  # Narrow spread
                signal = (price_position - 0.5) * 2
            elif spread_ratio > 1.2:  # Wide spread
                signal = 0.0
            else:  # Normal spread
                signal = (price_position - 0.5) * 1.0

            signals.iloc[i] = np.clip(signal, -1.0, 1.0)

        return signals

    def _calculate_price_impact_signal_series(self, bars: pd.DataFrame) -> pd.Series:
        """Calculate price impact signal for entire series"""
        close = bars['close'].values
        volume = bars['volume'].values

        signals = pd.Series(0.0, index=bars.index)

        for i in range(self.volume_window, len(bars)):
            window_close = close[i-self.volume_window:i]
            window_volume = volume[i-self.volume_window:i]

            # Price changes
            price_changes = np.diff(window_close) / (window_close[:-1] + 1e-10)

            # Volume ratio
            avg_volume = np.mean(window_volume)
            volume_ratio = window_volume[1:] / (avg_volume + 1e-10)

            # Impact = price_change * volume_ratio
            impacts = price_changes * volume_ratio

            # Recent impact (weighted toward recent data)
            weights = np.linspace(0.5, 1.0, len(impacts))
            weighted_impact = np.sum(impacts * weights) / np.sum(weights)

            # Convert to signal
            signals.iloc[i] = np.tanh(weighted_impact * 100)

        return signals

    def _calculate_liquidity_series(self, bars: pd.DataFrame) -> pd.Series:
        """Calculate liquidity score for entire series"""
        volume = bars['volume'].values
        high = bars['high'].values
        low = bars['low'].values

        liquidity = pd.Series(0.0, index=bars.index)

        for i in range(self.volume_window, len(bars)):
            window_volume = volume[i-self.volume_window:i]
            window_high = high[i-self.spread_window:i] if i >= self.spread_window else high[:i]
            window_low = low[i-self.spread_window:i] if i >= self.spread_window else low[:i]

            # Volume score
            current_volume = window_volume[-1]
            avg_volume = np.mean(window_volume)
            volume_score = min(1.0, current_volume / (avg_volume + 1e-10))

            # Spread score
            spread = window_high - window_low
            current_spread = spread[-1]
            avg_spread = np.mean(spread)
            spread_score = min(1.0, avg_spread / (current_spread + 1e-10))

            # Combined liquidity
            liquidity.iloc[i] = volume_score * 0.6 + spread_score * 0.4

        return liquidity

    def _calculate_confidence_series(self, *signal_series) -> pd.Series:
        """Calculate confidence for entire series"""
        # Stack all signals into DataFrame
        signals_df = pd.DataFrame(signal_series).T

        # Calculate std and mean across signals for each timestamp
        std = signals_df.std(axis=1)
        mean_abs = signals_df.abs().mean(axis=1)

        confidence = pd.Series(0.0, index=signals_df.index)

        # Where mean_abs > 0.1, calculate confidence
        mask = mean_abs > 0.1
        confidence[mask] = (1.0 - np.minimum(std[mask] / mean_abs[mask], 1.0)) * mean_abs[mask]

        return confidence.clip(0, 1.0)

    def estimate_orderbook_imbalance(
        self,
        bars: pd.DataFrame,
        levels: Optional[int] = None
    ) -> float:
        """
        Estimate orderbook imbalance from OHLCV data

        Since we don't have actual orderbook, estimate from:
        - Price movement patterns
        - Volume distribution
        - Range analysis

        Returns: -1.0 (sell-heavy) to +1.0 (buy-heavy)
        """
        levels = levels or self.orderbook_levels

        close = bars['close'].values[-self.imbalance_window:]
        high = bars['high'].values[-self.imbalance_window:]
        low = bars['low'].values[-self.imbalance_window:]
        volume = bars['volume'].values[-self.imbalance_window:]

        # Estimate buy/sell volume from wick analysis
        # Upper wick = rejected higher prices = selling pressure
        # Lower wick = rejected lower prices = buying pressure

        upper_wicks = high - np.maximum(bars['open'].values[-self.imbalance_window:], close)
        lower_wicks = np.minimum(bars['open'].values[-self.imbalance_window:], close) - low

        # Volume-weighted wick analysis
        upper_wick_volume = np.sum(upper_wicks * volume)
        lower_wick_volume = np.sum(lower_wicks * volume)

        total_wick_volume = upper_wick_volume + lower_wick_volume

        if total_wick_volume > 0:
            # More lower wick volume = more buying pressure (rejected lower prices)
            imbalance = (lower_wick_volume - upper_wick_volume) / total_wick_volume
        else:
            imbalance = 0.0

        # Apply smoothing
        imbalance = np.tanh(imbalance * 2)

        return float(imbalance)


class OrderbookImbalanceCalculator:
    """
    전문가급 호가창 불균형 계산기

    실제 호가창 데이터가 있을 때 사용
    (현재는 OHLCV 데이터로 추정)
    """

    @staticmethod
    def calculate_imbalance(
        bid_volumes: np.ndarray,
        ask_volumes: np.ndarray,
        levels: int = 10
    ) -> float:
        """
        Calculate orderbook imbalance from bid/ask volumes

        Parameters:
            bid_volumes: Array of bid volumes for each level
            ask_volumes: Array of ask volumes for each level
            levels: Number of levels to consider

        Returns:
            Imbalance: -1.0 (ask-heavy) to +1.0 (bid-heavy)
        """
        # Use top N levels
        bid_vol = np.sum(bid_volumes[:levels])
        ask_vol = np.sum(ask_volumes[:levels])

        total_vol = bid_vol + ask_vol

        if total_vol > 0:
            imbalance = (bid_vol - ask_vol) / total_vol
        else:
            imbalance = 0.0

        return float(imbalance)

    @staticmethod
    def calculate_weighted_imbalance(
        bid_prices: np.ndarray,
        bid_volumes: np.ndarray,
        ask_prices: np.ndarray,
        ask_volumes: np.ndarray,
        mid_price: float,
        levels: int = 10
    ) -> float:
        """
        Calculate distance-weighted orderbook imbalance

        Closer levels have more weight

        Returns:
            Weighted imbalance: -1.0 to +1.0
        """
        # Calculate distances from mid price
        bid_distances = np.abs(bid_prices[:levels] - mid_price)
        ask_distances = np.abs(ask_prices[:levels] - mid_price)

        # Inverse distance weights (closer = higher weight)
        bid_weights = 1.0 / (bid_distances + 1e-10)
        ask_weights = 1.0 / (ask_distances + 1e-10)

        # Weighted volumes
        weighted_bid_vol = np.sum(bid_volumes[:levels] * bid_weights)
        weighted_ask_vol = np.sum(ask_volumes[:levels] * ask_weights)

        total_weighted_vol = weighted_bid_vol + weighted_ask_vol

        if total_weighted_vol > 0:
            imbalance = (weighted_bid_vol - weighted_ask_vol) / total_weighted_vol
        else:
            imbalance = 0.0

        return float(imbalance)

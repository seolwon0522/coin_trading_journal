"""
Feature Engineering Pipeline

모든 알파 팩터를 통합하여 ML 모델용 피처를 생성하는 파이프라인.

Features Generated:
1. Technical Indicators (15+ features)
2. Microstructure Factors (13+ features)
3. Market Regime Indicators (10+ features)
4. Time-based Features (5+ features)
5. Lag Features (configurable)
6. Rolling Statistics (configurable)

Total: 50+ features for ML models
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from datetime import datetime

from app.core.factors.technical_factors import TechnicalFactors
from app.core.factors.microstructure_factors import MicrostructureFactors
from app.core.factors.market_regime import MarketRegimeDetector


@dataclass
class FeatureSet:
    """Complete feature set for ML models"""
    features: pd.DataFrame  # Feature DataFrame
    target: Optional[pd.Series] = None  # Target variable (returns)
    feature_names: List[str] = None  # Feature column names
    metadata: Dict = None  # Additional metadata

    def __post_init__(self):
        if self.feature_names is None:
            self.feature_names = list(self.features.columns)
        if self.metadata is None:
            self.metadata = {}

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'features_shape': self.features.shape,
            'feature_names': self.feature_names,
            'has_target': self.target is not None,
            'metadata': self.metadata,
        }


class FeatureEngineer:
    """
    Feature Engineering Pipeline

    통합 피처 생성 파이프라인:
    - 모든 알파 팩터 통합
    - 시계열 피처 생성 (lag, rolling)
    - 피처 정규화/스케일링
    - 피처 선택
    - Data leakage 방지
    """

    def __init__(
        self,
        # Technical factor parameters
        ema_fast: int = 12,
        ema_slow: int = 26,
        rsi_period: int = 14,
        # Microstructure parameters
        orderbook_levels: int = 10,
        volume_window: int = 20,
        # Regime parameters
        adx_period: int = 14,
        # Time-series feature parameters
        lag_periods: List[int] = None,
        rolling_windows: List[int] = None,
        # Target parameters
        forward_periods: int = 1,  # Periods ahead to predict
        # Feature selection
        min_correlation: float = 0.01,  # Remove features with very low correlation
        max_correlation: float = 0.95,  # Remove highly correlated features
    ):
        """
        Initialize feature engineer

        Parameters:
            ema_fast: Fast EMA period
            ema_slow: Slow EMA period
            rsi_period: RSI period
            orderbook_levels: Orderbook depth levels
            volume_window: Volume analysis window
            adx_period: ADX period
            lag_periods: List of lag periods (e.g., [1, 2, 5, 10])
            rolling_windows: List of rolling window sizes (e.g., [5, 10, 20])
            forward_periods: Periods ahead to predict
            min_correlation: Minimum correlation with target
            max_correlation: Maximum correlation between features
        """
        # Initialize factor calculators
        self.technical_factors = TechnicalFactors(
            ema_fast_period=ema_fast,
            ema_slow_period=ema_slow,
            rsi_period=rsi_period,
        )

        self.microstructure_factors = MicrostructureFactors(
            orderbook_levels=orderbook_levels,
            volume_window=volume_window,
        )

        self.regime_detector = MarketRegimeDetector(
            adx_period=adx_period,
        )

        # Time-series parameters
        self.lag_periods = lag_periods or [1, 2, 3, 5, 10]
        self.rolling_windows = rolling_windows or [5, 10, 20]
        self.forward_periods = forward_periods

        # Feature selection parameters
        self.min_correlation = min_correlation
        self.max_correlation = max_correlation

        # Store feature statistics for normalization
        self.feature_means = {}
        self.feature_stds = {}
        self.is_fitted = False

    def create_features(
        self,
        bars: pd.DataFrame,
        include_target: bool = True,
        normalize: bool = False,
    ) -> FeatureSet:
        """
        Create complete feature set from OHLCV data (Timeframe-Adaptive)

        Automatically detects timeframe and adapts feature creation:
        - Hourly/Minute data: Include all features (regime, time, etc.)
        - Daily data: Skip regime features (insufficient variation)

        Parameters:
            bars: OHLCV DataFrame with DatetimeIndex
            include_target: Whether to create target variable
            normalize: Whether to normalize features

        Returns:
            FeatureSet with all features
        """
        if len(bars) < max(self.rolling_windows) + max(self.lag_periods) + 50:
            raise ValueError(
                f"Insufficient data: need at least "
                f"{max(self.rolling_windows) + max(self.lag_periods) + 50} bars"
            )

        # Detect timeframe based on data characteristics
        bar_count = len(bars)
        is_daily_data = bar_count < 500  # Daily/weekly data typically has < 500 bars per year

        if is_daily_data:
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Detected daily/weekly data ({bar_count} bars). Skipping regime features.")

        # Create feature DataFrame
        features = pd.DataFrame(index=bars.index)

        # 1. Technical Features
        tech_features = self._create_technical_features(bars)
        features = pd.concat([features, tech_features], axis=1)

        # 2. Microstructure Features
        micro_features = self._create_microstructure_features(bars)
        features = pd.concat([features, micro_features], axis=1)

        # 3. Market Regime Features (ADAPTIVE: Skip for daily data)
        if not is_daily_data:
            regime_features = self._create_regime_features(bars)
            features = pd.concat([features, regime_features], axis=1)

        # 4. Time-based Features
        time_features = self._create_time_features(bars)
        features = pd.concat([features, time_features], axis=1)

        # 5. Lag Features
        lag_features = self._create_lag_features(bars)
        features = pd.concat([features, lag_features], axis=1)

        # 6. Rolling Statistics
        rolling_features = self._create_rolling_features(bars)
        features = pd.concat([features, rolling_features], axis=1)

        # Remove NaN rows (from indicators initialization)
        features = features.dropna()

        # Create target if requested
        target = None
        if include_target:
            target = self._create_target(bars.loc[features.index])

        # Normalize if requested
        if normalize:
            features = self._normalize_features(features)

        # Create FeatureSet
        feature_set = FeatureSet(
            features=features,
            target=target,
            feature_names=list(features.columns),
            metadata={
                'total_features': len(features.columns),
                'num_samples': len(features),
                'date_range': (features.index[0], features.index[-1]),
                'normalized': normalize,
            }
        )

        return feature_set

    def _create_technical_features(self, bars: pd.DataFrame) -> pd.DataFrame:
        """Create technical indicator features"""
        features = pd.DataFrame(index=bars.index)

        # Calculate technical alpha signals (VECTORIZED - returns entire series)
        try:
            tech_series = self.technical_factors.calculate_alpha_series(bars)
            features = pd.concat([features, tech_series], axis=1)

        except Exception as e:
            # If calculation fails, fill with zeros
            for col in ['tech_ema', 'tech_rsi', 'tech_macd', 'tech_bollinger',
                       'tech_momentum', 'tech_trend_strength', 'tech_signal', 'tech_confidence']:
                features[col] = 0.0

        # Additional raw technical indicators
        features['rsi_raw'] = self._calculate_rsi(bars, 14)
        features['atr_normalized'] = self._calculate_atr_normalized(bars, 14)

        # Price-based features
        features['close_to_high'] = (bars['close'] - bars['low']) / (bars['high'] - bars['low'] + 1e-10)
        features['body_size'] = abs(bars['close'] - bars['open']) / bars['open']
        features['upper_wick'] = (bars['high'] - np.maximum(bars['open'], bars['close'])) / bars['close']
        features['lower_wick'] = (np.minimum(bars['open'], bars['close']) - bars['low']) / bars['close']

        return features

    def _create_microstructure_features(self, bars: pd.DataFrame) -> pd.DataFrame:
        """Create microstructure features (VECTORIZED)"""
        features = pd.DataFrame(index=bars.index)

        # Calculate microstructure alpha signals (VECTORIZED - returns entire series)
        try:
            micro_series = self.microstructure_factors.calculate_alpha_series(bars)
            features = pd.concat([features, micro_series], axis=1)

        except Exception as e:
            # If calculation fails, fill with zeros
            for col in ['micro_volume_delta', 'micro_trade_intensity', 'micro_spread',
                       'micro_price_impact', 'micro_signal', 'micro_buy_pressure',
                       'micro_sell_pressure', 'micro_liquidity', 'micro_confidence']:
                features[col] = 0.0

        # Volume features
        features['volume_ratio'] = bars['volume'] / (bars['volume'].rolling(20).mean() + 1e-10)
        features['volume_volatility'] = bars['volume'].rolling(20).std() / (bars['volume'].rolling(20).mean() + 1e-10)

        return features

    def _create_regime_features(self, bars: pd.DataFrame) -> pd.DataFrame:
        """Create market regime features (VECTORIZED) with confidence scores"""
        features = pd.DataFrame(index=bars.index)

        # Calculate regime series with confidence scores (RECOMMENDED for ML)
        # Use continuous confidence scores instead of binary one-hot
        try:
            regime_series = self.regime_detector.detect_series(
                bars,
                use_confidence_scores=True  # Use continuous scores for better ML features
            )
            features = pd.concat([features, regime_series], axis=1)

        except Exception:
            # If calculation fails, fill with zeros
            # Confidence score columns (continuous 0~1)
            for col in ['regime_trending_up_score', 'regime_trending_down_score',
                       'regime_ranging_score', 'regime_high_vol_score', 'regime_breakout_score',
                       'regime_confidence', 'regime_trend_strength', 'regime_volatility',
                       'regime_mean_reversion', 'regime_volume_strength']:
                features[col] = 0.0

        return features

    def _create_time_features(self, bars: pd.DataFrame) -> pd.DataFrame:
        """Create time-based features with adaptive handling for different timeframes"""
        features = pd.DataFrame(index=bars.index)

        # Extract time components
        hour = bars.index.hour
        day_of_week = bars.index.dayofweek
        month = bars.index.month

        # Only add hour features if data has hourly variation (not daily data)
        hour_unique = len(np.unique(hour))
        if hour_unique > 1:  # Hourly or minute data
            features['hour_sin'] = np.sin(2 * np.pi * hour / 24)
            features['hour_cos'] = np.cos(2 * np.pi * hour / 24)

        # Day of week features (useful for all timeframes)
        day_unique = len(np.unique(day_of_week))
        if day_unique > 1:
            features['day_sin'] = np.sin(2 * np.pi * day_of_week / 7)
            features['day_cos'] = np.cos(2 * np.pi * day_of_week / 7)

        # Month features for longer timeframes (daily+)
        month_unique = len(np.unique(month))
        if month_unique > 1:
            features['month_sin'] = np.sin(2 * np.pi * month / 12)
            features['month_cos'] = np.cos(2 * np.pi * month / 12)

        return features

    def _create_lag_features(self, bars: pd.DataFrame) -> pd.DataFrame:
        """Create lagged features"""
        features = pd.DataFrame(index=bars.index)

        # Price returns
        returns = bars['close'].pct_change()

        for lag in self.lag_periods:
            features[f'return_lag_{lag}'] = returns.shift(lag)
            features[f'volume_lag_{lag}'] = bars['volume'].shift(lag) / (bars['volume'].rolling(20).mean() + 1e-10)

        return features

    def _create_rolling_features(self, bars: pd.DataFrame) -> pd.DataFrame:
        """Create rolling window statistics"""
        features = pd.DataFrame(index=bars.index)

        returns = bars['close'].pct_change()

        for window in self.rolling_windows:
            # Return statistics
            features[f'return_mean_{window}'] = returns.rolling(window).mean()
            features[f'return_std_{window}'] = returns.rolling(window).std()
            features[f'return_skew_{window}'] = returns.rolling(window).skew()

            # Volume statistics
            features[f'volume_mean_{window}'] = bars['volume'].rolling(window).mean()
            features[f'volume_std_{window}'] = bars['volume'].rolling(window).std()

        return features

    def _create_target(self, bars: pd.DataFrame) -> pd.Series:
        """
        Create target variable (forward returns)

        Prevents data leakage by using future data only for target
        """
        returns = bars['close'].pct_change()

        # Forward return
        target = returns.shift(-self.forward_periods)

        # Remove NaN values
        target = target.dropna()

        return target

    def _normalize_features(self, features: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize features using z-score normalization with robust handling

        If fitted, use stored statistics
        Otherwise, fit and store statistics

        Improvements:
        - Handle zero/near-zero standard deviation
        - Skip normalization for constant features
        - Add min variance threshold
        """
        if not self.is_fitted:
            # Fit: calculate mean and std
            self.feature_means = features.mean()
            self.feature_stds = features.std()
            self.is_fitted = True

        normalized = features.copy()

        for col in features.columns:
            mean = self.feature_means[col]
            std = self.feature_stds[col]

            # Skip normalization if std is too low (constant or near-constant feature)
            if std < 1e-8:
                # Keep original values for constant features
                # They will be filtered out by feature selection
                continue

            # Z-score normalization with safe division
            normalized[col] = (features[col] - mean) / std

        return normalized

    def select_features(
        self,
        feature_set: FeatureSet,
        method: str = 'correlation',
    ) -> FeatureSet:
        """
        Select important features

        Parameters:
            feature_set: Input feature set
            method: Selection method ('correlation', 'variance', 'all')

        Returns:
            FeatureSet with selected features
        """
        if method == 'all':
            return feature_set

        features = feature_set.features.copy()
        target = feature_set.target

        if method == 'correlation' and target is not None:
            # Remove features with low correlation to target
            correlations = features.corrwith(target).abs()
            selected = correlations[correlations > self.min_correlation].index.tolist()

            features = features[selected]

        elif method == 'variance':
            # Remove low variance features
            variances = features.var()
            selected = variances[variances > 1e-6].index.tolist()

            features = features[selected]

        return FeatureSet(
            features=features,
            target=target,
            feature_names=list(features.columns),
            metadata={
                **feature_set.metadata,
                'feature_selection': method,
                'selected_features': len(features.columns),
                'removed_features': len(feature_set.features.columns) - len(features.columns),
            }
        )

    # Helper methods

    @staticmethod
    def _calculate_rsi(bars: pd.DataFrame, period: int) -> pd.Series:
        """Calculate RSI"""
        close = bars['close']
        delta = close.diff()

        gains = delta.where(delta > 0, 0)
        losses = -delta.where(delta < 0, 0)

        avg_gains = gains.rolling(period).mean()
        avg_losses = losses.rolling(period).mean()

        rs = avg_gains / (avg_losses + 1e-10)
        rsi = 100 - (100 / (1 + rs))

        return rsi

    @staticmethod
    def _calculate_atr_normalized(bars: pd.DataFrame, period: int) -> pd.Series:
        """Calculate normalized ATR"""
        high = bars['high']
        low = bars['low']
        close = bars['close']

        tr1 = high - low
        tr2 = (high - close.shift(1)).abs()
        tr3 = (low - close.shift(1)).abs()

        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.rolling(period).mean()

        # Normalize by close price
        atr_normalized = atr / (close + 1e-10)

        return atr_normalized

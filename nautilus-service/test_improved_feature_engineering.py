"""
Test Improved Feature Engineering Pipeline

개선된 Feature Engineering 파이프라인을 실제 데이터로 테스트합니다.

개선 사항:
1. Market Regime Detection 임계값 조정 (crypto 특성 반영)
2. Normalization 개선 (0 표준편차 처리)
3. Signal Validator 추가 (품질 검증)
4. 더 상세한 로깅 및 분석
"""

import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import numpy as np
from datetime import datetime

from app.core.backtest_runner import download_binance_data
from app.core.ml.feature_engineering import FeatureEngineer
from app.core.factors.signal_validator import SignalValidator, print_feature_quality_report

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def print_feature_statistics(features: pd.DataFrame, title: str = "Feature Statistics"):
    """피처 통계 출력"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)
    print(f"Shape: {features.shape}")
    print(f"Features: {len(features.columns)}")
    print(f"Samples: {len(features)}")
    print(f"Date Range: {features.index[0]} to {features.index[-1]}")

    # 기본 통계
    print("\n" + "-"*80)
    print("  Basic Statistics")
    print("-"*80)
    print(features.describe().T[['mean', 'std', 'min', 'max']])

    # NaN 비율
    nan_ratios = features.isna().sum() / len(features)
    if nan_ratios.max() > 0:
        print("\n" + "-"*80)
        print("  NaN Ratios")
        print("-"*80)
        print(nan_ratios[nan_ratios > 0].sort_values(ascending=False))

    # 상수 피처 감지
    constant_features = []
    for col in features.columns:
        if features[col].std() < 1e-6:
            constant_features.append(col)

    if constant_features:
        print("\n" + "-"*80)
        print(f"  [WARNING] Constant Features Detected ({len(constant_features)})")
        print("-"*80)
        for col in constant_features:
            print(f"  - {col}: std={features[col].std():.2e}, unique={features[col].nunique()}")

    print("="*80 + "\n")


def analyze_regime_detection(features: pd.DataFrame):
    """Regime detection 분석 (Confidence Score 기반)"""
    print("\n" + "="*80)
    print("  Market Regime Detection Analysis (Confidence Score)")
    print("="*80)

    regime_cols = [col for col in features.columns if col.startswith('regime_')]

    if not regime_cols:
        print("[!] No regime features found!")
        return

    # Regime confidence score 분포
    regime_score_cols = [
        'regime_trending_up_score',
        'regime_trending_down_score',
        'regime_ranging_score',
        'regime_high_vol_score',
        'regime_breakout_score'
    ]

    print("\n" + "-"*80)
    print("  Regime Confidence Score Distribution")
    print("-"*80)

    for regime_col in regime_score_cols:
        if regime_col in features.columns:
            scores = features[regime_col]
            # Count non-zero scores (regime was detected)
            detected_count = (scores > 0).sum()
            detected_ratio = detected_count / len(features)
            # Average confidence when detected
            avg_confidence = scores[scores > 0].mean() if detected_count > 0 else 0
            max_confidence = scores.max()

            bar = "#" * int(detected_ratio * 50)
            print(f"{regime_col:30s} detected={detected_count:4.0f} ({detected_ratio:5.1%}) "
                  f"avg_conf={avg_confidence:.3f} max={max_confidence:.3f} {bar}")

    # Regime metrics 통계
    print("\n" + "-"*80)
    print("  Regime Metrics")
    print("-"*80)

    metric_cols = [
        'regime_confidence',
        'regime_trend_strength',
        'regime_volatility',
        'regime_mean_reversion',
        'regime_volume_strength'
    ]

    for metric in metric_cols:
        if metric in features.columns:
            mean_val = features[metric].mean()
            std_val = features[metric].std()
            min_val = features[metric].min()
            max_val = features[metric].max()
            print(f"{metric:25s} mean={mean_val:.3f} std={std_val:.3f} range=[{min_val:.3f}, {max_val:.3f}]")

    print("="*80 + "\n")


def analyze_signal_components(features: pd.DataFrame):
    """개별 신호 컴포넌트 분석"""
    print("\n" + "="*80)
    print("  Signal Component Analysis")
    print("="*80)

    # Technical signals
    tech_cols = [col for col in features.columns if col.startswith('tech_')]
    if tech_cols:
        print("\n[Technical Signals]:")
        for col in tech_cols:
            mean_val = features[col].mean()
            std_val = features[col].std()
            unique_count = features[col].nunique()
            print(f"  {col:30s} mean={mean_val:7.4f} std={std_val:7.4f} unique={unique_count:5d}")

    # Microstructure signals
    micro_cols = [col for col in features.columns if col.startswith('micro_')]
    if micro_cols:
        print("\n[Microstructure Signals]:")
        for col in micro_cols:
            mean_val = features[col].mean()
            std_val = features[col].std()
            unique_count = features[col].nunique()
            print(f"  {col:30s} mean={mean_val:7.4f} std={std_val:7.4f} unique={unique_count:5d}")

    print("="*80 + "\n")


async def test_improved_pipeline_1h():
    """1시간봉 데이터로 개선된 파이프라인 테스트"""

    logger.info("Testing improved feature engineering pipeline with 1h data...")

    # Download data
    symbol = "BTCUSDT"
    interval = "1h"
    days = 60  # 2 months

    logger.info(f"Downloading {symbol} {interval} data for {days} days...")
    df = await download_binance_data(
        symbol=symbol,
        interval=interval,
        days=days
    )

    logger.info(f"Downloaded {len(df)} bars")

    # Create feature engineer
    engineer = FeatureEngineer(
        # Longer periods for more stability
        ema_fast=20,
        ema_slow=50,
        rsi_period=14,
        orderbook_levels=10,
        volume_window=24,  # 24 hours
        adx_period=14,
        lag_periods=[1, 3, 6, 12, 24],  # 1h, 3h, 6h, 12h, 24h
        rolling_windows=[6, 12, 24, 48],  # 6h, 12h, 24h, 48h
    )

    # Create features
    logger.info("Creating features...")
    feature_set = engineer.create_features(
        bars=df,
        include_target=True,
        normalize=False  # 먼저 정규화 없이 테스트
    )

    logger.info(f"Created {len(feature_set.features.columns)} features")

    # 1. 기본 통계
    print_feature_statistics(feature_set.features, "Raw Features (Before Normalization)")

    # 2. Regime detection 분석
    analyze_regime_detection(feature_set.features)

    # 3. 신호 컴포넌트 분석
    analyze_signal_components(feature_set.features)

    # 4. Signal validation
    logger.info("Validating signal quality...")
    validator = SignalValidator(
        min_std_threshold=1e-6,
        min_variance_ratio=1e-4,
    )

    validation_results = validator.validate_features(feature_set.features)
    print_feature_quality_report(validation_results)

    # 5. Remove invalid features
    clean_features, removed_features = validator.remove_invalid_features(feature_set.features)

    if removed_features:
        print("\n" + "="*80)
        print(f"  [X] Removed {len(removed_features)} Invalid Features")
        print("="*80)
        for feat in removed_features:
            print(f"  - {feat}")
        print("="*80 + "\n")

    # 6. Test normalization with cleaned features
    logger.info("Testing normalization with cleaned features...")
    feature_set_clean = engineer.create_features(
        bars=df,
        include_target=True,
        normalize=True
    )

    # Remove invalid features from normalized
    clean_normalized, _ = validator.remove_invalid_features(feature_set_clean.features)

    print_feature_statistics(clean_normalized, "Normalized Features (After Cleaning)")

    # 7. Feature selection
    logger.info("Testing feature selection...")
    feature_set_clean.features = clean_normalized
    selected_feature_set = engineer.select_features(
        feature_set_clean,
        method='variance'
    )

    print("\n" + "="*80)
    print("  Feature Selection Results")
    print("="*80)
    print(f"Original features: {len(feature_set.features.columns)}")
    print(f"After validation: {len(clean_features.columns)}")
    print(f"After selection: {len(selected_feature_set.features.columns)}")
    print(f"Removed by validation: {len(removed_features)}")
    print(f"Removed by selection: {len(clean_features.columns) - len(selected_feature_set.features.columns)}")
    print("="*80 + "\n")

    return feature_set, clean_normalized, selected_feature_set


async def test_improved_pipeline_daily():
    """일봉 데이터로 개선된 파이프라인 테스트"""

    logger.info("Testing improved feature engineering pipeline with daily data...")

    # Download data
    symbol = "BTCUSDT"
    interval = "1d"
    days = 365  # 1 year

    logger.info(f"Downloading {symbol} {interval} data for {days} days...")
    df = await download_binance_data(
        symbol=symbol,
        interval=interval,
        days=days
    )

    logger.info(f"Downloaded {len(df)} bars")

    # Create feature engineer
    engineer = FeatureEngineer(
        ema_fast=12,
        ema_slow=26,
        rsi_period=14,
        lag_periods=[1, 2, 3, 5, 10],  # 1-10 days
        rolling_windows=[5, 10, 20, 30],  # 5-30 days
    )

    # Create features
    logger.info("Creating features...")
    feature_set = engineer.create_features(
        bars=df,
        include_target=True,
        normalize=True
    )

    logger.info(f"Created {len(feature_set.features.columns)} features")

    # Analysis
    print_feature_statistics(feature_set.features, "Daily Features (Normalized)")
    analyze_regime_detection(feature_set.features)
    analyze_signal_components(feature_set.features)

    # Validation
    validator = SignalValidator()
    validation_results = validator.validate_features(feature_set.features)
    print_feature_quality_report(validation_results)

    # Clean features
    clean_features, removed = validator.remove_invalid_features(feature_set.features)

    print("\n" + "="*80)
    print("  Summary")
    print("="*80)
    print(f"Total features: {len(feature_set.features.columns)}")
    print(f"Valid features: {len(clean_features.columns)}")
    print(f"Invalid features: {len(removed)}")
    print(f"Quality rate: {len(clean_features.columns)/len(feature_set.features.columns):.1%}")
    print("="*80 + "\n")

    return feature_set, clean_features


async def compare_before_after():
    """개선 전후 비교"""

    print("\n" + "="*80)
    print("  BEFORE vs AFTER Comparison")
    print("="*80)

    symbol = "BTCUSDT"
    interval = "1h"
    days = 30

    df = await download_binance_data(symbol=symbol, interval=interval, days=days)

    # BEFORE: 기본 설정
    engineer_before = FeatureEngineer()
    features_before = engineer_before.create_features(df, normalize=True)

    # AFTER: 개선된 설정
    engineer_after = FeatureEngineer(
        ema_fast=20,
        ema_slow=50,
        lag_periods=[1, 3, 6, 12, 24],
        rolling_windows=[6, 12, 24, 48],
    )
    features_after = engineer_after.create_features(df, normalize=True)

    validator = SignalValidator()

    # Validation
    results_before = validator.validate_features(features_before.features)
    results_after = validator.validate_features(features_after.features)

    valid_before = sum(1 for r in results_before.values() if r.is_valid)
    valid_after = sum(1 for r in results_after.values() if r.is_valid)

    # Regime detection
    regime_before = features_before.features[[c for c in features_before.features.columns if c.startswith('regime_')]].sum()
    regime_after = features_after.features[[c for c in features_after.features.columns if c.startswith('regime_')]].sum()

    print("\n[Feature Quality]:")
    print(f"  BEFORE: {valid_before}/{len(results_before)} valid ({valid_before/len(results_before):.1%})")
    print(f"  AFTER:  {valid_after}/{len(results_after)} valid ({valid_after/len(results_after):.1%})")
    print(f"  Improvement: +{valid_after - valid_before} features")

    print("\n[Regime Detection]:")
    print(f"  BEFORE ranging count: {regime_before.get('regime_ranging', 0):.0f}")
    print(f"  AFTER ranging count:  {regime_after.get('regime_ranging', 0):.0f}")

    for regime in ['regime_trending_up', 'regime_trending_down', 'regime_high_vol', 'regime_breakout']:
        before_val = regime_before.get(regime, 0)
        after_val = regime_after.get(regime, 0)
        if after_val > before_val:
            print(f"  [OK] {regime}: {before_val:.0f} -> {after_val:.0f} (+{after_val-before_val:.0f})")

    print("="*80 + "\n")


async def main():
    """Run all tests"""

    logger.info("="*80)
    logger.info("  Improved Feature Engineering Pipeline Tests")
    logger.info("="*80)

    try:
        # Test 1: 1-hour data (detailed analysis)
        logger.info("\n[Test 1: 1-Hour Data Analysis]")
        await test_improved_pipeline_1h()

        # Test 2: Daily data
        logger.info("\n[Test 2: Daily Data Analysis]")
        await test_improved_pipeline_daily()

        # Test 3: Before/After comparison
        logger.info("\n[Test 3: Before vs After Comparison]")
        await compare_before_after()

        logger.info("\n" + "="*80)
        logger.info("  [SUCCESS] All tests completed successfully!")
        logger.info("="*80)

    except Exception as e:
        logger.error(f"Test failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

"""
Signal Validator Module

Feature Engineering 파이프라인의 신호 품질을 검증하는 모듈.
상수값, 낮은 변동성, 이상치 등을 감지합니다.

Quality Checks:
- Constant Detection: 변동성이 없는 상수 신호 감지
- Low Variance: 정보가 부족한 저변동 신호 감지
- Outlier Detection: 이상치 감지
- NaN/Inf Check: 결측치 및 무한대 값 검사
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
import logging

logger = logging.getLogger(__name__)


@dataclass
class SignalQuality:
    """신호 품질 평가 결과"""
    is_valid: bool
    issues: List[str]
    metrics: Dict[str, float]

    def to_dict(self) -> Dict:
        return {
            'is_valid': self.is_valid,
            'issues': self.issues,
            'metrics': self.metrics,
        }


class SignalValidator:
    """
    신호 품질 검증기

    Feature Engineering에서 생성된 신호의 품질을 검증:
    - 상수 신호 감지
    - 낮은 변동성 감지
    - 이상치 감지
    - NaN/Inf 검사
    """

    def __init__(
        self,
        # Variance thresholds
        min_std_threshold: float = 1e-6,  # 최소 표준편차
        min_variance_ratio: float = 1e-4,  # 최소 변동성 비율
        # Outlier thresholds
        outlier_std_multiplier: float = 5.0,  # 이상치 판단 기준 (표준편차 배수)
        max_outlier_ratio: float = 0.05,  # 최대 허용 이상치 비율
        # NaN thresholds
        max_nan_ratio: float = 0.1,  # 최대 허용 NaN 비율
    ):
        """
        Initialize signal validator

        Parameters:
            min_std_threshold: 최소 표준편차 (이하면 상수로 판단)
            min_variance_ratio: 최소 변동성 비율
            outlier_std_multiplier: 이상치 판단 기준 (평균 ± N*std)
            max_outlier_ratio: 허용 가능한 이상치 비율
            max_nan_ratio: 허용 가능한 NaN 비율
        """
        self.min_std_threshold = min_std_threshold
        self.min_variance_ratio = min_variance_ratio
        self.outlier_std_multiplier = outlier_std_multiplier
        self.max_outlier_ratio = max_outlier_ratio
        self.max_nan_ratio = max_nan_ratio

    def validate_signal(
        self,
        signal: pd.Series,
        signal_name: str = "signal"
    ) -> SignalQuality:
        """
        단일 신호의 품질 검증

        Parameters:
            signal: 검증할 신호 Series
            signal_name: 신호 이름 (로깅용)

        Returns:
            SignalQuality 객체
        """
        issues = []
        metrics = {}

        # 1. NaN/Inf 검사
        nan_ratio = signal.isna().sum() / len(signal)
        inf_ratio = np.isinf(signal).sum() / len(signal)

        metrics['nan_ratio'] = nan_ratio
        metrics['inf_ratio'] = inf_ratio

        if nan_ratio > self.max_nan_ratio:
            issues.append(f"High NaN ratio: {nan_ratio:.2%}")

        if inf_ratio > 0:
            issues.append(f"Contains Inf values: {inf_ratio:.2%}")

        # NaN/Inf 제거 후 분석
        clean_signal = signal.replace([np.inf, -np.inf], np.nan).dropna()

        if len(clean_signal) == 0:
            return SignalQuality(
                is_valid=False,
                issues=["Signal is all NaN/Inf"],
                metrics=metrics
            )

        # 2. 상수 검사
        std = clean_signal.std()
        mean = clean_signal.mean()

        metrics['std'] = std
        metrics['mean'] = mean

        if std < self.min_std_threshold:
            issues.append(f"Constant signal: std={std:.2e} < {self.min_std_threshold:.2e}")

        # 3. 낮은 변동성 검사
        if abs(mean) > 1e-10:
            variance_ratio = std / abs(mean)
            metrics['variance_ratio'] = variance_ratio

            if variance_ratio < self.min_variance_ratio:
                issues.append(f"Low variance: CV={variance_ratio:.2e} < {self.min_variance_ratio:.2e}")

        # 4. 이상치 검사
        outlier_threshold = self.outlier_std_multiplier * std
        outliers = (clean_signal - mean).abs() > outlier_threshold
        outlier_ratio = outliers.sum() / len(clean_signal)

        metrics['outlier_ratio'] = outlier_ratio
        metrics['outlier_threshold'] = outlier_threshold

        if outlier_ratio > self.max_outlier_ratio:
            issues.append(f"High outlier ratio: {outlier_ratio:.2%} > {self.max_outlier_ratio:.2%}")

        # 5. 정보량 검사 (unique values) - Binary/Categorical 예외 처리
        unique_count = len(clean_signal.unique())
        unique_ratio = unique_count / len(clean_signal)
        metrics['unique_ratio'] = unique_ratio
        metrics['unique_count'] = unique_count

        # Binary/Categorical 피처는 unique ratio 체크 제외
        # One-hot encoding (0/1) 또는 small categorical은 정상적인 피처
        is_binary = unique_count == 2
        is_categorical = 2 < unique_count <= 10

        # Binary는 분포 체크: 한쪽으로 너무 치우치지 않았는지
        if is_binary:
            value_counts = clean_signal.value_counts(normalize=True)
            min_proportion = value_counts.min()

            # 최소 비율이 0.5% 미만이면 거의 상수
            if min_proportion < 0.005:
                issues.append(f"Binary feature too imbalanced: {min_proportion:.2%} minority class")

        # Small categorical (3-10 unique)도 분포 체크
        elif is_categorical:
            value_counts = clean_signal.value_counts(normalize=True)
            min_proportion = value_counts.min()

            if min_proportion < 0.003:  # 0.3% 미만
                issues.append(f"Categorical feature too imbalanced: {min_proportion:.2%} minority class")

        # Continuous 피처만 unique ratio 체크
        elif unique_count > 10 and unique_ratio < 0.01:
            issues.append(f"Low information: only {unique_ratio:.2%} unique values")

        # 결과 판단
        is_valid = len(issues) == 0

        if not is_valid:
            logger.warning(f"Signal '{signal_name}' validation failed: {', '.join(issues)}")

        return SignalQuality(
            is_valid=is_valid,
            issues=issues,
            metrics=metrics
        )

    def validate_features(
        self,
        features: pd.DataFrame,
        raise_on_invalid: bool = False,
    ) -> Dict[str, SignalQuality]:
        """
        전체 피처 DataFrame 검증

        Parameters:
            features: 피처 DataFrame
            raise_on_invalid: 유효하지 않은 피처 발견 시 예외 발생 여부

        Returns:
            각 피처별 SignalQuality 딕셔너리
        """
        results = {}
        invalid_features = []

        for col in features.columns:
            quality = self.validate_signal(features[col], signal_name=col)
            results[col] = quality

            if not quality.is_valid:
                invalid_features.append(col)

        # 요약 로깅
        total_features = len(features.columns)
        valid_features = total_features - len(invalid_features)

        logger.info(
            f"Feature validation complete: "
            f"{valid_features}/{total_features} valid features "
            f"({valid_features/total_features:.1%})"
        )

        if invalid_features:
            logger.warning(f"Invalid features detected: {', '.join(invalid_features)}")

            if raise_on_invalid:
                raise ValueError(
                    f"Feature validation failed for: {', '.join(invalid_features)}"
                )

        return results

    def remove_invalid_features(
        self,
        features: pd.DataFrame,
    ) -> Tuple[pd.DataFrame, List[str]]:
        """
        유효하지 않은 피처 제거

        Parameters:
            features: 피처 DataFrame

        Returns:
            (정제된 DataFrame, 제거된 피처 리스트)
        """
        validation_results = self.validate_features(features)

        # 유효한 피처만 선택
        valid_features = [
            col for col, quality in validation_results.items()
            if quality.is_valid
        ]

        removed_features = [
            col for col in features.columns
            if col not in valid_features
        ]

        if removed_features:
            logger.info(f"Removing {len(removed_features)} invalid features")

        return features[valid_features], removed_features

    def log_signal_statistics(self, signal: pd.Series, name: str = "signal") -> None:
        """
        신호 통계 정보 로깅 (디버깅용)

        Parameters:
            signal: 신호 Series
            name: 신호 이름
        """
        clean_signal = signal.dropna()

        if len(clean_signal) == 0:
            logger.warning(f"{name}: All NaN")
            return

        logger.info(f"\n{name} Statistics:")
        logger.info(f"  Count: {len(signal)} (valid: {len(clean_signal)})")
        logger.info(f"  Mean: {clean_signal.mean():.6f}")
        logger.info(f"  Std: {clean_signal.std():.6f}")
        logger.info(f"  Min: {clean_signal.min():.6f}")
        logger.info(f"  Max: {clean_signal.max():.6f}")
        logger.info(f"  Unique values: {len(clean_signal.unique())} ({len(clean_signal.unique())/len(clean_signal):.2%})")
        logger.info(f"  NaN ratio: {signal.isna().sum()/len(signal):.2%}")


def print_feature_quality_report(
    validation_results: Dict[str, SignalQuality]
) -> None:
    """
    피처 품질 보고서 출력

    Parameters:
        validation_results: validate_features() 결과
    """
    print("\n" + "="*80)
    print("  Feature Quality Report")
    print("="*80)

    # 유효/무효 피처 분류
    valid_features = [name for name, quality in validation_results.items() if quality.is_valid]
    invalid_features = [name for name, quality in validation_results.items() if not quality.is_valid]

    print(f"\n[OK] Valid Features: {len(valid_features)}/{len(validation_results)}")
    print(f"[X] Invalid Features: {len(invalid_features)}/{len(validation_results)}")

    # 무효 피처 상세 정보
    if invalid_features:
        print("\n" + "-"*80)
        print("  Invalid Features Details")
        print("-"*80)

        for name in invalid_features:
            quality = validation_results[name]
            print(f"\n{name}:")
            for issue in quality.issues:
                print(f"  - {issue}")
            print(f"  Metrics: {quality.metrics}")

    # 전체 통계
    print("\n" + "-"*80)
    print("  Overall Statistics")
    print("-"*80)

    all_stds = [q.metrics.get('std', 0) for q in validation_results.values()]
    all_nan_ratios = [q.metrics.get('nan_ratio', 0) for q in validation_results.values()]
    all_unique_ratios = [q.metrics.get('unique_ratio', 0) for q in validation_results.values()]

    print(f"Std Dev Range: [{min(all_stds):.2e}, {max(all_stds):.2e}]")
    print(f"NaN Ratio Range: [{min(all_nan_ratios):.2%}, {max(all_nan_ratios):.2%}]")
    print(f"Unique Ratio Range: [{min(all_unique_ratios):.2%}, {max(all_unique_ratios):.2%}]")

    print("="*80 + "\n")

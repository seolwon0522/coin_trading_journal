"""
Machine Learning Module

ML-based prediction and optimization:
- Feature Engineering
- Prediction Models (XGBoost, LightGBM)
- Model Calibration
- Online Learning
"""

from .feature_engineering import FeatureEngineer, FeatureSet

__all__ = [
    'FeatureEngineer',
    'FeatureSet',
]

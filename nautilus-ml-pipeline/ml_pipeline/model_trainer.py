"""
ML 모델 훈련 및 관리
- XGBoost 모델 훈련
- 하이퍼파라미터 최적화
- 모델 성능 평가 및 저장
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import logging
from pathlib import Path
import yaml
import joblib

from sklearn.model_selection import train_test_split, TimeSeriesSplit, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.pipeline import Pipeline
import xgboost as xgb
import optuna

logger = logging.getLogger(__name__)

class MLModelTrainer:
    """ML 모델 훈련기"""
    
    def __init__(self, config_path: str = "config/ml_config.yaml"):
        """
        모델 훈련기 초기화
        
        Args:
            config_path: ML 설정 파일 경로
        """
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = yaml.safe_load(f)
        
        self.feature_columns = self.config['data']['features']
        self.target_column = self.config['data']['target']
        self.model_config = self.config['model']
        
        self.model = None
        self.scaler = None
        self.feature_importance = {}
        self.training_metrics = {}
        
    def train_model(self, data_path: str, save_model: bool = True) -> Dict:
        """
        모델 훈련 실행
        
        Args:
            data_path: 훈련 데이터 파일 경로
            save_model: 모델 저장 여부
            
        Returns:
            훈련 결과 메트릭
        """
        # 한글 주석: 데이터 로드 및 준비
        X, y = self._load_and_prepare_data(data_path)
        
        # 한글 주석: 표본 부족 시 훈련 스킵
        if len(X) < 5:
            logger.warning("표본이 너무 적어 훈련을 스킵합니다.")
            return {
                'train_rmse': None,
                'test_rmse': None,
                'train_r2': None,
                'test_r2': None,
                'overfit_ratio': 0.0,
                'model_path': None,
                'r2_score': 0.0
            }
        
        # 한글 주석: 훈련/테스트 분할
        X_train, X_test, y_train, y_test = self._split_data(X, y)
        
        # 한글 주석: 모델 훈련
        if self.model_config.get('auto_tuning', {}).get('enabled', False):
            best_params = self._optimize_hyperparameters(X_train, y_train)
            model = self._create_model(best_params)
        else:
            model = self._create_model()
        
        # 한글 주석: 파이프라인 생성 및 훈련
        pipeline = self._create_pipeline(model)
        pipeline.fit(X_train, y_train)
        
        # 한글 주석: 모델 평가
        metrics = self._evaluate_model(pipeline, X_test, y_test, X_train, y_train)
        
        # 한글 주석: 피처 중요도 저장
        self._extract_feature_importance(pipeline)
        
        # 한글 주석: 모델 저장
        if save_model:
            model_path = self._save_model(pipeline, metrics)
            metrics['model_path'] = model_path
        
        self.model = pipeline
        self.training_metrics = metrics
        
        logger.info(f"모델 훈련 완료 - R²: {metrics['test_r2']:.4f}, RMSE: {metrics['test_rmse']:.4f}")
        return metrics
    
    def _load_and_prepare_data(self, data_path: str) -> Tuple[pd.DataFrame, pd.Series]:
        """데이터 로드 및 준비"""
        # 한글 주석: 성능 최적화 - 필요한 컬럼만 로드
        required_columns = self.feature_columns + [self.target_column]
        
        try:
            # 한글 주석: 대용량 데이터 처리를 위한 청크 로딩 또는 샘플링
            df = pd.read_csv(data_path, usecols=required_columns, dtype='float32')
            
            # 한글 주석: 메모리 절약을 위해 너무 큰 데이터는 샘플링
            if len(df) > 50000:
                df = df.sample(n=50000, random_state=42)
                logger.info(f"데이터 샘플링: {len(df)}건으로 축소")
                
        except Exception as e:
            logger.warning(f"최적화된 로딩 실패, 기본 방식 사용: {e}")
            df = pd.read_csv(data_path)
        
        # 한글 주석: 피처 선택
        available_features = [col for col in self.feature_columns if col in df.columns]
        if len(available_features) != len(self.feature_columns):
            missing = set(self.feature_columns) - set(available_features)
            logger.warning(f"누락된 피처: {missing}")
        
        X = df[available_features].copy()
        y = df[self.target_column].copy()
        
        # 한글 주석: 결측값 처리 최적화
        X = X.fillna(X.median())
        
        logger.info(f"데이터 로드 완료: {len(X)}건, {len(available_features)}개 피처")
        return X, y
    
    def _split_data(self, X: pd.DataFrame, y: pd.Series) -> Tuple:
        """데이터 분할"""
        validation_config = self.config['data']['validation']
        test_size = validation_config.get('test_size', 0.2)
        min_train_size = validation_config.get('min_train_size', 100)
        
        if len(X) < min_train_size:
            logger.warning(f"데이터가 부족합니다: {len(X)} < {min_train_size}")
        
        # 한글 주석: 시계열 고려 여부
        if validation_config.get('time_series_split', False) and 'timestamp' in X.columns:
            # 시계열 분할 (최신 데이터를 테스트용으로)
            split_idx = int(len(X) * (1 - test_size))
            X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
            y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        else:
            # 무작위 분할
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42, shuffle=True
            )
        
        logger.info(f"데이터 분할 완료 - 훈련: {len(X_train)}건, 테스트: {len(X_test)}건")
        return X_train, X_test, y_train, y_test
    
    def _create_model(self, params: Optional[Dict] = None) -> xgb.XGBRegressor:
        """XGBoost 모델 생성"""
        if params is None:
            params = self.model_config['hyperparameters']
        
        return xgb.XGBRegressor(
            objective='reg:squarederror',
            **params
        )
    
    def _create_pipeline(self, model) -> Pipeline:
        """전처리 + 모델 파이프라인 생성"""
        return Pipeline([
            ('scaler', StandardScaler()),
            ('model', model)
        ])
    
    def _optimize_hyperparameters(self, X: pd.DataFrame, y: pd.Series) -> Dict:
        """하이퍼파라미터 최적화"""
        auto_config = self.model_config['auto_tuning']
        # 한글 주석: 성능 최적화 - 시행 횟수와 CV 폴드 수 줄임
        n_trials = min(auto_config.get('n_trials', 100), 20)  # 100회 → 20회로 단축
        cv_folds = min(auto_config.get('cv_folds', 5), 3)    # 5폴드 → 3폴드로 단축
        
        def objective(trial):
            # 한글 주석: 하이퍼파라미터 탐색 공간 정의
            params = {
                'n_estimators': trial.suggest_int('n_estimators', 100, 500),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'random_state': 42
            }
            
            model = self._create_model(params)
            pipeline = self._create_pipeline(model)
            
            # 한글 주석: 교차 검증으로 성능 평가
            scores = cross_val_score(pipeline, X, y, cv=cv_folds, 
                                   scoring='neg_root_mean_squared_error', n_jobs=-1)
            return -scores.mean()  # Optuna는 최소화를 목표로 함
        
        logger.info(f"하이퍼파라미터 최적화 시작: {n_trials}회 시도")
        # 한글 주석: 성능 최적화 - 로그 출력 억제
        study = optuna.create_study(direction='minimize')
        study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
        
        best_params = study.best_params
        logger.info(f"최적 파라미터: {best_params}")
        return best_params
    
    def _evaluate_model(self, model, X_test, y_test, X_train, y_train) -> Dict:
        """모델 성능 평가"""
        # 한글 주석: 예측 수행
        y_train_pred = model.predict(X_train)
        y_test_pred = model.predict(X_test)
        
        # 한글 주석: 성능 지표 계산
        metrics = {
            'train_rmse': float(np.sqrt(mean_squared_error(y_train, y_train_pred))),
            'test_rmse': float(np.sqrt(mean_squared_error(y_test, y_test_pred))),
            'train_mae': float(mean_absolute_error(y_train, y_train_pred)),
            'test_mae': float(mean_absolute_error(y_test, y_test_pred)),
            'train_r2': float(r2_score(y_train, y_train_pred)),
            'test_r2': float(r2_score(y_test, y_test_pred)),
            'train_size': len(X_train),
            'test_size': len(X_test),
            'training_date': datetime.now().isoformat()
        }
        
        # 한글 주석: 과적합 체크
        overfit_ratio = metrics['train_r2'] - metrics['test_r2']
        metrics['overfit_ratio'] = float(overfit_ratio)
        
        if overfit_ratio > 0.1:
            logger.warning(f"과적합 가능성: 훈련 R² {metrics['train_r2']:.4f} vs 테스트 R² {metrics['test_r2']:.4f}")
        
        return metrics
    
    def _extract_feature_importance(self, pipeline):
        """피처 중요도 추출"""
        model = pipeline.named_steps['model']
        
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            feature_names = self.feature_columns[:len(importances)]
            
            self.feature_importance = {
                name: float(importance) 
                for name, importance in zip(feature_names, importances)
            }
            
            # 한글 주석: 중요도 순으로 정렬
            sorted_features = sorted(self.feature_importance.items(), 
                                   key=lambda x: x[1], reverse=True)
            
            logger.info("피처 중요도 (상위 5개):")
            for name, importance in sorted_features[:5]:
                logger.info(f"  {name}: {importance:.4f}")
    
    def _save_model(self, model, metrics: Dict) -> str:
        """모델 저장"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_path = f"data/models/xgb_model_{timestamp}.pkl"
        
        # 한글 주석: 모델 저장
        joblib.dump(model, model_path)
        
        # 한글 주석: 메타데이터 저장
        metadata = {
            'model_path': model_path,
            'feature_columns': self.feature_columns,
            'feature_importance': self.feature_importance,
            'training_metrics': metrics,
            'model_config': self.model_config
        }
        
        metadata_path = f"data/models/metadata_{timestamp}.json"
        import json
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        logger.info(f"모델 저장 완료: {model_path}")
        return model_path
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """예측 수행"""
        if self.model is None:
            raise ValueError("모델이 훈련되지 않았습니다")
        
        return self.model.predict(X)
    
    def get_model_info(self) -> Dict:
        """모델 정보 조회"""
        return {
            'feature_importance': self.feature_importance,
            'training_metrics': self.training_metrics,
            'feature_columns': self.feature_columns,
            'model_config': self.model_config
        }

class ModelManager:
    """모델 버전 관리"""
    
    def __init__(self, models_dir: str = "data/models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        
    def load_latest_model(self) -> Optional[Pipeline]:
        """최신 모델 로드"""
        model_files = list(self.models_dir.glob("xgb_model_*.pkl"))
        
        if not model_files:
            logger.warning("저장된 모델이 없습니다")
            return None
        
        # 한글 주석: 가장 최근 모델 선택
        latest_model = max(model_files, key=lambda x: x.stat().st_mtime)
        
        try:
            model = joblib.load(latest_model)
            logger.info(f"모델 로드 완료: {latest_model.name}")
            return model
        except Exception as e:
            logger.error(f"모델 로드 실패: {e}")
            return None
    
    def list_models(self) -> List[Dict]:
        """모델 목록 조회"""
        models = []
        for model_file in self.models_dir.glob("xgb_model_*.pkl"):
            try:
                # 한글 주석: 메타데이터 파일 찾기
                timestamp = model_file.stem.split('_')[-1]
                metadata_file = self.models_dir / f"metadata_{timestamp}.json"
                
                if metadata_file.exists():
                    import json
                    with open(metadata_file, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                    
                    models.append({
                        'model_path': str(model_file),
                        'timestamp': timestamp,
                        'metrics': metadata.get('training_metrics', {}),
                        'created_at': datetime.fromtimestamp(model_file.stat().st_mtime)
                    })
                    
            except Exception as e:
                logger.warning(f"모델 정보 로드 실패 {model_file}: {e}")
        
        # 한글 주석: 최신순 정렬
        return sorted(models, key=lambda x: x['created_at'], reverse=True)

def train_new_model(data_path: str) -> str:
    """새 모델 훈련"""
    trainer = MLModelTrainer()
    metrics = trainer.train_model(data_path)
    return metrics.get('model_path', '')

if __name__ == "__main__":
    # 한글 주석: 모델 훈련 단독 실행
    logging.basicConfig(level=logging.INFO)
    
    # 샘플 데이터로 테스트
    from data_processor import run_data_pipeline
    data_file = run_data_pipeline()
    model_path = train_new_model(data_file)
    print(f"모델 훈련 완료: {model_path}")

"""
대용량 데이터셋(1년치) 전용 ML 모델 훈련기
- 메모리 효율적인 배치 처리
- 점진적 학습 지원
- 고급 검증 및 모니터링
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Iterator
from datetime import datetime
import logging
from pathlib import Path
import yaml
import joblib
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import xgboost as xgb
import optuna
from concurrent.futures import ThreadPoolExecutor
import gc

logger = logging.getLogger(__name__)

class LargeDatasetTrainer:
    """대용량 데이터셋 전용 ML 훈련기"""
    
    def __init__(self, config_path: str = "config/ml_config.yaml"):
        """
        대용량 데이터 훈련기 초기화
        
        Args:
            config_path: ML 설정 파일 경로
        """
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = yaml.safe_load(f)
        
        self.feature_columns = self.config['data']['features']
        self.target_column = self.config['data']['target']
        self.model_config = self.config['model']
        
        # 한글 주석: 대용량 데이터 전용 설정
        self.large_config = self.model_config.get('large_dataset_config', {})
        self.batch_size = 10000  # 배치 크기
        self.memory_threshold = 0.8  # 메모리 사용률 임계값
        
        self.model = None
        self.scaler = None
        self.training_metrics = {}
        
    def train_large_model(
        self, 
        data_path: str, 
        save_model: bool = True,
        incremental: bool = False
    ) -> Dict:
        """
        대용량 데이터셋 모델 훈련
        
        Args:
            data_path: 훈련 데이터 파일 경로
            save_model: 모델 저장 여부
            incremental: 점진적 학습 여부
            
        Returns:
            훈련 결과 메트릭
        """
        logger.info(f"대용량 데이터셋 훈련 시작: {data_path}")
        
        try:
            # 한글 주석: 1단계 - 데이터 크기 및 메모리 체크
            data_info = self._check_data_size(data_path)
            logger.info(f"데이터 크기: {data_info['rows']:,}행, {data_info['size_mb']:.1f}MB")
            
            # 한글 주석: 2단계 - 배치 처리 여부 결정
            if data_info['size_mb'] > 500:  # 500MB 초과시 배치 처리
                logger.info("대용량 데이터 감지 - 배치 처리 모드 실행")
                return self._train_with_batching(data_path, save_model, incremental)
            else:
                logger.info("일반 크기 데이터 - 메모리 로딩 모드 실행")
                return self._train_in_memory(data_path, save_model)
                
        except Exception as e:
            logger.error(f"대용량 데이터셋 훈련 실패: {e}")
            return self._create_empty_metrics()
    
    def _check_data_size(self, data_path: str) -> Dict:
        """데이터 크기 체크"""
        file_path = Path(data_path)
        size_bytes = file_path.stat().st_size
        size_mb = size_bytes / (1024 * 1024)
        
        # 한글 주석: 행 수 추정 (헤더 읽어서 계산)
        sample_df = pd.read_csv(data_path, nrows=1000)
        estimated_rows = int(size_bytes / len(sample_df.to_csv()) * 1000)
        
        return {
            'size_mb': size_mb,
            'rows': estimated_rows,
            'columns': len(sample_df.columns)
        }
    
    def _train_with_batching(
        self, 
        data_path: str, 
        save_model: bool, 
        incremental: bool
    ) -> Dict:
        """배치 처리를 통한 대용량 데이터 훈련"""
        
        logger.info("배치 처리 모드로 훈련 시작")
        
        # 한글 주석: DMatrix 기반 배치 처리용 XGBoost 설정
        params = self._get_xgboost_params()
        
        # 한글 주석: 시계열 분할을 위한 메타데이터 로드
        meta_df = pd.read_csv(data_path, usecols=['timestamp'] if 'timestamp' in pd.read_csv(data_path, nrows=1).columns else None, nrows=10000)
        
        if 'timestamp' in meta_df.columns:
            train_batches, test_batches = self._create_time_based_batches(data_path)
        else:
            train_batches, test_batches = self._create_random_batches(data_path)
        
        # 한글 주석: 배치별 훈련 실행
        model_scores = []
        all_predictions = []
        all_actuals = []
        
        # 한글 주석: 첫 번째 배치로 초기 모델 훈련
        logger.info("초기 모델 훈련 중...")
        first_batch = next(iter(train_batches))
        X_train, y_train = self._load_batch_data(first_batch)
        
        # 한글 주석: 스케일러 피팅
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # 한글 주석: 초기 모델 생성
        dtrain = xgb.DMatrix(X_train_scaled, label=y_train)
        self.model = xgb.train(params, dtrain, num_boost_round=100)
        
        # 한글 주석: 나머지 배치들로 점진적 훈련
        for i, batch_data in enumerate(train_batches[1:], 1):
            logger.info(f"배치 {i+1}/{len(train_batches)} 훈련 중...")
            
            X_batch, y_batch = self._load_batch_data(batch_data)
            X_batch_scaled = self.scaler.transform(X_batch)
            
            # 한글 주석: 기존 모델에 추가 훈련
            dtrain_batch = xgb.DMatrix(X_batch_scaled, label=y_batch)
            
            if incremental:
                # 한글 주석: 점진적 학습
                self.model = xgb.train(
                    params, 
                    dtrain_batch, 
                    num_boost_round=50,
                    xgb_model=self.model
                )
            
            # 한글 주석: 메모리 정리
            del X_batch, y_batch, X_batch_scaled, dtrain_batch
            gc.collect()
        
        # 한글 주석: 테스트 배치로 평가
        logger.info("테스트 배치 평가 중...")
        for test_batch in test_batches:
            X_test, y_test = self._load_batch_data(test_batch)
            X_test_scaled = self.scaler.transform(X_test)
            
            dtest = xgb.DMatrix(X_test_scaled)
            y_pred = self.model.predict(dtest)
            
            all_predictions.extend(y_pred)
            all_actuals.extend(y_test)
            
            # 한글 주석: 메모리 정리
            del X_test, y_test, X_test_scaled, dtest
            gc.collect()
        
        # 한글 주석: 전체 성능 계산
        final_metrics = self._calculate_final_metrics(all_predictions, all_actuals)
        
        # 한글 주석: 모델 저장
        if save_model:
            model_path = self._save_large_model(final_metrics)
            final_metrics['model_path'] = model_path
        
        logger.info(f"배치 훈련 완료 - R²: {final_metrics['test_r2']:.4f}")
        return final_metrics
    
    def _train_in_memory(self, data_path: str, save_model: bool) -> Dict:
        """메모리 내 일반 훈련 (중간 크기 데이터용)"""
        
        # 한글 주석: 기존 모델 훈련기 로직 활용
        from ml_pipeline.model_trainer import MLModelTrainer
        
        trainer = MLModelTrainer()
        metrics = trainer.train_model(data_path, save_model)
        
        logger.info("메모리 내 훈련 완료")
        return metrics
    
    def _create_time_based_batches(self, data_path: str) -> Tuple[List, List]:
        """시계열 기반 배치 생성"""
        
        # 한글 주석: 타임스탬프 기반으로 시간순 분할
        df_timestamps = pd.read_csv(data_path, usecols=['timestamp'])
        df_timestamps['timestamp'] = pd.to_datetime(df_timestamps['timestamp'])
        
        # 한글 주석: 80/20 시계열 분할
        split_point = int(len(df_timestamps) * 0.8)
        
        train_indices = list(range(0, split_point, self.batch_size))
        test_indices = list(range(split_point, len(df_timestamps), self.batch_size))
        
        # 한글 주석: 배치 정보 생성
        train_batches = [(i, min(i + self.batch_size, split_point)) for i in train_indices]
        test_batches = [(i, min(i + self.batch_size, len(df_timestamps))) for i in test_indices]
        
        logger.info(f"시계열 배치 생성: 훈련 {len(train_batches)}개, 테스트 {len(test_batches)}개")
        return train_batches, test_batches
    
    def _create_random_batches(self, data_path: str) -> Tuple[List, List]:
        """랜덤 배치 생성"""
        
        # 한글 주석: 전체 행 수 계산
        total_rows = sum(1 for _ in open(data_path)) - 1  # 헤더 제외
        
        # 한글 주석: 80/20 분할
        train_size = int(total_rows * 0.8)
        
        # 한글 주석: 랜덤 인덱스 생성
        np.random.seed(42)
        all_indices = np.random.permutation(total_rows)
        train_indices = all_indices[:train_size]
        test_indices = all_indices[train_size:]
        
        # 한글 주석: 배치로 분할
        train_batches = [train_indices[i:i+self.batch_size] for i in range(0, len(train_indices), self.batch_size)]
        test_batches = [test_indices[i:i+self.batch_size] for i in range(0, len(test_indices), self.batch_size)]
        
        logger.info(f"랜덤 배치 생성: 훈련 {len(train_batches)}개, 테스트 {len(test_batches)}개")
        return train_batches, test_batches
    
    def _load_batch_data(self, batch_info) -> Tuple[np.ndarray, np.ndarray]:
        """배치 데이터 로드"""
        
        if isinstance(batch_info, tuple):
            # 한글 주석: 연속 인덱스 배치
            start_idx, end_idx = batch_info
            batch_df = pd.read_csv(data_path, skiprows=range(1, start_idx+1), nrows=end_idx-start_idx)
        else:
            # 한글 주석: 인덱스 리스트 배치
            batch_df = pd.read_csv(data_path, skiprows=lambda x: x not in batch_info and x != 0)
        
        # 한글 주석: 피처와 타겟 분리
        X = batch_df[self.feature_columns].values
        y = batch_df[self.target_column].values
        
        return X, y
    
    def _get_xgboost_params(self) -> Dict:
        """대용량 데이터용 XGBoost 파라미터"""
        
        base_params = self.large_config.copy() if self.large_config else {}
        
        # 한글 주석: 기본값 설정
        default_params = {
            'objective': 'reg:squarederror',
            'max_depth': 8,
            'learning_rate': 0.05,
            'n_estimators': 500,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'random_state': 42,
            'tree_method': 'hist',  # 메모리 효율적
            'max_bin': 256,
            'verbosity': 1
        }
        
        # 한글 주석: 설정 병합
        params = {**default_params, **base_params}
        return params
    
    def _calculate_final_metrics(self, predictions: List, actuals: List) -> Dict:
        """최종 성능 메트릭 계산"""
        
        y_pred = np.array(predictions)
        y_true = np.array(actuals)
        
        # 한글 주석: 성능 메트릭 계산
        r2 = r2_score(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        mae = mean_absolute_error(y_true, y_pred)
        
        # 한글 주석: 추가 메트릭
        mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
        
        return {
            'test_r2': r2,
            'test_rmse': rmse,
            'test_mae': mae,
            'test_mape': mape,
            'train_samples': len(predictions),
            'model_type': 'XGBoost_Large',
            'training_mode': 'batch_processing'
        }
    
    def _save_large_model(self, metrics: Dict) -> str:
        """대용량 모델 저장"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_path = f"data/models/large_model_{timestamp}.pkl"
        scaler_path = f"data/models/large_scaler_{timestamp}.pkl"
        
        # 한글 주석: 모델과 스케일러 저장
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)
        
        # 한글 주석: 메타데이터 저장
        metadata = {
            'model_path': model_path,
            'scaler_path': scaler_path,
            'metrics': metrics,
            'features': self.feature_columns,
            'target': self.target_column,
            'training_timestamp': timestamp,
            'model_type': 'large_dataset'
        }
        
        metadata_path = f"data/models/large_metadata_{timestamp}.json"
        import json
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"대용량 모델 저장: {model_path}")
        return model_path
    
    def _create_empty_metrics(self) -> Dict:
        """빈 메트릭 생성 (실패시)"""
        return {
            'test_r2': None,
            'test_rmse': None,
            'test_mae': None,
            'train_samples': 0,
            'model_path': None,
            'error': 'Training failed'
        }

def train_large_dataset(data_path: str, incremental: bool = False) -> Dict:
    """
    대용량 데이터셋 훈련 진입점
    
    Args:
        data_path: 훈련 데이터 경로
        incremental: 점진적 학습 여부
        
    Returns:
        훈련 결과 메트릭
    """
    trainer = LargeDatasetTrainer()
    return trainer.train_large_model(data_path, save_model=True, incremental=incremental)

if __name__ == "__main__":
    # 한글 주석: 대용량 데이터셋 훈련 테스트
    logging.basicConfig(level=logging.INFO)
    
    # 샘플 데이터로 테스트
    sample_data = "data/training_data/training_data_sample.csv"
    if Path(sample_data).exists():
        metrics = train_large_dataset(sample_data)
        print(f"대용량 훈련 완료: R² {metrics.get('test_r2', 'N/A')}")
    else:
        logger.info("샘플 데이터 파일이 없습니다")

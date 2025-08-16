"""
노틸러스 + ML 통합 파이프라인 메인 실행기
- 백테스팅 → ML 훈련 → 모델 업데이트 → 성능 평가
- 완전 자동화된 AI 거래 시스템
"""

import asyncio
import logging
from datetime import datetime
from pathlib import Path
import time

from nautilus_integration.backtest_runner import run_nautilus_backtest
from ml_pipeline.data_processor import MLDataPipeline
from ml_pipeline.model_trainer import MLModelTrainer, ModelManager
from ml_pipeline.scheduler import MLScheduler
from ml_pipeline.performance_monitor import PerformanceMonitor

# 한글 주석: 로깅 설정
# 로그 디렉토리 보장
Path('logs').mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/pipeline.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class IntegratedMLPipeline:
    """통합 ML 파이프라인"""
    
    def __init__(self):
        """파이프라인 초기화"""
        self.data_pipeline = MLDataPipeline()
        self.model_trainer = MLModelTrainer()
        self.model_manager = ModelManager()
        self.scheduler = MLScheduler()
        self.performance_monitor = PerformanceMonitor()
        
        self.total_trades = 0
        self.pipeline_runs = 0
        
    async def run_full_pipeline(self, 
                               symbol: str = "BTCUSDT", 
                               backtest_days: int = 30,
                               force_retrain: bool = False):
        """
        전체 파이프라인 실행
        
        Args:
            symbol: 거래 심볼
            backtest_days: 백테스팅 기간
            force_retrain: 강제 재훈련 여부
            
        Returns:
            실행 결과 요약
        """
        start_time = time.time()
        self.pipeline_runs += 1
        
        logger.info(f"통합 파이프라인 시작 #{self.pipeline_runs}")
        logger.info(f"심볼: {symbol}, 기간: {backtest_days}일")
        
        try:
            # 한글 주석: 1단계 - 노틸러스 백테스팅 실행
            logger.info("1단계: 노틸러스 백테스팅 실행")
            backtest_result = await self._run_backtest_step(symbol, backtest_days)
            
            # 한글 주석: 2단계 - 데이터 처리
            logger.info("2단계: 백테스팅 데이터 -> ML 훈련 데이터 변환")
            training_data_path = await self._run_data_processing_step()
            
            # 한글 주석: 3단계 - 모델 훈련 결정
            logger.info("3단계: ML 모델 재훈련 판단")
            retrain_needed = await self._check_retrain_needed(force_retrain)
            
            model_metrics = {}
            if retrain_needed:
                # 한글 주석: 4단계 - 모델 훈련
                logger.info("4단계: XGBoost 모델 훈련 실행")
                model_metrics = await self._run_training_step(training_data_path)
                
                # 한글 주석: 5-6단계는 유효 성능일 때만 실행
                if model_metrics.get('test_r2') is not None:
                    logger.info("5단계: 모델 성능 기록 및 모니터링")
                    await self._update_performance_history(model_metrics)
                    logger.info("6단계: 성능 모니터링 및 건강성 체크")
                    await self._run_performance_monitoring(model_metrics)
                else:
                    logger.info("5-6단계 스킵: 유효한 성능 메트릭 없음 (데이터 부족) ")
            else:
                logger.info("4-6단계 스킵: 재훈련 불필요")
                
            # 한글 주석: 7단계 - 결과 요약
            execution_time = time.time() - start_time
            result_summary = self._create_result_summary(
                backtest_result, training_data_path, model_metrics, execution_time
            )
            
            logger.info(f"파이프라인 완료 #{self.pipeline_runs} ({execution_time:.1f}초)")
            return result_summary
            
        except Exception as e:
            logger.error(f"파이프라인 실패 #{self.pipeline_runs}: {e}")
            raise
    
    async def _run_backtest_step(self, symbol: str, days: int) -> str:
        """백테스팅 단계 실행"""
        # 한글 주석: 노틸러스 백테스팅을 별도 스레드에서 실행
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, run_nautilus_backtest, symbol, days)
        
        # 한글 주석: 거래 수 업데이트 (파일에서 카운트)
        if Path(result).exists():
            import pandas as pd
            df = pd.read_csv(result)
            self.total_trades += len(df)
            logger.info(f"새로운 거래: {len(df)}건, 총 누적: {self.total_trades}건")
        
        return result
    
    async def _run_data_processing_step(self) -> str:
        """데이터 처리 단계 실행"""
        loop = asyncio.get_event_loop()
        training_path = await loop.run_in_executor(None, self.data_pipeline.run_pipeline)
        
        logger.info(f"훈련 데이터 생성: {Path(training_path).name}")
        return training_path
    
    async def _check_retrain_needed(self, force: bool = False) -> bool:
        """재훈련 필요 여부 판단"""
        if force:
            logger.info("강제 재훈련 모드")
            return True
            
        # 한글 주석: 현재 모델 성능 가져오기 (모니터의 최신 기록 사용)
        current_performance = {}
        try:
            if self.performance_monitor.performance_history:
                latest = self.performance_monitor.performance_history[-1]
                current_performance = {
                    'r2_score': latest.get('r2_score', 0),
                    'rmse': latest.get('rmse', 0),
                }
        except Exception:
            current_performance = {}
        
        retrain_needed = self.scheduler.should_retrain(self.total_trades, current_performance)
        
        if retrain_needed:
            logger.info(f"재훈련 필요: 데이터 {self.total_trades}건 기준")
        else:
            logger.info(f"재훈련 불필요: 데이터 {self.total_trades}건, 성능 양호")
            
        return retrain_needed
    
    async def _run_training_step(self, data_path: str) -> dict:
        """모델 훈련 단계 실행"""
        loop = asyncio.get_event_loop()
        metrics = await loop.run_in_executor(None, self.model_trainer.train_model, data_path)
        
        # 한글 주석: None 안전 로깅
        if metrics.get('test_r2') is not None and metrics.get('test_rmse') is not None:
            logger.info(f"모델 성능: R² {metrics['test_r2']:.4f}, RMSE {metrics['test_rmse']:.4f}")
        else:
            logger.info("모델 성능: 데이터 부족으로 훈련 스킵")
        
        # 한글 주석: 피처 중요도 로깅
        if hasattr(self.model_trainer, 'feature_importance'):
            top_features = sorted(
                self.model_trainer.feature_importance.items(), 
                key=lambda x: x[1], reverse=True
            )[:3]
            logger.info(f"주요 피처: {', '.join([f'{k}({v:.3f})' for k, v in top_features])}")
        
        return metrics
    
    async def _update_performance_history(self, metrics: dict):
        """성능 히스토리 업데이트"""
        self.scheduler.update_performance_history(metrics)
        self.scheduler.mark_retrain_completed()
        
        # 한글 주석: 과적합 경고
        if 'overfit_ratio' in metrics and metrics['overfit_ratio'] > 0.1:
            logger.warning(f"과적합 가능성: {metrics['overfit_ratio']:.3f}")
    
    async def _run_performance_monitoring(self, model_metrics: dict):
        """성능 모니터링 단계 실행"""
        loop = asyncio.get_event_loop()
        
        # 한글 주석: 성능 기록 및 분석
        performance_metrics = await loop.run_in_executor(
            None, self.performance_monitor.record_performance, model_metrics
        )
        
        # 한글 주석: 모델 건강성 체크
        health_check = await loop.run_in_executor(
            None, self.performance_monitor.check_model_health
        )
        
        logger.info(f"모델 건강성: {health_check['status']} (점수: {health_check['score']}/100)")
        
        if health_check['issues']:
            logger.warning(f"감지된 이슈: {', '.join(health_check['issues'])}")
        
        # 한글 주석: 성능 요약 리포트
        performance_summary = await loop.run_in_executor(
            None, self.performance_monitor.get_performance_summary, 7
        )
        
        if 'performance_metrics' in performance_summary:
            avg_r2 = performance_summary['performance_metrics']['avg_r2']
            avg_rmse = performance_summary['performance_metrics']['avg_rmse']
            logger.info(f"최근 7일 평균 성능: R² {avg_r2:.4f}, RMSE {avg_rmse:.4f}")
        
        # 한글 주석: 추천사항 로깅
        if 'recommendations' in performance_summary:
            for rec in performance_summary['recommendations'][:2]:  # 상위 2개만
                logger.info(f"추천사항: {rec}")
        
        return performance_metrics
    
    def _create_result_summary(self, backtest_result: str, training_path: str, 
                              model_metrics: dict, execution_time: float) -> dict:
        """결과 요약 생성"""
        return {
            'pipeline_run': self.pipeline_runs,
            'timestamp': datetime.now().isoformat(),
            'execution_time_seconds': round(execution_time, 1),
            'total_trades_accumulated': self.total_trades,
            'backtest_result_file': backtest_result,
            'training_data_file': training_path,
            'model_metrics': model_metrics,
            'retrained': bool(model_metrics),
            'status': 'success'
        }

class PipelineScheduler:
    """파이프라인 스케줄 실행기"""
    
    def __init__(self, pipeline: IntegratedMLPipeline):
        self.pipeline = pipeline
        self.running = False
        
    async def start_continuous_mode(self, 
                                  interval_hours: int = 6,
                                  symbols: list = ["BTCUSDT", "ETHUSDT"]):
        """
        연속 실행 모드 시작
        
        Args:
            interval_hours: 실행 간격 (시간)
            symbols: 백테스팅할 심볼들
        """
        self.running = True
        logger.info(f"연속 실행 모드 시작: {interval_hours}시간마다, {len(symbols)}개 심볼")
        
        while self.running:
            try:
                for symbol in symbols:
                    if not self.running:
                        break
                        
                    logger.info(f"정기 실행: {symbol}")
                    await self.pipeline.run_full_pipeline(symbol=symbol, backtest_days=7)
                    
                    # 한글 주석: 심볼 간 간격
                    await asyncio.sleep(30)
                
                if self.running:
                    logger.info(f"다음 실행까지 {interval_hours}시간 대기")
                    await asyncio.sleep(interval_hours * 3600)
                    
            except Exception as e:
                logger.error(f"연속 모드 오류: {e}")
                await asyncio.sleep(300)  # 5분 후 재시도
    
    def stop(self):
        """연속 실행 중지"""
        self.running = False
        logger.info("연속 실행 모드 중지")

async def main():
    """메인 실행 함수"""
    logger.info("노틸러스 + ML 통합 파이프라인 시작")
    
    # 한글 주석: 파이프라인 초기화
    pipeline = IntegratedMLPipeline()
    
    # 한글 주석: 연속 모드 실행
    logger.info("연속 학습 모드 시작 (2시간 간격, BTC/ETH)")
    scheduler = PipelineScheduler(pipeline)
    await scheduler.start_continuous_mode(interval_hours=2, symbols=["BTCUSDT", "ETHUSDT"]) 

if __name__ == "__main__":
    # 한글 주석: 메인 파이프라인 실행
    asyncio.run(main())

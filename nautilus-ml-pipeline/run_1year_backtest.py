"""
1년치 자동매매 백테스트 실행 스크립트
- 365일간의 거래 데이터 생성
- ML 훈련용 데이터 수집
- 대량 데이터 처리 최적화
"""

import asyncio
import logging
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd
import time
from typing import List, Dict, Optional

from nautilus_integration.backtest_runner import run_nautilus_backtest
from ml_pipeline.data_processor import MLDataPipeline
from ml_pipeline.model_trainer import MLModelTrainer
from ml_pipeline.performance_monitor import PerformanceMonitor

# 한글 주석: 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/1year_backtest.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class YearLongBacktestRunner:
    """1년치 백테스트 실행기"""
    
    def __init__(self):
        """실행기 초기화"""
        # 한글 주석: 필요한 디렉토리 생성
        Path('data/backtest_results').mkdir(parents=True, exist_ok=True)
        Path('data/training_data').mkdir(parents=True, exist_ok=True)
        Path('data/models').mkdir(parents=True, exist_ok=True)
        Path('logs').mkdir(parents=True, exist_ok=True)
        
        self.data_pipeline = MLDataPipeline()
        self.model_trainer = MLModelTrainer()
        self.performance_monitor = PerformanceMonitor()
        
        # 한글 주석: 실행 통계
        self.total_trades = 0
        self.backtest_files = []
        
    async def run_year_long_backtest(
        self, 
        symbol: str = "BTCUSDT",
        chunk_days: int = 30,  # 30일씩 청크로 나누어 실행
        timeframe: str = "1m"
    ) -> Dict:
        """
        1년치 백테스트 실행
        
        Args:
            symbol: 거래 심볼
            chunk_days: 청크 단위 (일)
            timeframe: 시간 프레임
            
        Returns:
            실행 결과 요약
        """
        start_time = time.time()
        logger.info(f"=== 1년치 백테스트 시작 ===")
        logger.info(f"심볼: {symbol}, 청크 크기: {chunk_days}일, 시간프레임: {timeframe}")
        
        try:
            # 한글 주석: 1단계 - 1년치 백테스트 실행 (청크 단위)
            await self._run_chunked_backtests(symbol, chunk_days, timeframe)
            
            # 한글 주석: 2단계 - 모든 백테스트 데이터 통합
            logger.info("2단계: 백테스트 데이터 통합 및 ML 데이터 변환")
            training_data_path = await self._consolidate_and_process_data()
            
            # 한글 주석: 3단계 - 대용량 데이터로 ML 모델 훈련
            logger.info("3단계: 1년치 데이터로 ML 모델 훈련")
            model_metrics = await self._train_ml_model(training_data_path)
            
            # 한글 주석: 4단계 - 성능 분석 및 리포트 생성
            logger.info("4단계: 성능 분석 및 최종 리포트 생성")
            final_report = await self._generate_final_report(model_metrics, start_time)
            
            logger.info(f"=== 1년치 백테스트 완료 ===")
            return final_report
            
        except Exception as e:
            logger.error(f"1년치 백테스트 실패: {e}")
            raise
    
    async def _run_chunked_backtests(
        self, 
        symbol: str, 
        chunk_days: int, 
        timeframe: str
    ):
        """청크 단위로 백테스트 실행"""
        
        # 한글 주석: 1년 전부터 현재까지의 기간 설정
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        
        current_date = start_date
        chunk_num = 1
        
        logger.info(f"백테스트 기간: {start_date.strftime('%Y-%m-%d')} ~ {end_date.strftime('%Y-%m-%d')}")
        
        while current_date < end_date:
            chunk_end = min(current_date + timedelta(days=chunk_days), end_date)
            
            logger.info(f"청크 #{chunk_num}: {current_date.strftime('%Y-%m-%d')} ~ {chunk_end.strftime('%Y-%m-%d')}")
            
            try:
                # 한글 주석: 청크 백테스트 실행
                loop = asyncio.get_event_loop()
                result_file = await loop.run_in_executor(
                    None, 
                    run_nautilus_backtest,
                    symbol,
                    chunk_days,
                    current_date,
                    chunk_end,
                    timeframe
                )
                
                # 한글 주석: 결과 파일 기록
                if Path(result_file).exists():
                    self.backtest_files.append(result_file)
                    
                    # 한글 주석: 거래 수 카운트
                    df = pd.read_csv(result_file)
                    chunk_trades = len(df)
                    self.total_trades += chunk_trades
                    
                    logger.info(f"청크 #{chunk_num} 완료: {chunk_trades}건 거래, 누적 {self.total_trades}건")
                else:
                    logger.warning(f"청크 #{chunk_num} 결과 파일 없음: {result_file}")
                
                # 한글 주석: 청크 간 휴식 (시스템 부하 방지)
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"청크 #{chunk_num} 실패: {e}")
                # 한글 주석: 개별 청크 실패해도 계속 진행
            
            current_date = chunk_end
            chunk_num += 1
        
        logger.info(f"총 {chunk_num-1}개 청크 완료, {self.total_trades}건 거래 생성")
    
    async def _consolidate_and_process_data(self) -> str:
        """모든 백테스트 데이터 통합 및 ML 데이터 변환"""
        
        if not self.backtest_files:
            logger.warning("통합할 백테스트 파일이 없습니다")
            return ""
        
        # 한글 주석: 모든 백테스트 결과 통합
        all_trades = []
        for file_path in self.backtest_files:
            try:
                df = pd.read_csv(file_path)
                all_trades.append(df)
                logger.info(f"파일 로드: {Path(file_path).name} ({len(df)}건)")
            except Exception as e:
                logger.error(f"파일 로드 실패 {file_path}: {e}")
        
        if not all_trades:
            logger.error("로드할 백테스트 데이터가 없습니다")
            return ""
        
        # 한글 주석: 통합 데이터프레임 생성
        combined_df = pd.concat(all_trades, ignore_index=True)
        
        # 한글 주석: 통합 파일 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        consolidated_path = f"data/backtest_results/consolidated_1year_{timestamp}.csv"
        combined_df.to_csv(consolidated_path, index=False)
        
        logger.info(f"통합 백테스트 데이터 저장: {consolidated_path} ({len(combined_df)}건)")
        
        # 한글 주석: ML 훈련 데이터로 변환
        loop = asyncio.get_event_loop()
        training_data_path = await loop.run_in_executor(
            None, 
            self.data_pipeline.run_pipeline,
            "data/backtest_results"
        )
        
        return training_data_path
    
    async def _train_ml_model(self, training_data_path: str) -> Dict:
        """1년치 데이터로 ML 모델 훈련"""
        
        if not training_data_path or not Path(training_data_path).exists():
            logger.error("훈련 데이터 파일이 없습니다")
            return {}
        
        # 한글 주석: 데이터 크기 확인
        df = pd.read_csv(training_data_path)
        logger.info(f"ML 훈련 데이터: {len(df)}건, {len(df.columns)}개 피처")
        
        # 한글 주석: 대용량 데이터 훈련 실행
        loop = asyncio.get_event_loop()
        model_metrics = await loop.run_in_executor(
            None,
            self.model_trainer.train_model,
            training_data_path,
            True  # save_model=True
        )
        
        # 한글 주석: 훈련 결과 로깅
        if model_metrics.get('test_r2') is not None:
            logger.info(f"모델 훈련 완료 - R²: {model_metrics['test_r2']:.4f}, RMSE: {model_metrics['test_rmse']:.4f}")
            
            # 한글 주석: 과적합 체크
            if model_metrics.get('overfit_ratio', 0) > 0.1:
                logger.warning(f"과적합 감지: {model_metrics['overfit_ratio']:.3f}")
            
            # 한글 주석: 피처 중요도 출력
            if hasattr(self.model_trainer, 'feature_importance'):
                top_features = sorted(
                    self.model_trainer.feature_importance.items(),
                    key=lambda x: x[1], 
                    reverse=True
                )[:5]
                logger.info("상위 5개 중요 피처:")
                for feature, importance in top_features:
                    logger.info(f"  {feature}: {importance:.4f}")
        else:
            logger.warning("모델 훈련 실패 또는 데이터 부족")
        
        return model_metrics
    
    async def _generate_final_report(self, model_metrics: Dict, start_time: float) -> Dict:
        """최종 성능 리포트 생성"""
        
        execution_time = time.time() - start_time
        
        # 한글 주석: 성능 모니터링 기록
        if model_metrics.get('test_r2') is not None:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                self.performance_monitor.record_performance,
                model_metrics
            )
        
        # 한글 주석: 최종 리포트 구성
        final_report = {
            'execution_summary': {
                'total_execution_time_hours': round(execution_time / 3600, 2),
                'total_trades_generated': self.total_trades,
                'backtest_files_created': len(self.backtest_files),
                'model_trained': bool(model_metrics.get('model_path')),
                'timestamp': datetime.now().isoformat()
            },
            'model_performance': model_metrics,
            'data_statistics': self._generate_data_statistics(),
            'recommendations': self._generate_recommendations(model_metrics)
        }
        
        # 한글 주석: 리포트 파일 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = f"data/reports/1year_backtest_report_{timestamp}.json"
        Path(report_path).parent.mkdir(parents=True, exist_ok=True)
        
        import json
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(final_report, f, indent=2, ensure_ascii=False)
        
        logger.info(f"최종 리포트 저장: {report_path}")
        logger.info(f"총 실행 시간: {execution_time/3600:.2f}시간")
        logger.info(f"생성된 거래: {self.total_trades}건")
        
        return final_report
    
    def _generate_data_statistics(self) -> Dict:
        """데이터 통계 생성"""
        return {
            'total_backtest_files': len(self.backtest_files),
            'total_trades': self.total_trades,
            'avg_trades_per_chunk': round(self.total_trades / max(len(self.backtest_files), 1), 1),
            'data_coverage_days': 365
        }
    
    def _generate_recommendations(self, model_metrics: Dict) -> List[str]:
        """개선 추천사항 생성"""
        recommendations = []
        
        # 한글 주석: 성능 기반 추천
        if model_metrics.get('test_r2', 0) < 0.1:
            recommendations.append("모델 성능이 낮습니다. 피처 엔지니어링을 개선하세요.")
        
        if model_metrics.get('overfit_ratio', 0) > 0.15:
            recommendations.append("과적합이 심합니다. 정규화 파라미터를 조정하세요.")
        
        if self.total_trades < 1000:
            recommendations.append("거래 데이터가 부족합니다. 전략 임계값을 낮춰보세요.")
        
        # 한글 주석: 데이터 기반 추천
        if len(self.backtest_files) < 10:
            recommendations.append("더 세분화된 청크로 백테스트를 실행해보세요.")
        
        if not recommendations:
            recommendations.append("모델 성능이 양호합니다. 실제 거래에 적용해보세요.")
        
        return recommendations

async def main():
    """메인 실행 함수"""
    logger.info("=== 1년치 자동매매 백테스트 & ML 훈련 시작 ===")
    
    runner = YearLongBacktestRunner()
    
    # 한글 주석: BTC와 ETH 두 심볼 모두 실행
    symbols = ["BTCUSDT", "ETHUSDT"]
    
    for symbol in symbols:
        logger.info(f"\n{'='*50}")
        logger.info(f"{symbol} 1년치 백테스트 시작")
        logger.info(f"{'='*50}")
        
        try:
            report = await runner.run_year_long_backtest(
                symbol=symbol,
                chunk_days=30,  # 30일씩 청크
                timeframe="1m"  # 1분 봉
            )
            
            logger.info(f"{symbol} 백테스트 완료!")
            logger.info(f"거래 수: {report['execution_summary']['total_trades_generated']}건")
            
            if report['model_performance'].get('test_r2'):
                logger.info(f"모델 R²: {report['model_performance']['test_r2']:.4f}")
            
        except Exception as e:
            logger.error(f"{symbol} 백테스트 실패: {e}")
        
        # 한글 주석: 심볼 간 휴식
        if symbol != symbols[-1]:  # 마지막 심볼이 아니면
            logger.info("다음 심볼까지 5분 대기...")
            await asyncio.sleep(300)
    
    logger.info("\n=== 전체 1년치 백테스트 & ML 훈련 완료 ===")

if __name__ == "__main__":
    # 한글 주석: 1년치 백테스트 실행
    asyncio.run(main())

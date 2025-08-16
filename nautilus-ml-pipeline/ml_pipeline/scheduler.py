"""
ML 모델 재훈련 스케줄러
- 주기적 모델 업데이트
- 성능 기반 적응형 재훈련
- 드리프트 감지 및 자동 대응
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import yaml
# 한글 주석: 불필요한 import 제거 (최적화)
from pathlib import Path

from .performance_monitor import PerformanceMonitor

logger = logging.getLogger(__name__)

class MLScheduler:
    """ML 모델 재훈련 스케줄러"""
    
    def __init__(self, config_path: str = "config/ml_config.yaml"):
        """
        스케줄러 초기화
        
        Args:
            config_path: ML 설정 파일 경로
        """
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = yaml.safe_load(f)
        
        self.last_retrain = None
        self.performance_history = []
        
    def should_retrain(self, trade_count: int, current_performance: Dict) -> bool:
        """
        재훈련 필요 여부 판단
        
        Args:
            trade_count: 현재 거래 데이터 수
            current_performance: 현재 모델 성능 지표
            
        Returns:
            bool: 재훈련 필요 여부
        """
        # 한글 주석: 쿨다운 기간 체크 (새로 추가)
        if self._check_cooldown_period():
            logger.info("재학습 쿨다운 기간 중 - 스킵")
            return False
            
        # 한글 주석: 긴급 재훈련 체크 (성능 급락)
        if self._check_emergency_retrain(current_performance):
            logger.warning("성능 급락 감지 - 긴급 재훈련 실행")
            return True
        
        # 한글 주석: 데이터 양 기반 재훈련 체크
        if self._check_data_based_retrain(trade_count):
            logger.info(f"데이터 양 기반 재훈련 - 현재 {trade_count}건")
            return True
            
        # 한글 주석: 시간 기반 재훈련 체크
        if self._check_time_based_retrain():
            logger.info("시간 기반 재훈련 스케줄")
            return True
            
        return False
    
    def _check_cooldown_period(self) -> bool:
        """재학습 쿨다운 기간 체크"""
        if self.last_retrain is None:
            return False
            
        cooldown_hours = self.config['update_schedule'].get('retrain_cooldown_hours', 6)
        time_since_last = datetime.now() - self.last_retrain
        cooldown_period = timedelta(hours=cooldown_hours)
        
        return time_since_last < cooldown_period
    
    def _check_emergency_retrain(self, current_performance: Dict) -> bool:
        """긴급 재훈련 필요 여부 체크"""
        if not self.performance_history or not current_performance:
            return False
            
        # 한글 주석: 최근 성능과 비교
        recent_avg = self._calculate_recent_performance()
        current_r2 = current_performance.get('r2_score', 0)
        
        # 한글 주석: 설정된 임계값보다 성능이 하락했는지 확인
        threshold = self.config['update_schedule']['emergency_threshold']
        performance_drop = (recent_avg - current_r2) / recent_avg if recent_avg > 0 else 0
        
        return performance_drop > threshold
    
    def _check_data_based_retrain(self, trade_count: int) -> bool:
        """데이터 양 기반 재훈련 체크"""
        schedule = self.config['data_based_schedule']
        
        # 한글 주석: 데이터 양에 따른 재훈련 주기 결정
        if trade_count < schedule['small_dataset']['threshold']:
            # 소량 데이터: 50건마다
            return trade_count % schedule['small_dataset']['retrain_every'] == 0
        elif trade_count < schedule['medium_dataset']['threshold']:
            # 중간 데이터: 주 1회
            return self._is_weekly_schedule()
        elif trade_count < schedule['large_dataset']['threshold']:
            # 대량 데이터: 주 1회 + 성능 모니터링
            return self._is_weekly_schedule()
        else:
            # 초대량 데이터: 2주 1회
            return self._is_biweekly_schedule()
    
    def _check_time_based_retrain(self) -> bool:
        """시간 기반 재훈련 체크"""
        now = datetime.now()
        
        # 한글 주석: 주간 재훈련 (일요일 02:00)
        weekly_config = self.config['update_schedule']['weekly_retrain']
        if weekly_config['enabled']:
            if now.weekday() == 6 and now.hour == 2:  # 일요일
                return True
        
        # 한글 주석: 월간 재훈련 (매월 1일 03:00)
        monthly_config = self.config['update_schedule']['monthly_full_retrain']
        if monthly_config['enabled']:
            if now.day == monthly_config['day'] and now.hour == 3:
                return True
                
        return False
    
    def _calculate_recent_performance(self, window: int = 5) -> float:
        """최근 성능 평균 계산"""
        if len(self.performance_history) < window:
            return 0.0
        
        recent_scores = [p['r2_score'] for p in self.performance_history[-window:]]
        return sum(recent_scores) / len(recent_scores)
    
    def _is_weekly_schedule(self) -> bool:
        """주간 스케줄 확인"""
        if not self.last_retrain:
            return True
        
        return datetime.now() - self.last_retrain >= timedelta(days=7)
    
    def _is_biweekly_schedule(self) -> bool:
        """격주 스케줄 확인"""
        if not self.last_retrain:
            return True
            
        return datetime.now() - self.last_retrain >= timedelta(days=14)
    
    def update_performance_history(self, performance: Dict):
        """성능 히스토리 업데이트"""
        performance['timestamp'] = datetime.now()
        self.performance_history.append(performance)
        
        # 한글 주석: 히스토리 크기 제한 (최근 100개만 유지)
        if len(self.performance_history) > 100:
            self.performance_history = self.performance_history[-100:]
    
    def mark_retrain_completed(self):
        """재훈련 완료 표시"""
        self.last_retrain = datetime.now()
        logger.info(f"모델 재훈련 완료: {self.last_retrain}")
    
    async def start_monitoring(self):
        """모니터링 시작"""
        logger.info("ML 스케줄러 모니터링 시작")
        
        while True:
            try:
                # 한글 주석: 매시간 상태 체크
                await self._check_and_schedule()
                await asyncio.sleep(3600)  # 1시간 대기
                
            except Exception as e:
                logger.error(f"스케줄러 오류: {e}")
                await asyncio.sleep(300)  # 5분 후 재시도
    
    async def _check_and_schedule(self):
        """상태 체크 및 스케줄링"""
        try:
            performance_monitor = PerformanceMonitor()

            trade_count = 0
            current_performance = {}

            if performance_monitor.performance_history:
                latest = performance_monitor.performance_history[-1]
                current_performance = {
                    'r2_score': latest.get('r2_score', 0),
                    'rmse': latest.get('rmse', 0),
                    'overfit_ratio': latest.get('overfit_ratio', 0)
                }
                trade_count = latest.get('training_size', 0) + latest.get('test_size', 0)

            if self.should_retrain(trade_count, current_performance):
                trigger = Path("data/retrain.trigger")
                trigger.parent.mkdir(parents=True, exist_ok=True)
                trigger.write_text(datetime.now().isoformat(), encoding='utf-8')
                logger.info(f"재훈련 트리거 생성: {trigger}")
            else:
                logger.info("재훈련 조건 미충족 - 스케줄 유지")

        except Exception as e:
            logger.error(f"상태 체크 실패: {e}")

def create_scheduler() -> MLScheduler:
    """스케줄러 인스턴스 생성"""
    return MLScheduler()

if __name__ == "__main__":
    # 한글 주석: 스케줄러 단독 실행
    scheduler = create_scheduler()
    asyncio.run(scheduler.start_monitoring())

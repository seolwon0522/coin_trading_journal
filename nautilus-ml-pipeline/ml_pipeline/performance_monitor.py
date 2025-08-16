"""
ML 모델 성능 모니터링 시스템
- 실시간 성능 추적
- 성능 저하 감지 및 알림
- 모델 드리프트 모니터링
- 성능 보고서 생성
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path
import pandas as pd
import numpy as np
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetrics:
    """성능 지표 데이터 클래스"""
    timestamp: str
    r2_score: float
    rmse: float
    mae: float
    overfit_ratio: float
    training_size: int
    test_size: int
    feature_importance_top3: Dict[str, float]
    prediction_accuracy: float = 0.0
    drift_score: float = 0.0

@dataclass
class PerformanceAlert:
    """성능 알림 데이터 클래스"""
    timestamp: str
    alert_type: str  # 'degradation', 'drift', 'overfitting'
    severity: str    # 'low', 'medium', 'high', 'critical'
    message: str
    metrics: Dict
    recommendation: str

class PerformanceMonitor:
    """ML 모델 성능 모니터링"""
    
    def __init__(self, 
                 performance_history_file: str = "data/performance_history.json",
                 alerts_file: str = "data/performance_alerts.json"):
        """
        성능 모니터 초기화
        
        Args:
            performance_history_file: 성능 히스토리 저장 파일
            alerts_file: 알림 저장 파일
        """
        self.performance_history_file = performance_history_file
        self.alerts_file = alerts_file
        
        # 한글 주석: 성능 임계값 설정
        self.thresholds = {
            'r2_degradation': 0.05,      # R² 5% 이상 하락
            'rmse_increase': 0.20,       # RMSE 20% 이상 증가
            'overfit_ratio': 0.15,       # 과적합 비율 15% 이상
            'drift_score': 0.3,          # 드리프트 점수 0.3 이상
            'min_performance_r2': 0.7,   # 최소 R² 임계값
            'max_acceptable_rmse': 3.0   # 최대 허용 RMSE
        }
        
        self.performance_history = self._load_performance_history()
        self.alerts_history = self._load_alerts_history()
        
        # 한글 주석: 호환성을 위한 별칭
        self.alerts = self.alerts_history
        
    def _load_performance_history(self) -> List[Dict]:
        """성능 히스토리 로드"""
        try:
            if Path(self.performance_history_file).exists():
                with open(self.performance_history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"성능 히스토리 로드 실패: {e}")
        return []
    
    def _load_alerts_history(self) -> List[Dict]:
        """알림 히스토리 로드"""
        try:
            if Path(self.alerts_file).exists():
                with open(self.alerts_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"알림 히스토리 로드 실패: {e}")
        return []
    
    def _save_performance_history(self):
        """성능 히스토리 저장"""
        try:
            Path(self.performance_history_file).parent.mkdir(parents=True, exist_ok=True)
            with open(self.performance_history_file, 'w', encoding='utf-8') as f:
                json.dump(self.performance_history, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"성능 히스토리 저장 실패: {e}")
    
    def _save_alerts_history(self):
        """알림 히스토리 저장"""
        try:
            Path(self.alerts_file).parent.mkdir(parents=True, exist_ok=True)
            with open(self.alerts_file, 'w', encoding='utf-8') as f:
                json.dump(self.alerts_history, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"알림 히스토리 저장 실패: {e}")
    
    def record_performance(self, metrics: Dict) -> PerformanceMetrics:
        """
        새로운 성능 지표 기록
        
        Args:
            metrics: 모델 훈련 결과 메트릭스
            
        Returns:
            기록된 성능 지표
        """
        # 한글 주석: 성능 지표 객체 생성
        performance_metrics = PerformanceMetrics(
            timestamp=datetime.now().isoformat(),
            r2_score=metrics.get('test_r2', 0.0),
            rmse=metrics.get('test_rmse', 0.0),
            mae=metrics.get('test_mae', 0.0),
            overfit_ratio=metrics.get('overfit_ratio', 0.0),
            training_size=metrics.get('train_size', 0),
            test_size=metrics.get('test_size', 0),
            feature_importance_top3=self._extract_top_features(metrics),
            drift_score=self._calculate_drift_score(metrics)
        )
        
        # 한글 주석: 히스토리에 추가
        self.performance_history.append(asdict(performance_metrics))
        self._save_performance_history()
        
        # 한글 주석: 성능 분석 및 알림 생성
        alerts = self._analyze_performance(performance_metrics)
        for alert in alerts:
            self._add_alert(alert)
            
        logger.info(f"성능 기록 완료: R² {performance_metrics.r2_score:.4f}, "
                   f"RMSE {performance_metrics.rmse:.4f}")
        
        if alerts:
            logger.warning(f"성능 알림 {len(alerts)}건 생성됨")
            
        return performance_metrics
    
    def _extract_top_features(self, metrics: Dict) -> Dict[str, float]:
        """상위 피처 중요도 추출"""
        # 한글 주석: 모델 메타데이터 또는 제공된 metrics에서 실제 중요도 로드
        try:
            # 1) 훈련 메트릭에 포함된 경우 우선 사용
            feature_importance = metrics.get('feature_importance') if isinstance(metrics, dict) else None
            if not feature_importance:
                # 2) 최신 메타데이터에서 로드
                models_dir = Path("data/models")
                if models_dir.exists():
                    meta_files = sorted(models_dir.glob("metadata_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
                    if meta_files:
                        with open(meta_files[0], 'r', encoding='utf-8') as f:
                            meta = json.load(f)
                            feature_importance = meta.get('feature_importance', {})

            # 한글 주석: 사용처에서 기대하는 키 우선 추출 (없으면 생략)
            selected_keys = ["pnl_ratio", "market_condition", "volatility"]
            top: Dict[str, float] = {}
            if feature_importance and isinstance(feature_importance, dict):
                for key in selected_keys:
                    if key in feature_importance:
                        try:
                            top[key] = float(feature_importance[key])
                        except Exception:
                            pass

                # 한글 주석: 비어있거나 일부만 존재한다면, 중요도 상위 3개를 보완적으로 채워넣되 임의값은 사용하지 않음
                if len(top) < 3:
                    sorted_items = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
                    for name, val in sorted_items:
                        if name in top:
                            continue
                        try:
                            top[name] = float(val)
                        except Exception:
                            continue
                        if len(top) >= 3:
                            break

            return top
        except Exception:
            # 한글 주석: 실패 시 임의값을 쓰지 않고 빈 dict 반환
            return {}
    
    def _calculate_drift_score(self, metrics: Dict) -> float:
        """데이터 드리프트 점수 계산"""
        if len(self.performance_history) < 2:
            return 0.0
            
        # 한글 주석: 최근 성능과 기준선 비교
        recent_r2 = metrics.get('test_r2', 0.0)
        baseline_r2 = np.mean([h['r2_score'] for h in self.performance_history[-5:]])
        
        # 한글 주석: 드리프트 점수 = 성능 차이의 절댓값
        drift_score = abs(recent_r2 - baseline_r2) / max(baseline_r2, 0.1)
        return min(drift_score, 1.0)
    
    def _analyze_performance(self, current: PerformanceMetrics) -> List[PerformanceAlert]:
        """성능 분석 및 알림 생성"""
        alerts = []
        
        # 한글 주석: 절대적 성능 체크
        if current.r2_score < self.thresholds['min_performance_r2']:
            alerts.append(PerformanceAlert(
                timestamp=current.timestamp,
                alert_type='degradation',
                severity='high',
                message=f"모델 R² 점수가 임계값 이하: {current.r2_score:.4f} < {self.thresholds['min_performance_r2']}",
                metrics={'r2_score': current.r2_score},
                recommendation="모델 재훈련 또는 피처 엔지니어링 검토 필요"
            ))
        
        if current.rmse > self.thresholds['max_acceptable_rmse']:
            alerts.append(PerformanceAlert(
                timestamp=current.timestamp,
                alert_type='degradation',
                severity='high',
                message=f"RMSE가 허용 범위 초과: {current.rmse:.4f} > {self.thresholds['max_acceptable_rmse']}",
                metrics={'rmse': current.rmse},
                recommendation="훈련 데이터 품질 검토 및 모델 파라미터 조정 필요"
            ))
        
        # 한글 주석: 과적합 체크
        if current.overfit_ratio > self.thresholds['overfit_ratio']:
            severity = 'critical' if current.overfit_ratio > 0.25 else 'medium'
            alerts.append(PerformanceAlert(
                timestamp=current.timestamp,
                alert_type='overfitting',
                severity=severity,
                message=f"과적합 감지: {current.overfit_ratio:.4f} > {self.thresholds['overfit_ratio']}",
                metrics={'overfit_ratio': current.overfit_ratio},
                recommendation="정규화 강화, 조기 종료, 또는 교차 검증 적용 필요"
            ))
        
        # 한글 주석: 드리프트 체크
        if current.drift_score > self.thresholds['drift_score']:
            alerts.append(PerformanceAlert(
                timestamp=current.timestamp,
                alert_type='drift',
                severity='medium',
                message=f"데이터 드리프트 감지: {current.drift_score:.4f} > {self.thresholds['drift_score']}",
                metrics={'drift_score': current.drift_score},
                recommendation="새로운 데이터 패턴 분석 및 모델 업데이트 고려"
            ))
        
        # 한글 주석: 상대적 성능 변화 체크
        if len(self.performance_history) >= 2:
            prev_r2 = self.performance_history[-2]['r2_score']
            r2_change = (prev_r2 - current.r2_score) / prev_r2
            
            if r2_change > self.thresholds['r2_degradation']:
                alerts.append(PerformanceAlert(
                    timestamp=current.timestamp,
                    alert_type='degradation',
                    severity='medium',
                    message=f"R² 성능 저하: {r2_change:.1%} 감소",
                    metrics={'r2_change': r2_change, 'prev_r2': prev_r2, 'current_r2': current.r2_score},
                    recommendation="최근 데이터 변화 분석 및 피처 재검토 필요"
                ))
        
        return alerts
    
    def _add_alert(self, alert: PerformanceAlert):
        """알림 추가"""
        self.alerts_history.append(asdict(alert))
        self._save_alerts_history()
        
        # 한글 주석: 심각도에 따른 로그 레벨 결정
        if alert.severity == 'critical':
            logger.critical(f"성능 알림 [CRITICAL] {alert.message}")
        elif alert.severity == 'high':
            logger.error(f"성능 알림 [HIGH] {alert.message}")
        elif alert.severity == 'medium':
            logger.warning(f"성능 알림 [MEDIUM] {alert.message}")
        else:
            logger.info(f"성능 알림 [LOW] {alert.message}")
    
    def get_performance_summary(self, days: int = 7) -> Dict:
        """
        성능 요약 리포트 생성
        
        Args:
            days: 요약할 기간 (일)
            
        Returns:
            성능 요약 정보
        """
        cutoff_time = datetime.now() - timedelta(days=days)
        recent_history = [
            h for h in self.performance_history 
            if datetime.fromisoformat(h['timestamp']) > cutoff_time
        ]
        
        if not recent_history:
            return {'message': f'최근 {days}일간 성능 데이터 없음'}
        
        # 한글 주석: 성능 통계 계산
        r2_scores = [h['r2_score'] for h in recent_history]
        rmse_scores = [h['rmse'] for h in recent_history]
        overfit_ratios = [h['overfit_ratio'] for h in recent_history]
        
        recent_alerts = [
            a for a in self.alerts_history
            if datetime.fromisoformat(a['timestamp']) > cutoff_time
        ]
        
        summary = {
            'period_days': days,
            'total_evaluations': len(recent_history),
            'performance_metrics': {
                'avg_r2': np.mean(r2_scores),
                'min_r2': np.min(r2_scores),
                'max_r2': np.max(r2_scores),
                'avg_rmse': np.mean(rmse_scores),
                'min_rmse': np.min(rmse_scores),
                'max_rmse': np.max(rmse_scores),
                'avg_overfit_ratio': np.mean(overfit_ratios)
            },
            'trend_analysis': {
                'r2_trend': 'improving' if len(r2_scores) > 1 and r2_scores[-1] > r2_scores[0] else 'stable_or_declining',
                'rmse_trend': 'improving' if len(rmse_scores) > 1 and rmse_scores[-1] < rmse_scores[0] else 'stable_or_worsening',
            },
            'alerts_summary': {
                'total_alerts': len(recent_alerts),
                'critical_alerts': len([a for a in recent_alerts if a['severity'] == 'critical']),
                'high_alerts': len([a for a in recent_alerts if a['severity'] == 'high']),
                'medium_alerts': len([a for a in recent_alerts if a['severity'] == 'medium']),
                'low_alerts': len([a for a in recent_alerts if a['severity'] == 'low'])
            },
            'recommendations': self._generate_recommendations(recent_history, recent_alerts)
        }
        
        return summary
    
    def _generate_recommendations(self, history: List[Dict], alerts: List[Dict]) -> List[str]:
        """성능 기반 추천사항 생성"""
        recommendations = []
        
        if not history:
            return ["성능 데이터 부족: 더 많은 모델 훈련 필요"]
        
        # 한글 주석: 성능 트렌드 분석
        r2_scores = [h['r2_score'] for h in history]
        if len(r2_scores) > 1:
            recent_trend = np.polyfit(range(len(r2_scores)), r2_scores, 1)[0]
            if recent_trend < -0.01:
                recommendations.append("성능 하락 추세 감지: 데이터 품질 및 피처 엔지니어링 재검토")
        
        # 한글 주석: 알림 기반 추천
        critical_alerts = [a for a in alerts if a['severity'] == 'critical']
        if critical_alerts:
            recommendations.append("긴급: 치명적 성능 이슈 해결 필요")
        
        overfit_alerts = [a for a in alerts if a['alert_type'] == 'overfitting']
        if len(overfit_alerts) > 2:
            recommendations.append("반복적 과적합: 모델 복잡도 감소 또는 정규화 강화")
        
        drift_alerts = [a for a in alerts if a['alert_type'] == 'drift']
        if drift_alerts:
            recommendations.append("데이터 드리프트: 새로운 데이터 패턴에 맞는 모델 업데이트")
        
        # 한글 주석: 기본 추천사항
        if not recommendations:
            recommendations.append("현재 성능 안정적: 정기적인 모니터링 지속")
        
        return recommendations
    
    def export_performance_report(self, output_file: str = None) -> str:
        """성능 리포트 CSV 내보내기"""
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"data/reports/performance_report_{timestamp}.csv"
        
        try:
            # 한글 주석: 성능 히스토리를 DataFrame으로 변환
            df = pd.DataFrame(self.performance_history)
            
            if not df.empty:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df = df.sort_values('timestamp')
                
                # 한글 주석: 디렉토리 생성
                Path(output_file).parent.mkdir(parents=True, exist_ok=True)
                df.to_csv(output_file, index=False, encoding='utf-8')
                
                logger.info(f"성능 리포트 내보내기 완료: {output_file}")
                return output_file
            else:
                logger.warning("내보낼 성능 데이터가 없습니다")
                return ""
                
        except Exception as e:
            logger.error(f"성능 리포트 내보내기 실패: {e}")
            return ""
    
    def check_model_health(self) -> Dict:
        """모델 건강성 체크"""
        if not self.performance_history:
            return {
                'status': 'unknown',
                'message': '성능 데이터 부족',
                'score': 0
            }
        
        latest = self.performance_history[-1]
        health_score = 0
        issues = []
        
        # 한글 주석: R² 점수 체크
        if latest['r2_score'] >= 0.9:
            health_score += 40
        elif latest['r2_score'] >= 0.8:
            health_score += 30
        elif latest['r2_score'] >= 0.7:
            health_score += 20
        else:
            issues.append("낮은 R² 점수")
        
        # 한글 주석: RMSE 체크
        if latest['rmse'] <= 1.5:
            health_score += 30
        elif latest['rmse'] <= 2.5:
            health_score += 20
        elif latest['rmse'] <= 3.5:
            health_score += 10
        else:
            issues.append("높은 RMSE")
        
        # 한글 주석: 과적합 체크
        if latest['overfit_ratio'] <= 0.1:
            health_score += 20
        elif latest['overfit_ratio'] <= 0.2:
            health_score += 10
        else:
            issues.append("과적합 위험")
        
        # 한글 주석: 최근 알림 체크
        recent_critical = len([
            a for a in self.alerts_history[-10:] 
            if a['severity'] in ['critical', 'high']
        ])
        if recent_critical == 0:
            health_score += 10
        else:
            issues.append(f"최근 심각한 알림 {recent_critical}건")
        
        # 한글 주석: 건강성 상태 결정
        if health_score >= 80:
            status = 'excellent'
            message = '모델 상태 우수'
        elif health_score >= 60:
            status = 'good'
            message = '모델 상태 양호'
        elif health_score >= 40:
            status = 'fair'
            message = '모델 상태 보통'
        else:
            status = 'poor'
            message = '모델 상태 불량'
        
        return {
            'status': status,
            'score': health_score,
            'message': message,
            'issues': issues,
            'latest_performance': {
                'r2_score': latest['r2_score'],
                'rmse': latest['rmse'],
                'overfit_ratio': latest['overfit_ratio']
            }
        }
    
    def export_performance_report(self) -> str:
        """
        성능 리포트를 CSV 파일로 내보냅니다.
        """
        if not self.performance_history:
            logger.info("내보낼 성능 기록이 없습니다.")
            return None
        
        df = pd.DataFrame(self.performance_history)
        output_dir = Path("data/reports")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"performance_report_{timestamp_str}.csv"
        
        df.to_csv(output_path, index=False, encoding='utf-8')
        logger.info(f"성능 리포트 CSV 내보내기 완료: {output_path}")
        return str(output_path)

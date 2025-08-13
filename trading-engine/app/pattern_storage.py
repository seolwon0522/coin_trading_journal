# 패턴 분석 결과 DB 저장 기능
from datetime import date
from typing import Dict, Optional
from sqlalchemy.orm import Session
from database import PatternsSummaryWeekly, PatternHistory
import logging

logger = logging.getLogger(__name__)

def save_weekly_analysis(
    db: Session, 
    user_id: str, 
    period_start: date, 
    period_end: date, 
    analysis_result: Dict
) -> Optional[int]:
    """주간 분석 결과를 DB에 저장하고 summary_id 반환"""
    try:
        # 1. patterns_summary_weekly 테이블에 전체 결과 저장
        summary_record = PatternsSummaryWeekly(
            user_id=user_id,
            period_start=period_start,
            period_end=period_end,
            summary_json=analysis_result
        )
        
        db.add(summary_record)
        db.flush()  # ID 생성을 위해 flush
        
        summary_id = summary_record.id
        logger.info(f"주간 분석 요약 저장 완료: summary_id={summary_id}")
        
        # 2. pattern_history 테이블에 개별 패턴 저장
        patterns_to_save = [
            {
                "type": "loss",
                "data": analysis_result["top_loss_pattern"]
            },
            {
                "type": "profit", 
                "data": analysis_result["top_profit_pattern"]
            }
        ]
        
        for pattern_info in patterns_to_save:
            pattern_data = pattern_info["data"]
            
            pattern_record = PatternHistory(
                user_id=user_id,
                period_start=period_start,
                period_end=period_end,
                pattern_type=pattern_info["type"],
                title=pattern_data["title"],
                why=pattern_data["why"],
                actions=pattern_data["actions"],
                summary_id=summary_id
            )
            
            db.add(pattern_record)
            logger.info(f"패턴 히스토리 저장: type={pattern_info['type']}, title={pattern_data['title']}")
        
        # 커밋
        db.commit()
        logger.info(f"주간 분석 결과 저장 완료: user_id={user_id}, period={period_start}~{period_end}")
        
        return summary_id
        
    except Exception as e:
        logger.error(f"주간 분석 결과 저장 실패: {e}")
        db.rollback()
        return None

def get_weekly_analysis(
    db: Session, 
    user_id: str, 
    period_start: date, 
    period_end: date
) -> Optional[Dict]:
    """기존 주간 분석 결과 조회"""
    try:
        summary_record = db.query(PatternsSummaryWeekly).filter(
            PatternsSummaryWeekly.user_id == user_id,
            PatternsSummaryWeekly.period_start == period_start,
            PatternsSummaryWeekly.period_end == period_end
        ).first()
        
        if summary_record:
            logger.info(f"기존 주간 분석 결과 발견: summary_id={summary_record.id}")
            return summary_record.summary_json
        
        return None
        
    except Exception as e:
        logger.error(f"주간 분석 결과 조회 실패: {e}")
        return None

def get_pattern_history(
    db: Session, 
    user_id: str, 
    pattern_type: Optional[str] = None,
    limit: int = 10
) -> list:
    """패턴 히스토리 조회"""
    try:
        query = db.query(PatternHistory).filter(
            PatternHistory.user_id == user_id
        )
        
        if pattern_type:
            query = query.filter(PatternHistory.pattern_type == pattern_type)
        
        records = query.order_by(
            PatternHistory.period_end.desc()
        ).limit(limit).all()
        
        result = []
        for record in records:
            result.append({
                "id": record.id,
                "period_start": record.period_start.isoformat(),
                "period_end": record.period_end.isoformat(),
                "pattern_type": record.pattern_type,
                "title": record.title,
                "why": record.why,
                "actions": record.actions,
                "summary_id": record.summary_id,
                "created_at": record.created_at.isoformat()
            })
        
        return result
        
    except Exception as e:
        logger.error(f"패턴 히스토리 조회 실패: {e}")
        return []

def delete_weekly_analysis(
    db: Session, 
    user_id: str, 
    summary_id: int
) -> bool:
    """주간 분석 결과 삭제 (관련 패턴 히스토리도 함께)"""
    try:
        # 1. 패턴 히스토리 삭제
        db.query(PatternHistory).filter(
            PatternHistory.summary_id == summary_id,
            PatternHistory.user_id == user_id
        ).delete()
        
        # 2. 주간 분석 요약 삭제
        deleted_count = db.query(PatternsSummaryWeekly).filter(
            PatternsSummaryWeekly.id == summary_id,
            PatternsSummaryWeekly.user_id == user_id
        ).delete()
        
        if deleted_count > 0:
            db.commit()
            logger.info(f"주간 분석 결과 삭제 완료: summary_id={summary_id}")
            return True
        else:
            logger.warning(f"삭제할 주간 분석 결과를 찾을 수 없음: summary_id={summary_id}")
            return False
            
    except Exception as e:
        logger.error(f"주간 분석 결과 삭제 실패: {e}")
        db.rollback()
        return False
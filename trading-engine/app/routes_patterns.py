# 패턴 분석 관련 API 라우터
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db, create_tables
from schemas import (
    WeeklyAnalysisRequest, 
    WeeklyAnalysisResponse, 
    WeeklyAnalysisResult,
    PatternHistoryResponse,
    PatternHistoryItem
)
from analytics import generate_weekly_analysis_data
from llm_analyzer import analyze_patterns_with_gpt, validate_analysis_result
from pattern_storage import save_weekly_analysis, get_weekly_analysis, get_pattern_history
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/patterns", tags=["patterns"])

# 애플리케이션 시작 시 테이블 생성
@router.on_event("startup")
async def startup_event():
    create_tables()
    logger.info("패턴 분석 테이블 생성 완료")

@router.post("/weekly/analyze", response_model=WeeklyAnalysisResponse)
async def analyze_weekly_patterns(
    request: WeeklyAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """주간 거래 패턴 분석 수행"""
    try:
        # 날짜 파싱
        try:
            start_date = datetime.strptime(request.start, "%Y-%m-%d").date()
            end_date = datetime.strptime(request.end, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요."
            )
        
        # 기간 유효성 검사
        if start_date >= end_date:
            raise HTTPException(
                status_code=400,
                detail="시작 날짜는 종료 날짜보다 이전이어야 합니다."
            )
        
        # 기존 분석 결과 확인
        existing_analysis = get_weekly_analysis(db, request.user_id, start_date, end_date)
        if existing_analysis:
            logger.info(f"기존 분석 결과 반환: user_id={request.user_id}, period={start_date}~{end_date}")
            return WeeklyAnalysisResponse(
                success=True,
                analysis=WeeklyAnalysisResult(**existing_analysis),
                message="기존 분석 결과를 반환했습니다."
            )
        
        # 주간 집계 데이터 생성
        logger.info(f"주간 분석 데이터 생성 시작: user_id={request.user_id}")
        analysis_data = generate_weekly_analysis_data(db, request.user_id, start_date, end_date)
        
        # 데이터 유효성 검사
        if not any(analysis_data.values()):
            raise HTTPException(
                status_code=404,
                detail="분석할 거래 데이터가 없습니다."
            )
        
        # GPT 분석 수행
        logger.info("GPT 패턴 분석 시작")
        gpt_result = await analyze_patterns_with_gpt(analysis_data)
        
        if not gpt_result:
            raise HTTPException(
                status_code=500,
                detail="패턴 분석에 실패했습니다. 잠시 후 다시 시도해주세요."
            )
        
        # 결과 유효성 검증
        if not validate_analysis_result(gpt_result):
            logger.error(f"GPT 응답 유효성 검증 실패: {gpt_result}")
            raise HTTPException(
                status_code=500,
                detail="분석 결과 형식이 올바르지 않습니다."
            )
        
        # DB 저장
        summary_id = save_weekly_analysis(db, request.user_id, start_date, end_date, gpt_result)
        
        if not summary_id:
            logger.error("분석 결과 DB 저장 실패")
            # 저장 실패해도 분석 결과는 반환
            
        logger.info(f"주간 패턴 분석 완료: user_id={request.user_id}, summary_id={summary_id}")
        
        return WeeklyAnalysisResponse(
            success=True,
            summary_id=summary_id,
            analysis=WeeklyAnalysisResult(**gpt_result),
            message="주간 패턴 분석이 완료되었습니다."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"주간 패턴 분석 중 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail="서버 내부 오류가 발생했습니다."
        )

@router.get("/history", response_model=PatternHistoryResponse)
async def get_patterns_history(
    user_id: str,
    pattern_type: Optional[str] = None,  # 'loss' or 'profit'
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """패턴 히스토리 조회"""
    try:
        # 패턴 타입 유효성 검사
        if pattern_type and pattern_type not in ['loss', 'profit']:
            raise HTTPException(
                status_code=400,
                detail="pattern_type은 'loss' 또는 'profit'이어야 합니다."
            )
        
        # 히스토리 조회
        patterns_data = get_pattern_history(db, user_id, pattern_type, limit)
        
        patterns = [PatternHistoryItem(**pattern) for pattern in patterns_data]
        
        return PatternHistoryResponse(
            patterns=patterns,
            total=len(patterns)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"패턴 히스토리 조회 중 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail="서버 내부 오류가 발생했습니다."
        )

@router.get("/weekly/{summary_id}", response_model=WeeklyAnalysisResponse)
async def get_weekly_analysis_by_id(
    summary_id: int,
    user_id: str,
    db: Session = Depends(get_db)
):
    """특정 주간 분석 결과 조회"""
    try:
        from database import PatternsSummaryWeekly
        
        # 분석 결과 조회
        summary_record = db.query(PatternsSummaryWeekly).filter(
            PatternsSummaryWeekly.id == summary_id,
            PatternsSummaryWeekly.user_id == user_id
        ).first()
        
        if not summary_record:
            raise HTTPException(
                status_code=404,
                detail="요청한 분석 결과를 찾을 수 없습니다."
            )
        
        return WeeklyAnalysisResponse(
            success=True,
            summary_id=summary_record.id,
            analysis=WeeklyAnalysisResult(**summary_record.summary_json),
            message="분석 결과를 성공적으로 조회했습니다."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"주간 분석 결과 조회 중 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail="서버 내부 오류가 발생했습니다."
        )
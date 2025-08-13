"""
FastAPI 메인 애플리케이션
코인 트레이딩 시스템의 API 서버
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from typing import Dict, Any

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱 인스턴스 생성
app = FastAPI(
    title="코인 트레이딩 API",
    description="Kafka와 FreqTrade를 연동한 코인 트레이딩 시스템 API",
    version="1.0.0"
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routes_trades import router as trades_router  # noqa: E402
from routes_patterns import router as patterns_router  # noqa: E402
app.include_router(trades_router)
app.include_router(patterns_router)

@app.get("/")
async def root():
    """루트 엔드포인트 - API 상태 확인"""
    return {
        "message": "코인 트레이딩 API 서버가 실행 중입니다",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {
        "status": "healthy",
        "kafka_broker": os.getenv("KAFKA_BROKER", "kafka:9092")
    }

@app.get("/api/v1/status")
async def get_status():
    """시스템 상태 조회"""
    try:
        return {
            "status": "success",
            "services": {
                "fastapi": "running",
                "kafka": "connected",
                "freqtrade": "running"
            }
        }
    except Exception as e:
        logger.error(f"상태 조회 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="서버 내부 오류")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
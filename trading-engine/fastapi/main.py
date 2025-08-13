"""
FastAPI 메인 애플리케이션
코인 트레이딩 시스템의 API 서버
"""

import asyncio
import json
import logging
import os
import sys
from typing import Dict, Any, List
from datetime import datetime
import numpy as np

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import aiokafka
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

from models import ScoreRequest, ScoreResponse, Candle, TradeInfo, TimeframeEnum, TradeScoreResponse
from scorer import BreakoutScorer
from strategy_scorers import BreakoutScorer as NewBreakoutScorer, TrendScorer, MeanReversionScorer

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def convert_numpy_types(obj):
    """numpy 타입을 Python 기본 타입으로 변환"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    else:
        return obj

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

# app 디렉토리의 라우터 포함 (거래 기록 및 패턴 분석)
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.routes_trades import router as trades_router
from app.routes_patterns import router as patterns_router
from app.database import create_tables
app.include_router(trades_router)
app.include_router(patterns_router)

# 전역 변수
kafka_producer: AIOKafkaProducer = None
kafka_consumer: AIOKafkaConsumer = None
scorer = BreakoutScorer()

# 새로운 스코어러들
breakout_scorer = NewBreakoutScorer()
trend_scorer = TrendScorer()
mean_reversion_scorer = MeanReversionScorer()

@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    global kafka_producer, kafka_consumer
    # 데이터베이스 테이블 생성
    create_tables()

    try:
        # Kafka 프로듀서 초기화
        kafka_producer = AIOKafkaProducer(
            bootstrap_servers=os.getenv("KAFKA_BROKER", "kafka:9092"),
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        await kafka_producer.start()
        logger.info("Kafka 프로듀서가 시작되었습니다.")
        
        # Kafka 컨슈머 초기화
        kafka_consumer = AIOKafkaConsumer(
            'trade.raw',
            bootstrap_servers=os.getenv("KAFKA_BROKER", "kafka:9092"),
            group_id='fastapi_scorer_group',
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        await kafka_consumer.start()
        logger.info("Kafka 컨슈머가 시작되었습니다.")
        
        # 백그라운드에서 메시지 처리 시작
        asyncio.create_task(process_trade_messages())
        
    except Exception as e:
        logger.error(f"Kafka 연결 중 오류 발생: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 실행"""
    global kafka_producer, kafka_consumer
    
    try:
        if kafka_producer:
            await kafka_producer.stop()
            logger.info("Kafka 프로듀서가 종료되었습니다.")
        
        if kafka_consumer:
            await kafka_consumer.stop()
            logger.info("Kafka 컨슈머가 종료되었습니다.")
            
    except Exception as e:
        logger.error(f"Kafka 종료 중 오류 발생: {e}")

@app.get("/")
async def root():
    """루트 엔드포인트 - API 상태 확인"""
    return {
        "message": "코인 트레이딩 API 서버가 실행 중입니다",
        "status": "running",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    kafka_status = "connected" if kafka_producer and kafka_consumer else "disconnected"
    
    return {
        "status": "healthy",
        "kafka_broker": os.getenv("KAFKA_BROKER", "kafka:9092"),
        "kafka_status": kafka_status,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/status")
async def get_status():
    """시스템 상태 조회"""
    try:
        kafka_status = "connected" if kafka_producer and kafka_consumer else "disconnected"
        
        return {
            "status": "success",
            "services": {
                "fastapi": "running",
                "kafka": kafka_status,
                "freqtrade": "running"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"상태 조회 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="서버 내부 오류")

@app.post("/score", response_model=ScoreResponse)
async def calculate_score(request: ScoreRequest):
    """
    돌파매매 점수 계산 엔드포인트
    
    Args:
        request: 점수 계산 요청 데이터
        
    Returns:
        점수 계산 결과
    """
    try:
        logger.info(f"점수 계산 요청: {request.symbol}, 캔들 수: {len(request.candles)}")
        
        # 점수 계산
        result = scorer.breakout_score(request)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        # ScoreResponse 형식으로 변환
        response = ScoreResponse(
            symbol=result["symbol"],
            timestamp=datetime.fromisoformat(result["timestamp"]),
            score=result["total_score"],
            signal=result["signal"],
            confidence=result["confidence"],
            indicators=result.get("indicators"),
            reasoning=result.get("reasoning")
        )
        
        logger.info(f"점수 계산 완료: {result['symbol']}, 점수: {result['total_score']:.3f}, 신호: {result['signal']}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"점수 계산 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="점수 계산 중 오류가 발생했습니다")

async def process_trade_messages():
    """
    Kafka에서 trade.raw 토픽의 메시지를 소비하고
    점수 계산 후 trade.score 토픽으로 발행하는 비동기 함수
    """
    global kafka_producer, kafka_consumer
    
    if not kafka_consumer or not kafka_producer:
        logger.error("Kafka 연결이 설정되지 않았습니다.")
        return
    
    try:
        async for message in kafka_consumer:
            try:
                # 메시지 파싱
                trade_data = message.value
                logger.info(f"메시지 수신: {trade_data}")
                
                # 거래 정보 검증
                if not _validate_trade_message(trade_data):
                    logger.warning(f"유효하지 않은 거래 메시지: {trade_data}")
                    continue
                
                # 캔들 데이터 추출 (실제 구현에서는 거래소 API에서 가져와야 함)
                candles = await _get_candles_for_trade(trade_data)
                
                if not candles:
                    logger.warning(f"캔들 데이터를 가져올 수 없음: {trade_data}")
                    continue
                
                # 점수 계산 요청 생성
                score_request = ScoreRequest(
                    symbol=trade_data["pair"],
                    timeframe=TimeframeEnum.FIVE_MINUTES,
                    candles=candles,
                    strategy_name=trade_data.get("strategy", "BreakoutStrategy"),
                    parameters=trade_data.get("parameters"),
                    include_indicators=True,
                    include_signals=True
                )
                
                # 점수 계산
                score_result = scorer.breakout_score(score_request)
                
                if "error" in score_result:
                    logger.error(f"점수 계산 오류: {score_result['error']}")
                    continue
                
                # 결과에 거래 정보 추가
                score_result["trade_info"] = trade_data
                score_result["processed_at"] = datetime.now().isoformat()
                
                # trade.score 토픽으로 발행
                await kafka_producer.send_and_wait(
                    'trade.score',
                    value=score_result
                )
                
                logger.info(f"점수 계산 결과 발행: {trade_data['pair']}, 점수: {score_result['total_score']:.3f}")
                
            except Exception as e:
                logger.error(f"메시지 처리 중 오류 발생: {e}")
                continue
                
    except Exception as e:
        logger.error(f"Kafka 메시지 처리 중 오류 발생: {e}")

def _validate_trade_message(trade_data: Dict[str, Any]) -> bool:
    """거래 메시지 유효성 검사"""
    required_fields = ["pair", "side", "amount", "price", "timestamp"]
    
    for field in required_fields:
        if field not in trade_data:
            return False
    
    # 거래 방향 검사
    if trade_data["side"] not in ["buy", "sell"]:
        return False
    
    # 가격과 수량이 양수인지 검사
    if trade_data["price"] <= 0 or trade_data["amount"] <= 0:
        return False
    
    return True

async def _get_candles_for_trade(trade_data: Dict[str, Any]) -> List[Candle]:
    """거래소 API에서 캔들 데이터를 조회한다."""
    symbol = trade_data["pair"].replace("/", "")
    url = "https://api.binance.com/api/v3/klines"
    params = {"symbol": symbol, "interval": "5m", "limit": 100}

    try:
        import httpx

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        candles: List[Candle] = []
        for c in data:
            candles.append(
                Candle(
                    timestamp=c[0],
                    open=float(c[1]),
                    high=float(c[2]),
                    low=float(c[3]),
                    close=float(c[4]),
                    volume=float(c[5]),
                    symbol=trade_data["pair"],
                    timeframe=TimeframeEnum.FIVE_MINUTES,
                )
            )

        return candles

    except httpx.HTTPError as e:
        logger.error(f"캔들 데이터 HTTP 오류: {e}")
        raise HTTPException(status_code=502, detail="캔들 데이터를 가져오지 못했습니다")
    except Exception as e:
        logger.error(f"캔들 데이터 파싱 오류: {e}")
        raise HTTPException(status_code=500, detail="캔들 데이터 처리 중 오류가 발생했습니다")

@app.get("/test")
async def test_endpoint():
    """간단한 테스트 엔드포인트"""
    return {
        "message": "테스트 성공",
        "timestamp": datetime.now().isoformat(),
        "status": "ok"
    }

@app.post("/api/v1/trade/score", response_model=TradeScoreResponse)
async def trade_score_endpoint(trade_info: TradeInfo):
    """
    거래 정보를 받아서 점수를 계산하는 엔드포인트
    """
    try:
        logger.info(f"거래 점수 계산 요청: {trade_info.pair}")
        
        # 거래 정보를 딕셔너리로 변환
        trade_data = {
            "pair": trade_info.pair,
            "side": trade_info.side,
            "amount": trade_info.amount,
            "price": trade_info.price,
            "timestamp": trade_info.timestamp.isoformat(),
            "strategy": trade_info.strategy,
            "confidence": trade_info.confidence,
            "stop_loss": trade_info.stop_loss,
            "take_profit": trade_info.take_profit,
            "metadata": trade_info.metadata
        }
        
        logger.info("캔들 데이터 가져오기 시작")
        # 캔들 데이터 가져오기
        candles = await _get_candles_for_trade(trade_data)
        logger.info(f"캔들 데이터 가져오기 완료: {len(candles)}개")
        
        if not candles:
            raise HTTPException(status_code=400, detail="캔들 데이터를 가져올 수 없습니다")
        
        logger.info("점수 계산 요청 생성")
        # 점수 계산 요청 생성
        score_request = ScoreRequest(
            symbol=trade_info.pair,
            timeframe=TimeframeEnum.FIVE_MINUTES,
            candles=candles,
            strategy_name=trade_info.strategy,
            parameters=trade_info.metadata,
            include_indicators=True,
            include_signals=True
        )
        
        logger.info("점수 계산 시작")
        # 점수 계산
        result = scorer.breakout_score(score_request)
        logger.info("점수 계산 완료")
        
        if "error" in result:
            logger.error(f"점수 계산 오류: {result['error']}")
            raise HTTPException(status_code=400, detail=result["error"])
        
        logger.info("응답 데이터 구성")
        
        # 실제 계산된 점수 사용 (numpy 타입 변환)
        actual_score = float(result.get("total_score", 0.0)) if hasattr(result.get("total_score", 0.0), 'item') else float(result.get("total_score", 0.0))
        actual_confidence = float(result.get("confidence", 0.0)) if hasattr(result.get("confidence", 0.0), 'item') else float(result.get("confidence", 0.0))
        actual_signal = result.get("signal", "hold")
        actual_reasoning = result.get("reasoning", "")
        
        # 점수를 100점 만점으로 변환
        score_100 = round(actual_score * 100, 1)  # 33.9점으로 표시
        
        # sub_scores 변환 (100점 만점으로)
        actual_sub_scores = {}
        if "sub_scores" in result:
            for key, value in result["sub_scores"].items():
                if hasattr(value, 'item'):
                    actual_sub_scores[key] = round(float(value) * 100, 1)
                else:
                    actual_sub_scores[key] = round(float(value) * 100, 1)
        
        # indicators 변환
        actual_indicators = result.get("indicators", {})
        
        logger.info("응답 구성 시작")
        
        # 실제 계산된 값 사용 (100점 만점으로 표시)
        response = {
            "status": "success",
            "symbol": trade_info.pair,
            "timestamp": datetime.now().isoformat(),
            "total_score": score_100,  # 100점 만점으로 표시 (예: 33.9)
            "score_percentage": f"{score_100}%",  # 퍼센트 표시
            "signal": actual_signal,
            "confidence": actual_confidence,
            "indicators": actual_indicators,
            "reasoning": actual_reasoning,
            "trade_info": {
                "pair": trade_info.pair,
                "side": trade_info.side,
                "amount": trade_info.amount,
                "price": trade_info.price,
                "timestamp": trade_info.timestamp.isoformat(),
                "strategy": trade_info.strategy,
                "confidence": trade_info.confidence,
                "stop_loss": trade_info.stop_loss,
                "take_profit": trade_info.take_profit,
                "metadata": trade_info.metadata
            },
            "processed_at": datetime.now().isoformat(),
            "sub_scores": actual_sub_scores
        }
        
        logger.info("응답 구성 완료")
        logger.info(f"응답 전송: {response['symbol']}, 점수: {response['total_score']}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"거래 점수 계산 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="거래 점수 계산 중 오류가 발생했습니다")

@app.post("/api/v1/trade/breakout", response_model=TradeScoreResponse)
async def breakout_score_endpoint(trade_info: TradeInfo):
    """
    돌파매매 점수 계산 엔드포인트
    """
    try:
        logger.info(f"돌파매매 점수 계산 요청: {trade_info.pair}")
        
        # 거래 정보를 딕셔너리로 변환
        trade_data = {
            "pair": trade_info.pair,
            "side": trade_info.side,
            "amount": trade_info.amount,
            "price": trade_info.price,
            "timestamp": trade_info.timestamp.isoformat(),
            "strategy": trade_info.strategy,
            "confidence": trade_info.confidence,
            "stop_loss": trade_info.stop_loss,
            "take_profit": trade_info.take_profit,
            "metadata": trade_info.metadata
        }
        
        logger.info("캔들 데이터 가져오기 시작")
        # 캔들 데이터 가져오기
        candles = await _get_candles_for_trade(trade_data)
        logger.info(f"캔들 데이터 가져오기 완료: {len(candles)}개")
        
        if not candles:
            raise HTTPException(status_code=400, detail="캔들 데이터를 가져올 수 없습니다")
        
        logger.info("돌파매매 점수 계산 요청 생성")
        # 점수 계산 요청 생성
        score_request = ScoreRequest(
            symbol=trade_info.pair,
            timeframe=TimeframeEnum.FIVE_MINUTES,
            candles=candles,
            strategy_name="BreakoutStrategy",
            parameters=trade_info.metadata,
            include_indicators=True,
            include_signals=True
        )
        
        logger.info("돌파매매 점수 계산 시작")
        # 돌파매매 점수 계산
        result = breakout_scorer.calculate_score(score_request)
        logger.info("돌파매매 점수 계산 완료")
        
        if "error" in result:
            logger.error(f"돌파매매 점수 계산 오류: {result['error']}")
            raise HTTPException(status_code=400, detail=result["error"])
        
        logger.info("응답 데이터 구성")
        
        # 실제 계산된 점수 사용
        actual_score = float(result.get("total_score", 0.0))
        actual_confidence = float(result.get("confidence", 0.0))
        actual_signal = result.get("signal", "hold")
        actual_reasoning = result.get("reasoning", "")
        
        # sub_scores 변환
        actual_sub_scores = result.get("sub_scores", {})
        
        logger.info("응답 구성 시작")
        
        # 실제 계산된 값 사용
        response = {
            "status": "success",
            "symbol": trade_info.pair,
            "timestamp": datetime.now().isoformat(),
            "total_score": actual_score,  # 100점 만점
            "signal": actual_signal,
            "confidence": actual_confidence,
            "indicators": {},
            "reasoning": actual_reasoning,
            "trade_info": {
                "pair": trade_info.pair,
                "side": trade_info.side,
                "amount": trade_info.amount,
                "price": trade_info.price,
                "timestamp": trade_info.timestamp.isoformat(),
                "strategy": trade_info.strategy,
                "confidence": trade_info.confidence,
                "stop_loss": trade_info.stop_loss,
                "take_profit": trade_info.take_profit,
                "metadata": trade_info.metadata
            },
            "processed_at": datetime.now().isoformat(),
            "sub_scores": actual_sub_scores
        }
        
        logger.info("응답 구성 완료")
        logger.info(f"응답 전송: {response['symbol']}, 점수: {response['total_score']}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"돌파매매 점수 계산 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="돌파매매 점수 계산 중 오류가 발생했습니다")

@app.post("/api/v1/trade/trend", response_model=TradeScoreResponse)
async def trend_score_endpoint(trade_info: TradeInfo):
    """
    추세매매 점수 계산 엔드포인트
    """
    try:
        logger.info(f"추세매매 점수 계산 요청: {trade_info.pair}")
        
        # 거래 정보를 딕셔너리로 변환
        trade_data = {
            "pair": trade_info.pair,
            "side": trade_info.side,
            "amount": trade_info.amount,
            "price": trade_info.price,
            "timestamp": trade_info.timestamp.isoformat(),
            "strategy": trade_info.strategy,
            "confidence": trade_info.confidence,
            "stop_loss": trade_info.stop_loss,
            "take_profit": trade_info.take_profit,
            "metadata": trade_info.metadata
        }
        
        logger.info("캔들 데이터 가져오기 시작")
        # 캔들 데이터 가져오기
        candles = await _get_candles_for_trade(trade_data)
        logger.info(f"캔들 데이터 가져오기 완료: {len(candles)}개")
        
        if not candles:
            raise HTTPException(status_code=400, detail="캔들 데이터를 가져올 수 없습니다")
        
        logger.info("추세매매 점수 계산 요청 생성")
        # 점수 계산 요청 생성
        score_request = ScoreRequest(
            symbol=trade_info.pair,
            timeframe=TimeframeEnum.FIVE_MINUTES,
            candles=candles,
            strategy_name="TrendStrategy",
            parameters=trade_info.metadata,
            include_indicators=True,
            include_signals=True
        )
        
        logger.info("추세매매 점수 계산 시작")
        # 추세매매 점수 계산
        result = trend_scorer.calculate_score(score_request)
        logger.info("추세매매 점수 계산 완료")
        
        if "error" in result:
            logger.error(f"추세매매 점수 계산 오류: {result['error']}")
            raise HTTPException(status_code=400, detail=result["error"])
        
        logger.info("응답 데이터 구성")
        
        # 실제 계산된 점수 사용
        actual_score = float(result.get("total_score", 0.0))
        actual_confidence = float(result.get("confidence", 0.0))
        actual_signal = result.get("signal", "hold")
        actual_reasoning = result.get("reasoning", "")
        
        # sub_scores 변환
        actual_sub_scores = result.get("sub_scores", {})
        
        logger.info("응답 구성 시작")
        
        # 실제 계산된 값 사용
        response = {
            "status": "success",
            "symbol": trade_info.pair,
            "timestamp": datetime.now().isoformat(),
            "total_score": actual_score,  # 100점 만점
            "signal": actual_signal,
            "confidence": actual_confidence,
            "indicators": {},
            "reasoning": actual_reasoning,
            "trade_info": {
                "pair": trade_info.pair,
                "side": trade_info.side,
                "amount": trade_info.amount,
                "price": trade_info.price,
                "timestamp": trade_info.timestamp.isoformat(),
                "strategy": trade_info.strategy,
                "confidence": trade_info.confidence,
                "stop_loss": trade_info.stop_loss,
                "take_profit": trade_info.take_profit,
                "metadata": trade_info.metadata
            },
            "processed_at": datetime.now().isoformat(),
            "sub_scores": actual_sub_scores
        }
        
        logger.info("응답 구성 완료")
        logger.info(f"응답 전송: {response['symbol']}, 점수: {response['total_score']}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"추세매매 점수 계산 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="추세매매 점수 계산 중 오류가 발생했습니다")

@app.post("/api/v1/trade/mean_reversion", response_model=TradeScoreResponse)
async def mean_reversion_score_endpoint(trade_info: TradeInfo):
    """
    역추세매매 점수 계산 엔드포인트
    """
    try:
        logger.info(f"역추세매매 점수 계산 요청: {trade_info.pair}")
        
        # 거래 정보를 딕셔너리로 변환
        trade_data = {
            "pair": trade_info.pair,
            "side": trade_info.side,
            "amount": trade_info.amount,
            "price": trade_info.price,
            "timestamp": trade_info.timestamp.isoformat(),
            "strategy": trade_info.strategy,
            "confidence": trade_info.confidence,
            "stop_loss": trade_info.stop_loss,
            "take_profit": trade_info.take_profit,
            "metadata": trade_info.metadata
        }
        
        logger.info("캔들 데이터 가져오기 시작")
        # 캔들 데이터 가져오기
        candles = await _get_candles_for_trade(trade_data)
        logger.info(f"캔들 데이터 가져오기 완료: {len(candles)}개")
        
        if not candles:
            raise HTTPException(status_code=400, detail="캔들 데이터를 가져올 수 없습니다")
        
        logger.info("역추세매매 점수 계산 요청 생성")
        # 점수 계산 요청 생성
        score_request = ScoreRequest(
            symbol=trade_info.pair,
            timeframe=TimeframeEnum.FIVE_MINUTES,
            candles=candles,
            strategy_name="MeanReversionStrategy",
            parameters=trade_info.metadata,
            include_indicators=True,
            include_signals=True
        )
        
        logger.info("역추세매매 점수 계산 시작")
        # 역추세매매 점수 계산
        result = mean_reversion_scorer.calculate_score(score_request)
        logger.info("역추세매매 점수 계산 완료")
        
        if "error" in result:
            logger.error(f"역추세매매 점수 계산 오류: {result['error']}")
            raise HTTPException(status_code=400, detail=result["error"])
        
        logger.info("응답 데이터 구성")
        
        # 실제 계산된 점수 사용
        actual_score = float(result.get("total_score", 0.0))
        actual_confidence = float(result.get("confidence", 0.0))
        actual_signal = result.get("signal", "hold")
        actual_reasoning = result.get("reasoning", "")
        
        # sub_scores 변환
        actual_sub_scores = result.get("sub_scores", {})
        
        logger.info("응답 구성 시작")
        
        # 실제 계산된 값 사용
        response = {
            "status": "success",
            "symbol": trade_info.pair,
            "timestamp": datetime.now().isoformat(),
            "total_score": actual_score,  # 100점 만점
            "signal": actual_signal,
            "confidence": actual_confidence,
            "indicators": {},
            "reasoning": actual_reasoning,
            "trade_info": {
                "pair": trade_info.pair,
                "side": trade_info.side,
                "amount": trade_info.amount,
                "price": trade_info.price,
                "timestamp": trade_info.timestamp.isoformat(),
                "strategy": trade_info.strategy,
                "confidence": trade_info.confidence,
                "stop_loss": trade_info.stop_loss,
                "take_profit": trade_info.take_profit,
                "metadata": trade_info.metadata
            },
            "processed_at": datetime.now().isoformat(),
            "sub_scores": actual_sub_scores
        }
        
        logger.info("응답 구성 완료")
        logger.info(f"응답 전송: {response['symbol']}, 점수: {response['total_score']}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"역추세매매 점수 계산 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="역추세매매 점수 계산 중 오류가 발생했습니다")

if __name__ == "__main__":
    import uvicorn
    
    # 환경 변수 설정
    os.environ.setdefault("KAFKA_BROKER", "kafka:9092")
    
    # FastAPI 앱 실행
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 
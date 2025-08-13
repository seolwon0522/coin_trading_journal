# 데이터베이스 연결 및 스키마 정의
from sqlalchemy import create_engine, Column, BigInteger, UUID, Date, Text, DateTime, Integer, Float, ForeignKey, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
import os

# PostgreSQL 연결 설정
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/trading_journal")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class PatternsSummaryWeekly(Base):
    """주간 패턴 분석 요약 테이블"""
    __tablename__ = "patterns_summary_weekly"
    
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(UUID, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    summary_json = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PatternHistory(Base):
    """패턴 히스토리 테이블"""
    __tablename__ = "pattern_history"
    
    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(UUID, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    pattern_type = Column(Text, nullable=False)  # 'loss' or 'profit'
    title = Column(Text, nullable=False)
    why = Column(Text, nullable=False)
    actions = Column(ARRAY(Text), nullable=True)
    summary_id = Column(BigInteger, ForeignKey("patterns_summary_weekly.id"))
    created_at = Column(DateTime, default=datetime.utcnow)


class TradeModel(Base):
    """거래 기록 테이블"""
    __tablename__ = "trades"

    id = Column(BigInteger, primary_key=True, index=True)
    symbol = Column(Text, nullable=False)
    type = Column(Text, nullable=False)
    trading_type = Column(Text, nullable=False)
    quantity = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    entry_time = Column(DateTime, nullable=False)
    exit_time = Column(DateTime, nullable=True)
    memo = Column(Text, nullable=True)
    pnl = Column(Float, nullable=True)
    status = Column(Text, nullable=False)
    stop_loss = Column(Float, nullable=True)
    indicators = Column(JSONB, nullable=True)
    strategy_score = Column(JSONB, nullable=True)
    forbidden_penalty = Column(Integer, nullable=True)
    final_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 테이블 생성
def create_tables():
    """데이터베이스 테이블 생성"""
    Base.metadata.create_all(bind=engine)

# DB 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

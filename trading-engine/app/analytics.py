# 주간 거래 데이터 분석 및 집계 기능
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
import csv
import io

def get_week_period_dates(start_date: date, end_date: date) -> Tuple[date, date]:
    """주어진 기간과 동일한 길이의 이전 주 기간 계산"""
    period_length = (end_date - start_date).days
    prev_end = start_date - timedelta(days=1)
    prev_start = prev_end - timedelta(days=period_length)
    return prev_start, prev_end

def aggregate_strategy_performance(db: Session, user_id: str, start_date: date, end_date: date) -> str:
    """전략별 성과 집계 및 CSV 문자열 생성"""
    query = text("""
        SELECT 
            trading_type as strategy,
            COUNT(*) as total_trades,
            COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
            ROUND(AVG(CASE WHEN pnl > 0 THEN pnl ELSE NULL END)::numeric, 2) as avg_win,
            ROUND(AVG(CASE WHEN pnl <= 0 THEN pnl ELSE NULL END)::numeric, 2) as avg_loss,
            ROUND(AVG(pnl)::numeric, 2) as avg_pnl,
            ROUND(SUM(pnl)::numeric, 2) as total_pnl,
            ROUND(AVG(final_score), 1) as avg_score
        FROM trades 
        WHERE user_id::text = :user_id 
        AND DATE(entry_time) BETWEEN :start_date AND :end_date
        AND trading_type IS NOT NULL
        GROUP BY trading_type
        ORDER BY total_trades DESC
    """)
    
    result = db.execute(query, {
        "user_id": user_id, 
        "start_date": start_date, 
        "end_date": end_date
    }).fetchall()
    
    # CSV 형식 문자열 생성
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['strategy', 'total_trades', 'winning_trades', 'win_rate', 'avg_win', 'avg_loss', 'avg_pnl', 'total_pnl', 'avg_score'])
    
    for row in result:
        win_rate = round((row.winning_trades / row.total_trades * 100), 1) if row.total_trades > 0 else 0
        writer.writerow([
            row.strategy, row.total_trades, row.winning_trades, f"{win_rate}%",
            row.avg_win or 0, row.avg_loss or 0, row.avg_pnl or 0, row.total_pnl or 0, row.avg_score or 0
        ])
    
    return output.getvalue().strip()

def aggregate_penalty_violations(db: Session, user_id: str, start_date: date, end_date: date) -> str:
    """금기룰 위반율 집계 및 CSV 문자열 생성"""
    query = text("""
        SELECT 
            fv.rule_code,
            COUNT(*) as violation_count,
            COUNT(DISTINCT t.id) as trades_with_violation,
            ROUND(AVG(fv.penalty_score), 1) as avg_penalty,
            ROUND(SUM(fv.penalty_score), 1) as total_penalty
        FROM trades t
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.forbidden_violations, '[]'::jsonb)) as fv_data
        JOIN LATERAL jsonb_to_record(fv_data) as fv(rule_code text, penalty_score numeric) ON true
        WHERE t.user_id::text = :user_id 
        AND DATE(t.entry_time) BETWEEN :start_date AND :end_date
        GROUP BY fv.rule_code
        ORDER BY violation_count DESC
    """)
    
    result = db.execute(query, {
        "user_id": user_id, 
        "start_date": start_date, 
        "end_date": end_date
    }).fetchall()
    
    # 전체 거래 수 조회
    total_trades_query = text("""
        SELECT COUNT(*) as total 
        FROM trades 
        WHERE user_id::text = :user_id 
        AND DATE(entry_time) BETWEEN :start_date AND :end_date
    """)
    total_trades = db.execute(total_trades_query, {
        "user_id": user_id, 
        "start_date": start_date, 
        "end_date": end_date
    }).scalar()
    
    # CSV 형식 문자열 생성
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['rule_code', 'violation_count', 'trades_with_violation', 'violation_rate', 'avg_penalty', 'total_penalty'])
    
    for row in result:
        violation_rate = round((row.trades_with_violation / total_trades * 100), 1) if total_trades > 0 else 0
        writer.writerow([
            row.rule_code, row.violation_count, row.trades_with_violation, 
            f"{violation_rate}%", row.avg_penalty, row.total_penalty
        ])
    
    return output.getvalue().strip()

def aggregate_time_performance(db: Session, user_id: str, start_date: date, end_date: date) -> str:
    """시간대별 성과 집계 및 CSV 문자열 생성"""
    query = text("""
        SELECT 
            EXTRACT(HOUR FROM entry_time) as hour_of_day,
            COUNT(*) as total_trades,
            COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
            ROUND(AVG(pnl)::numeric, 2) as avg_pnl,
            ROUND(SUM(pnl)::numeric, 2) as total_pnl,
            ROUND(AVG(final_score), 1) as avg_score
        FROM trades 
        WHERE user_id::text = :user_id 
        AND DATE(entry_time) BETWEEN :start_date AND :end_date
        GROUP BY EXTRACT(HOUR FROM entry_time)
        HAVING COUNT(*) >= 2  -- 최소 2건 이상인 시간대만
        ORDER BY total_trades DESC
    """)
    
    result = db.execute(query, {
        "user_id": user_id, 
        "start_date": start_date, 
        "end_date": end_date
    }).fetchall()
    
    # CSV 형식 문자열 생성
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['hour_of_day', 'total_trades', 'winning_trades', 'win_rate', 'avg_pnl', 'total_pnl', 'avg_score'])
    
    for row in result:
        win_rate = round((row.winning_trades / row.total_trades * 100), 1) if row.total_trades > 0 else 0
        writer.writerow([
            f"{int(row.hour_of_day):02d}:00", row.total_trades, row.winning_trades, 
            f"{win_rate}%", row.avg_pnl, row.total_pnl, row.avg_score
        ])
    
    return output.getvalue().strip()

def generate_weekly_analysis_data(db: Session, user_id: str, start_date: date, end_date: date) -> Dict[str, str]:
    """주간 분석을 위한 모든 집계 데이터 생성"""
    # 이번 주 데이터
    this_week_strategy = aggregate_strategy_performance(db, user_id, start_date, end_date)
    this_week_penalty = aggregate_penalty_violations(db, user_id, start_date, end_date)
    this_week_time = aggregate_time_performance(db, user_id, start_date, end_date)
    
    # 지난 주 데이터 (동일 기간 길이)
    prev_start, prev_end = get_week_period_dates(start_date, end_date)
    last_week_strategy = aggregate_strategy_performance(db, user_id, prev_start, prev_end)
    last_week_penalty = aggregate_penalty_violations(db, user_id, prev_start, prev_end)
    last_week_time = aggregate_time_performance(db, user_id, prev_start, prev_end)
    
    return {
        "this_week_strategy_csv": this_week_strategy,
        "this_week_penalty_csv": this_week_penalty,
        "this_week_time_csv": this_week_time,
        "last_week_strategy_csv": last_week_strategy,
        "last_week_penalty_csv": last_week_penalty,
        "last_week_time_csv": last_week_time
    }
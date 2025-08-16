"""
백테스트 결과를 PostgreSQL에 저장하고 조회하는 관리자
CSV 파일 의존성을 제거하고 데이터베이스 기반으로 전환
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import json

logger = logging.getLogger(__name__)

class BacktestDatabaseManager:
    """백테스트 결과 데이터베이스 관리자"""
    
    def __init__(self, database_url: Optional[str] = None):
        """
        데이터베이스 매니저 초기화
        
        Args:
            database_url: PostgreSQL 연결 URL (None이면 환경변수에서 읽음)
        """
        self.database_url = database_url or os.getenv(
            "DATABASE_URL", 
            "postgresql://trading_user:trading_password@localhost:5432/trading_journal"
        )
        
        # SQLAlchemy 엔진 생성
        self.engine = create_engine(self.database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # CSV 기본 디렉토리 (자동매매/백테스트 결과 폴더) - 환경변수로 오버라이드 가능
        self.csv_dir = Path(os.getenv('AUTO_TRADE_CSV_DIR', 'data/backtest_results'))

        # 스키마 초기화
        self._initialize_schema()
    
    def _initialize_schema(self):
        """데이터베이스 스키마 초기화"""
        try:
            schema_file = Path(__file__).parent / "database_setup.sql"
            if schema_file.exists():
                with open(schema_file, 'r', encoding='utf-8') as f:
                    raw_sql = f.read()

                # 한글 주석: -- 로 시작하는 라인 주석 제거 및 공백/빈문 제외
                cleaned_lines = []
                for line in raw_sql.splitlines():
                    stripped = line.strip()
                    if not stripped or stripped.startswith('--'):
                        continue
                    cleaned_lines.append(line)
                cleaned_sql = '\n'.join(cleaned_lines)

                with self.engine.connect() as conn:
                    # 세미콜론 기준 분할 후 실행
                    statements = [stmt.strip() for stmt in cleaned_sql.split(';') if stmt.strip()]
                    for statement in statements:
                        conn.execute(text(statement))
                    conn.commit()
                
                logger.info("데이터베이스 스키마 초기화 완료")
            else:
                # 한글 주석: 최소 스키마 자동 생성 (database_setup.sql이 없을 경우 대비)
                try:
                    with self.engine.connect() as conn:
                        conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS backtest_runs (
                            id SERIAL PRIMARY KEY,
                            symbol VARCHAR(50) NOT NULL,
                            strategy_type VARCHAR(100) NULL,
                            start_date TIMESTAMP NULL,
                            end_date TIMESTAMP NULL,
                            timeframe VARCHAR(20) NULL,
                            total_trades INTEGER DEFAULT 0,
                            total_pnl DOUBLE PRECISION DEFAULT 0,
                            win_rate DOUBLE PRECISION DEFAULT 0,
                            max_drawdown DOUBLE PRECISION DEFAULT 0,
                            sharpe_ratio DOUBLE PRECISION DEFAULT 0,
                            created_at TIMESTAMP DEFAULT NOW()
                        );
                        """))
                        conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS backtest_trades (
                            id SERIAL PRIMARY KEY,
                            backtest_run_id INTEGER REFERENCES backtest_runs(id) ON DELETE CASCADE,
                            timestamp TIMESTAMP NULL,
                            symbol VARCHAR(50) NULL,
                            strategy_type VARCHAR(100) NULL,
                            entry_price DOUBLE PRECISION NULL,
                            stop_loss DOUBLE PRECISION NULL,
                            take_profit DOUBLE PRECISION NULL,
                            strategy_score DOUBLE PRECISION NULL,
                            confidence DOUBLE PRECISION NULL,
                            risk_level DOUBLE PRECISION NULL,
                            exit_price DOUBLE PRECISION NULL,
                            exit_timestamp TIMESTAMP NULL,
                            pnl DOUBLE PRECISION NULL,
                            return_pct DOUBLE PRECISION NULL,
                            duration_minutes DOUBLE PRECISION NULL,
                            exit_reason VARCHAR(100) NULL,
                            entry_timing_score DOUBLE PRECISION NULL,
                            exit_timing_score DOUBLE PRECISION NULL,
                            risk_mgmt_score DOUBLE PRECISION NULL,
                            pnl_ratio DOUBLE PRECISION NULL,
                            target_return_pct DOUBLE PRECISION NULL
                        );
                        """))
                        conn.commit()
                    logger.info("데이터베이스 최소 스키마 생성 완료 (폴백)")
                except Exception as inner_e:
                    logger.warning(f"database_setup.sql 파일을 찾을 수 없고 폴백 스키마 생성도 실패: {inner_e}")
                
        except Exception as e:
            logger.error(f"스키마 초기화 실패: {e}")
    
    def save_backtest_results(self, csv_file_path: str) -> int:
        """
        CSV 파일의 백테스트 결과를 데이터베이스에 저장
        
        Args:
            csv_file_path: 백테스트 결과 CSV 파일 경로
            
        Returns:
            저장된 백테스트 실행 ID
        """
        try:
            # CSV 파일 로드
            df = pd.read_csv(csv_file_path)
            logger.info(f"CSV 파일 로드: {len(df)}개 거래 데이터")
            if df is None or len(df) == 0:
                raise ValueError("빈 CSV 파일이거나 데이터가 없습니다")
            
            # 파일명에서 메타데이터 추출
            file_name = Path(csv_file_path).name
            # backtest_ETHUSDT_20250816_021446.csv 형식에서 추출
            parts = file_name.replace('.csv', '').split('_')
            if len(parts) >= 3:
                symbol = parts[1]
                timestamp_str = '_'.join(parts[2:])
            else:
                symbol = df['symbol'].iloc[0] if 'symbol' in df.columns else 'UNKNOWN'
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # 백테스트 실행 정보 생성
            # 안전한 날짜/전략 추출
            if 'timestamp' in df.columns and df['timestamp'].notna().any():
                start_date = pd.to_datetime(df['timestamp'], errors='coerce').min()
                end_date = pd.to_datetime(df['timestamp'], errors='coerce').max()
            else:
                start_date = None
                end_date = None
            strategy_type = (
                df['strategy_type'].iloc[0]
                if ('strategy_type' in df.columns and len(df['strategy_type']) > 0)
                else 'unknown'
            )
            
            # 집계 통계 계산
            total_trades = int(len(df))
            if 'pnl' in df.columns:
                total_pnl = float(round(df['pnl'].fillna(0).sum(), 6))
            else:
                total_pnl = 0.0
            if 'pnl' in df.columns and len(df['pnl']) > 0:
                wr = (df['pnl'] > 0).mean()
                win_rate = float(wr) if pd.notna(wr) else 0.0
            else:
                win_rate = 0.0
            
            # 맥스 드로우다운 계산 (간단한 버전)
            if 'pnl' in df.columns:
                cumulative_pnl = df['pnl'].cumsum()
                rolling_max = cumulative_pnl.cummax()
                drawdown = (cumulative_pnl - rolling_max) / rolling_max.replace(0, np.nan)
                max_drawdown = drawdown.min() if len(drawdown) > 0 else 0
            else:
                max_drawdown = 0
            
            # 샤프 비율 계산 (간단한 버전)
            if 'return_pct' in df.columns and len(df['return_pct']) > 1:
                returns = df['return_pct'] / 100  # 퍼센트를 소수로 변환
                std = returns.std()
                sharpe_ratio = float(returns.mean() / std) if std and std > 0 else 0.0
            else:
                sharpe_ratio = 0.0
            
            with self.engine.connect() as conn:
                # 백테스트 실행 정보 저장
                run_insert_sql = text("""
                    INSERT INTO backtest_runs 
                    (symbol, strategy_type, start_date, end_date, timeframe, 
                     total_trades, total_pnl, win_rate, max_drawdown, sharpe_ratio)
                    VALUES 
                    (:symbol, :strategy_type, :start_date, :end_date, :timeframe,
                     :total_trades, :total_pnl, :win_rate, :max_drawdown, :sharpe_ratio)
                    RETURNING id
                """)
                
                result = conn.execute(run_insert_sql, {
                    'symbol': symbol,
                    'strategy_type': strategy_type,
                    'start_date': start_date,
                    'end_date': end_date,
                    'timeframe': '1m',  # 기본값
                    'total_trades': total_trades,
                    'total_pnl': float(total_pnl),
                    'win_rate': float(win_rate),
                    'max_drawdown': float(max_drawdown),
                    'sharpe_ratio': float(sharpe_ratio)
                })
                
                backtest_run_id = result.fetchone()[0]
                logger.info(f"백테스트 실행 정보 저장 완료 (ID: {backtest_run_id})")
                
                # 개별 거래 데이터 저장 (배치 처리)
                df_copy = df.copy()
                df_copy['backtest_run_id'] = backtest_run_id

                # 가격 및 손익 컬럼 기본값/정밀도 처리
                numeric_cols = ['entry_price', 'stop_loss', 'take_profit', 'exit_price', 'pnl']
                for col in numeric_cols:
                    if col in df_copy.columns:
                        df_copy[col] = df_copy[col].fillna(0).round(6)

                # 컬럼 매핑 및 타입 변환
                column_mapping = {
                    'timestamp': 'timestamp',
                    'symbol': 'symbol', 
                    'strategy_type': 'strategy_type',
                    'entry_price': 'entry_price',
                    'stop_loss': 'stop_loss',
                    'take_profit': 'take_profit',
                    'strategy_score': 'strategy_score',
                    'confidence': 'confidence',
                    'risk_level': 'risk_level',
                    'exit_price': 'exit_price',
                    'exit_timestamp': 'exit_timestamp',
                    'pnl': 'pnl',
                    'return_pct': 'return_pct',
                    'duration_minutes': 'duration_minutes',
                    'exit_reason': 'exit_reason',
                    'entry_timing_score': 'entry_timing_score',
                    'exit_timing_score': 'exit_timing_score',
                    'risk_mgmt_score': 'risk_mgmt_score',
                    'pnl_ratio': 'pnl_ratio',
                    'target_return_pct': 'target_return_pct'
                }
                
                # 존재하는 컬럼만 선택
                available_columns = ['backtest_run_id'] + [col for col in column_mapping.keys() if col in df_copy.columns]
                df_to_save = df_copy[available_columns]
                
                # 데이터베이스에 배치 저장 (pandas to_sql 사용)
                df_to_save.to_sql('backtest_trades', conn, if_exists='append', index=False, method='multi')
                
                conn.commit()
                logger.info(f"개별 거래 데이터 저장 완료: {len(df_to_save)}개 거래")
                
                return backtest_run_id
                
        except Exception as e:
            logger.error(f"백테스트 결과 저장 실패: {e}")
            raise
    
    def get_latest_backtest_data(self, symbol: Optional[str] = None, limit: int = 1000) -> pd.DataFrame:
        """
        최신 백테스트 데이터 조회 (CSV 읽기 대체용)
        
        Args:
            symbol: 특정 심볼 필터 (None이면 모든 심볼)
            limit: 최대 조회 건수
            
        Returns:
            백테스트 거래 데이터프레임
        """
        try:
            with self.engine.connect() as conn:
                # 최신 백테스트 실행 조회
                if symbol:
                    latest_run_sql = text("""
                        SELECT id FROM backtest_runs 
                        WHERE symbol = :symbol 
                        ORDER BY created_at DESC 
                        LIMIT 1
                    """)
                    result = conn.execute(latest_run_sql, {'symbol': symbol})
                else:
                    latest_run_sql = text("""
                        SELECT id FROM backtest_runs 
                        ORDER BY created_at DESC 
                        LIMIT 1
                    """)
                    result = conn.execute(latest_run_sql)
                
                latest_run = result.fetchone()
                if not latest_run:
                    logger.warning("백테스트 데이터가 없습니다")
                    return pd.DataFrame()
                
                run_id = latest_run[0]
                
                # 해당 실행의 거래 데이터 조회
                trades_sql = text("""
                    SELECT * FROM backtest_trades 
                    WHERE backtest_run_id = :run_id 
                    ORDER BY timestamp DESC 
                    LIMIT :limit
                """)
                
                df = pd.read_sql(trades_sql, conn, params={'run_id': run_id, 'limit': limit})
                logger.info(f"최신 백테스트 데이터 조회: {len(df)}개 거래")
                
                return df
                
        except Exception as e:
            logger.error(f"백테스트 데이터 조회 실패: {e}")
            return pd.DataFrame()
    
    def get_performance_metrics(self, run_id: Optional[int] = None) -> Dict:
        """
        성과 지표 조회 (API 응답용)
        
        Args:
            run_id: 특정 백테스트 실행 ID (None이면 최신)
            
        Returns:
            성과 지표 딕셔너리
        """
        try:
            with self.engine.connect() as conn:
                if run_id is None:
                    # 최신 실행 ID 조회
                    latest_sql = text("SELECT id FROM backtest_runs ORDER BY created_at DESC LIMIT 1")
                    result = conn.execute(latest_sql)
                    latest_run = result.fetchone()
                    if not latest_run:
                        return {}
                    run_id = latest_run[0]
                
                # 성과 지표 조회 (간단한 집계 쿼리 사용)
                metrics_sql = text("""
                    SELECT 
                        COUNT(*) as total_trades,
                        COALESCE(SUM(pnl), 0) as total_pnl,
                        COALESCE(AVG(CASE WHEN pnl > 0 THEN 1.0 ELSE 0.0 END), 0) as win_rate,
                        COALESCE(AVG(return_pct), 0) as avg_return,
                        0 as max_drawdown,
                        0 as sharpe_ratio
                    FROM backtest_trades 
                    WHERE backtest_run_id = :run_id
                """)
                
                result = conn.execute(metrics_sql, {'run_id': run_id})
                metrics = result.fetchone()
                
                if metrics:
                    return {
                        'total_trades': int(metrics[0]),
                        'total_pnl': float(metrics[1]),
                        'win_rate': float(metrics[2]),
                        'avg_return': float(metrics[3]),
                        'max_drawdown': float(metrics[4]),
                        'sharpe_ratio': float(metrics[5])
                    }
                else:
                    return {}
                    
        except Exception as e:
            logger.error(f"성과 지표 조회 실패: {e}")
            return {}
    
    def get_pnl_history(self, symbol: Optional[str] = None, days: int = 30, mode: str = 'latest', source: str = 'db') -> Dict:
        """
        PnL 히스토리 조회 (차트 데이터용)
        
        Args:
            symbol: 심볼 필터
            days: 조회 일수
            mode: 'latest' | 'all' (집계 범위)
            source: 'db' | 'csv' (데이터 소스)
            
        Returns:
            차트 데이터 딕셔너리
        """
        try:
            # 한글 주석: CSV 소스 강제 지정 시 CSV에서 로드
            if source == 'csv':
                return self._get_pnl_history_from_csv(symbol=symbol, days=days, mode=mode)

            with self.engine.connect() as conn:
                # 날짜 필터 적용
                since_date = datetime.now() - timedelta(days=days)
                
                if mode == 'latest':
                    # 한글 주석: 최신 실행 기준으로 제한
                    if symbol:
                        latest_run_sql = text("""
                            SELECT id FROM backtest_runs 
                            WHERE symbol = :symbol 
                            ORDER BY created_at DESC 
                            LIMIT 1
                        """)
                        latest_row = conn.execute(latest_run_sql, {'symbol': symbol}).fetchone()
                    else:
                        latest_run_sql = text("""
                            SELECT id FROM backtest_runs 
                            ORDER BY created_at DESC 
                            LIMIT 1
                        """)
                        latest_row = conn.execute(latest_run_sql).fetchone()
                    if not latest_row:
                        return {'timestamps': [], 'pnl': [], 'cum_pnl': [], 'return_pct': []}
                    latest_run_id = int(latest_row[0])
                    pnl_sql = text("""
                        SELECT bt.timestamp, bt.pnl, bt.return_pct 
                        FROM backtest_trades bt
                        WHERE bt.backtest_run_id = :run_id AND bt.timestamp >= :since_date
                        ORDER BY bt.timestamp
                    """)
                    params = {'run_id': latest_run_id, 'since_date': since_date}
                else:
                    # 전체 집계(all) 모드
                    if symbol:
                        pnl_sql = text("""
                            SELECT bt.timestamp, bt.pnl, bt.return_pct 
                            FROM backtest_trades bt
                            JOIN backtest_runs br ON bt.backtest_run_id = br.id
                            WHERE br.symbol = :symbol AND bt.timestamp >= :since_date
                            ORDER BY bt.timestamp
                        """)
                        params = {'symbol': symbol, 'since_date': since_date}
                    else:
                        pnl_sql = text("""
                            SELECT bt.timestamp, bt.pnl, bt.return_pct 
                            FROM backtest_trades bt
                            WHERE bt.timestamp >= :since_date
                            ORDER BY bt.timestamp
                        """)
                        params = {'since_date': since_date}
                
                df = pd.read_sql(pnl_sql, conn, params=params)
                
                if len(df) == 0:
                    # 한글 주석: DB에 데이터가 없으면 CSV 폴백
                    return self._get_pnl_history_from_csv(symbol=symbol, days=days, mode=mode)
                
                # 누적 PnL 계산
                df['cum_pnl'] = df['pnl'].cumsum()
                
                return {
                    'timestamps': df['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S').tolist(),
                    'pnl': df['pnl'].tolist(),
                    'cum_pnl': df['cum_pnl'].tolist(),
                    'return_pct': (df['return_pct'].tolist() if 'return_pct' in df.columns else [])
                }
                
        except Exception as e:
            logger.error(f"PnL 히스토리 조회 실패: {e}")
            # 한글 주석: 폴백 - CSV 파일에서 직접 PnL 히스토리 생성 (전역 pd 사용)
            try:
                return self._get_pnl_history_from_csv(symbol=symbol, days=days, mode=mode)
            except Exception:
                return {'timestamps': [], 'pnl': [], 'cum_pnl': []}

    def _get_pnl_history_from_csv(self, symbol: Optional[str], days: int, mode: str) -> Dict:
        """CSV 파일에서 PnL 히스토리 생성 (자동매매 최근 CSV 등)"""
        if not self.csv_dir.exists():
            return {'timestamps': [], 'pnl': [], 'cum_pnl': []}
        files = list(self.csv_dir.glob('backtest_*.csv')) + list(self.csv_dir.glob('consolidated_*.csv'))
        if not files:
            return {'timestamps': [], 'pnl': [], 'cum_pnl': []}
        # 심볼 필터: 파일명 또는 컬럼 기반
        if symbol:
            files = [f for f in files if f.name.split('_')[1] == symbol]
        # 최신/전체 스코프 정렬 (최신 우선)
        files = sorted(files, key=lambda p: p.stat().st_mtime, reverse=True)
        frames = []
        since_date = datetime.now() - timedelta(days=days)
        used_file: Optional[Path] = None
        def load_file(fp: Path) -> Optional[pd.DataFrame]:
            try:
                df = pd.read_csv(fp)
                if 'timestamp' not in df.columns or 'pnl' not in df.columns:
                    return None
                if symbol and 'symbol' in df.columns:
                    df = df[df['symbol'] == symbol]
                df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
                return df
            except Exception:
                return None

        if mode == 'latest':
            # 가장 최근의 "비어있지 않은" 파일을 찾음 (필터링 적용 후)
            for f in files:
                df = load_file(f)
                if df is None or df.empty:
                    continue
                df_recent = df[df['timestamp'] >= since_date]
                if not df_recent.empty:
                    frames = [df_recent]
                    used_file = f
                    break
            # 기간 내 데이터가 없다면, 최신 비어있지 않은 파일로 폴백
            if not frames:
                for f in files:
                    df = load_file(f)
                    if df is not None and not df.empty:
                        frames = [df]
                        used_file = f
                        break
        else:
            # 전체 모드: 기간 내 데이터가 있는 파일들을 모두 병합
            for f in files[::-1]:  # 오래된 순으로 누적
                df = load_file(f)
                if df is None or df.empty:
                    continue
                df_recent = df[df['timestamp'] >= since_date]
                if df_recent.empty:
                    continue
                frames.append(df_recent)
            if frames:
                used_file = None  # 다수 파일 병합

        if not frames:
            return {'timestamps': [], 'pnl': [], 'cum_pnl': []}

        full = pd.concat(frames, ignore_index=True).sort_values('timestamp')
        full['cum_pnl'] = full['pnl'].cumsum()
        result = {
            'timestamps': full['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S').tolist(),
            'pnl': full['pnl'].tolist(),
            'cum_pnl': full['cum_pnl'].tolist(),
            'return_pct': (full['return_pct'].tolist() if 'return_pct' in full.columns else [])
        }
        if used_file:
            result['source_file'] = str(used_file.name)
            result['source'] = 'csv'
        return result
    
    def migrate_csv_files(self, csv_directory: str):
        """
        기존 CSV 파일들을 데이터베이스로 마이그레이션
        
        Args:
            csv_directory: CSV 파일들이 있는 디렉토리 경로
        """
        csv_dir = Path(csv_directory)
        if not csv_dir.exists():
            logger.error(f"CSV 디렉토리가 존재하지 않습니다: {csv_directory}")
            return
        
        csv_files = list(csv_dir.glob('backtest_*.csv'))
        logger.info(f"마이그레이션 대상 CSV 파일: {len(csv_files)}개")
        
        success_count = 0
        for csv_file in csv_files:
            try:
                run_id = self.save_backtest_results(str(csv_file))
                logger.info(f"마이그레이션 완료: {csv_file.name} -> 실행ID {run_id}")
                success_count += 1
            except Exception as e:
                logger.error(f"마이그레이션 실패: {csv_file.name} - {e}")
        
        logger.info(f"마이그레이션 완료: {success_count}/{len(csv_files)}개 파일")


# 사용 예시 및 테스트
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # 데이터베이스 매니저 초기화
    db_manager = BacktestDatabaseManager()
    
    # 기존 CSV 파일들 마이그레이션
    csv_directory = "data/backtest_results"
    if Path(csv_directory).exists():
        db_manager.migrate_csv_files(csv_directory)
    
    # 최신 데이터 조회 테스트
    latest_data = db_manager.get_latest_backtest_data(limit=10)
    print(f"최신 데이터: {len(latest_data)}개 거래")
    
    # 성과 지표 조회 테스트
    metrics = db_manager.get_performance_metrics()
    print(f"성과 지표: {metrics}")

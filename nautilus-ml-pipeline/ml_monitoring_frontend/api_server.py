#!/usr/bin/env python3
"""
ML 모니터링 API 백엔드 서버
- 포트 5002에서 API 전용 서버 실행
- 리액트 프론트엔드와 통신
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys
import hashlib
import logging
from datetime import datetime
from typing import Dict, List
import pandas as pd
from pathlib import Path

# 로거 설정
logger = logging.getLogger(__name__)

# 상위 디렉토리 모듈 임포트를 위한 경로 추가
sys.path.append(str(Path(__file__).parent.parent))

app = Flask(__name__)

# CORS 설정 - 리액트 개발 서버(3000)와 프로덕션 허용
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"]
    }
})

# 한글 주석: 작업 디렉터리를 프로젝트 루트(nautilus-ml-pipeline)로 강제 변경하여
# 상대 경로(예: 'config/ml_config.yaml', 'data/...') 문제를 방지
try:
    BASE_DIR = Path(__file__).resolve().parent.parent
    os.chdir(BASE_DIR)
    print(f"📂 Working directory set to: {os.getcwd()}")
except Exception as _e:
    logger.warning(f"작업 디렉터리 변경 실패: {_e}")

# 관리자 인증 정보
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "ml_admin_2025"

# 기본 고정 구간 설정 로더 (환경변수 기반)
def get_default_fixed_window() -> Dict:
    try:
        start = os.getenv('FIXED_WINDOW_START', '2016-01-01 00:00')
        end = os.getenv('FIXED_WINDOW_END', '2016-01-02 00:00')
        symbol = os.getenv('FIXED_SYMBOL', 'BTCUSDT')
        timeframe = os.getenv('FIXED_TIMEFRAME', '1m')
        return {
            'start': start,
            'end': end,
            'symbol': symbol,
            'timeframe': timeframe,
        }
    except Exception:
        return {
            'start': '2016-01-01 00:00',
            'end': '2016-01-02 00:00',
            'symbol': 'BTCUSDT',
            'timeframe': '1m',
        }

# 백테스트 상태 관리
backtest_status = {
    'running': False,
    'progress': 0,
    'current_step': '',
    'result': None,
    'error': None,
    'start_time': None,
    'logs': []
}

# 연속 백테스팅 상태 관리
continuous_backtest_status = {
    'running': False,
    'auto_enabled': False,
    'current_period': None,
    'total_periods': 0,
    'completed_periods': 0,
    'start_date': '2016-01-01',
    'current_date': None,
    'interval_minutes': 1,
    'results_history': [],
    'comparison_data': [],
    'last_comparison': None,
    'changes_detected': [],
    # 한글 주석: 고정 구간/모델 모드 설정
    'fixed_mode': True,
    'fixed_window': get_default_fixed_window(),
    'model_lock_enabled': True,
    'locked_model_info': None,  # 필요 시 모델 메타데이터 지정
    'ml_metrics': {
        'latest_r2_score': None,
        'latest_accuracy': None,
        'latest_precision': None,
        'latest_recall': None,
        'latest_f1_score': None,
        'model_last_trained': None,
        'training_samples': None,
        'feature_count': None
    }
}

@app.route('/api/health', methods=['GET'])
def health_check():
    """헬스 체크 API"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'server': 'ML API Backend',
        'port': 5002
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    """관리자 로그인 API"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': '잘못된 요청 데이터'}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return jsonify({
            'success': True,
            'message': '로그인 성공',
            'user': {
                'username': username,
                'role': 'admin'
            },
            'token': hashlib.sha256(f"{username}{password}".encode()).hexdigest()[:16]
        })
    else:
        return jsonify({'error': '잘못된 사용자명 또는 비밀번호'}), 401

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_data():
    """대시보드 데이터 API"""
    try:
        # 백테스트 결과 파일 개수 확인
        results_dir = Path('../data/backtest_results')
        csv_files = list(results_dir.glob('*.csv')) if results_dir.exists() else []
        
        # 샘플 데이터 (실제 구현에서는 데이터베이스에서 가져옴)
        dashboard_data = {
            'health_check': {
                'score': 85,
                'status': 'healthy',
                'last_update': datetime.now().isoformat()
            },
            'performance_summary': {
                'model_r2': 0.234,
                'accuracy': 0.762,
                'total_trades': len(csv_files),
                'win_rate': 0.68
            },
            'recent_alerts': [
                {
                    'id': 1,
                    'message': '모델 성능이 임계값 이하로 떨어졌습니다',
                    'type': 'warning',
                    'timestamp': datetime.now().isoformat()
                }
            ],
            'system_status': {
                'server_status': '실행 중',
                'db_status': '연결됨',
                'ml_models': '로드됨',
                'last_backtest': '2025-08-16 22:40:00'
            },
            'statistics': {
                'total_backtests': len(csv_files),
                'total_models': 3,
                'avg_performance': 0.762,
                'uptime': '24시간'
            }
        }
        
        return jsonify(dashboard_data)
        
    except Exception as e:
        return jsonify({'error': f'대시보드 데이터 로드 실패: {str(e)}'}), 500

@app.route('/api/backtest/start', methods=['POST'])
def start_backtest():
    """백테스트 시작 API"""
    global backtest_status
    
    if backtest_status['running']:
        return jsonify({'error': '이미 백테스트가 실행 중입니다'}), 400
    
    data = request.get_json() or {}
    symbol = data.get('symbol', 'BTCUSDT')
    timeframe = data.get('timeframe', '1m')
    duration = data.get('duration', 30)  # 일수
    
    # 백테스트 상태 초기화
    backtest_status.update({
        'running': True,
        'progress': 0,
        'current_step': '백테스트 시작...',
        'result': None,
        'error': None,
        'start_time': datetime.now().isoformat(),
        'logs': [
            f'{datetime.now().strftime("%H:%M:%S")} - 백테스트 시작: {symbol} ({duration}일)',
            f'{datetime.now().strftime("%H:%M:%S")} - 파라미터: timeframe={timeframe}'
        ]
    })
    
    # 실제 백테스트 로직은 별도 스레드에서 실행해야 함
    # 여기서는 시뮬레이션
    import threading
    import time
    
    def simulate_backtest():
        global backtest_status
        try:
            from run_1year_backtest import YearLongBacktestRunner
            from ml_pipeline.data_processor import MLDataPipeline
            from ml_pipeline.model_trainer import MLModelTrainer
            
            steps = [
                '백테스팅 시스템 초기화...',
                '거래 신호 생성 및 필터링...',
                '백테스트 실행...',
                '피처 엔지니어링 시작...',
                'ML 훈련 데이터 전처리...',
                '모델 훈련 중...',
                '모델 평가 및 저장...',
                '완료!'
            ]
            
            runner = None
            result_file = None
            
            for i, step in enumerate(steps):
                if not backtest_status['running']:
                    break
                    
                backtest_status.update({
                    'progress': int((i + 1) / len(steps) * 100),
                    'current_step': step,
                })
                backtest_status['logs'].append(f'{datetime.now().strftime("%H:%M:%S")} - {step}')
                
                # 실제 백테스팅 단계별 실행
                if i == 0:  # 초기화
                    runner = YearLongBacktestRunner()
                    time.sleep(1)
                    
                elif i == 1:  # 신호 생성
                    time.sleep(2)
                    
                elif i == 2:  # 백테스트 실행
                    if runner:
                        try:
                            # 짧은 백테스트 (7일) 실행
                            result_file = runner.run_backtest_chunk('BTCUSDT', 7, timeframe='1m')
                            if result_file:
                                backtest_status['logs'].append(f'{datetime.now().strftime("%H:%M:%S")} - 백테스트 결과: {result_file}')
                        except Exception as e:
                            backtest_status['logs'].append(f'{datetime.now().strftime("%H:%M:%S")} - 백테스트 실패: {str(e)}')
                    
                elif i == 3:  # 피처 엔지니어링
                    if result_file:
                        try:
                            pipeline = MLDataPipeline()
                            training_data = pipeline.run_pipeline("data/backtest_results")
                            backtest_status['logs'].append(f'{datetime.now().strftime("%H:%M:%S")} - 피처 엔지니어링 완료: {training_data}')
                        except Exception as e:
                            backtest_status['logs'].append(f'{datetime.now().strftime("%H:%M:%S")} - 피처 엔지니어링 실패: {str(e)}')
                    time.sleep(1)
                    
                elif i == 4:  # 데이터 전처리
                    time.sleep(1)
                    
                elif i == 5:  # 모델 훈련
                    try:
                        trainer = MLModelTrainer()
                        # 최신 훈련 데이터 찾기
                        training_files = list(Path("data/training_data").glob("*.csv"))
                        if training_files:
                            latest_file = max(training_files, key=lambda x: x.stat().st_mtime)
                            result = trainer.train_model(str(latest_file))
                            backtest_status['logs'].append(f'{datetime.now().strftime("%H:%M:%S")} - 모델 훈련 완료 (R²: {result.get("r2_score", 0):.3f})')
                        else:
                            backtest_status['logs'].append(f'{datetime.now().strftime("%H:%M:%S")} - 훈련 데이터가 없습니다')
                    except Exception as e:
                        backtest_status['logs'].append(f'{datetime.now().strftime("%H:%M:%S")} - 모델 훈련 실패: {str(e)}')
                    time.sleep(2)
                    
                elif i == 6:  # 평가 및 저장
                    time.sleep(1)
                    
                else:  # 완료
                    time.sleep(0.5)
            
            # 결과 수집
            trades_count = 0
            win_rate = 0.0
            total_return = 0.0
            
            if result_file and Path(result_file).exists():
                try:
                    import pandas as pd
                    df = pd.read_csv(result_file)
                    trades_count = len(df)
                    if trades_count > 0:
                        win_rate = len(df[df['pnl'] > 0]) / trades_count
                        total_return = df['return_pct'].sum()
                except Exception:
                    pass
            
            # 완료 처리
            backtest_status.update({
                'running': False,
                'progress': 100,
                'current_step': '완료',
                'result': {
                    'trades_generated': trades_count,
                    'win_rate': win_rate,
                    'total_return': total_return,
                    'max_drawdown': -2.3,  # 예시값
                    'execution_time_minutes': len(steps),
                    'features_engineered': ['entry_timing_score', 'exit_timing_score', 'risk_mgmt_score', 'pnl_ratio', 'volatility'],
                    'model_updated': True
                }
            })
            backtest_status['logs'].append(f'{datetime.now().strftime("%H:%M:%S")} - 전체 파이프라인 완료!')
            
        except Exception as e:
            backtest_status.update({
                'running': False,
                'error': str(e)
            })
            backtest_status['logs'].append(f'{datetime.now().strftime("%H:%M:%S")} - ❌ 에러: {str(e)}')
    
    # 백그라운드에서 실행
    threading.Thread(target=simulate_backtest, daemon=True).start()
    
    return jsonify({
        'success': True,
        'message': '백테스트가 시작되었습니다',
        'status': backtest_status
    })

@app.route('/api/backtest/status', methods=['GET'])
def get_backtest_status():
    """백테스트 상태 조회 API"""
    return jsonify(backtest_status)

@app.route('/api/backtest/reset', methods=['POST'])
def reset_backtest():
    """백테스트 상태 리셋"""
    global backtest_status
    backtest_status.update({
        'running': False,
        'progress': 0,
        'current_step': '',
        'result': None,
        'error': None,
        'logs': []
    })
    return jsonify({'message': '백테스트 상태가 리셋되었습니다'})

# 자동매매 관리 API
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'live_trading'))

try:
    from live_trading_manager import live_trading_manager  # type: ignore
    LIVE_TRADING_AVAILABLE = True
except ImportError:
    LIVE_TRADING_AVAILABLE = False
    live_trading_manager = None

trading_bots = {
    'main_bot': {
        'id': 'main_bot',
        'name': 'Main Trading Bot (Live)',
        'status': 'stopped',  # stopped, running, paused, error
        'strategy': 'ml_adaptive',
        'symbol': 'BTCUSDT',
        'balance': 10000.0,
        'current_pnl': 0.0,
        'total_trades': 0,
        'win_rate': 0.0,
        'last_updated': datetime.now().isoformat(),
        'is_live': True,  # 실제 거래 여부
        'testnet': True,  # 테스트넷 사용 여부
        'features': {
            'entry_timing_score': 0.75,
            'exit_timing_score': 0.68,
            'risk_mgmt_score': 0.82,
            'pnl_ratio': 1.25,
            'volatility': 0.15
        },
        'model_performance': {
            'accuracy': 0.72,
            'precision': 0.68,
            'recall': 0.75,
            'f1_score': 0.71,
            'last_trained': datetime.now().isoformat()
        }
    }
}

@app.route('/api/trading/bots', methods=['GET'])
def get_trading_bots():
    """자동매매 봇 목록 조회"""
    return jsonify(list(trading_bots.values()))

@app.route('/api/trading/bots/<bot_id>', methods=['GET'])
def get_trading_bot(bot_id):
    """특정 봇 상세 정보 조회"""
    if bot_id not in trading_bots:
        return jsonify({'error': '봇을 찾을 수 없습니다'}), 404
    return jsonify(trading_bots[bot_id])

@app.route('/api/trading/bots/<bot_id>/start', methods=['POST'])
async def start_trading_bot(bot_id):
    """자동매매 봇 시작 (실제 라이브 트레이딩)"""
    if bot_id not in trading_bots:
        return jsonify({'error': '봇을 찾을 수 없습니다'}), 404
    
    try:
        if LIVE_TRADING_AVAILABLE and live_trading_manager:
            # 한글 주석: 실제 라이브 트레이딩 시작
            await live_trading_manager.start_live_trading()
            
            # 한글 주석: 라이브 매니저 상태 확인
            live_status = live_trading_manager.get_trading_status()
            
            if live_status['status'] == 'running':
                trading_bots[bot_id]['status'] = 'running'
                trading_bots[bot_id]['testnet'] = live_status.get('testnet', True)
            else:
                trading_bots[bot_id]['status'] = 'error'
        else:
            # 한글 주석: 시뮬레이션 모드
            trading_bots[bot_id]['status'] = 'running'
        
        trading_bots[bot_id]['last_updated'] = datetime.now().isoformat()
        
        return jsonify({
            'message': f'{bot_id} 봇이 시작되었습니다 (라이브: {LIVE_TRADING_AVAILABLE})',
            'status': trading_bots[bot_id]['status'],
            'is_live': LIVE_TRADING_AVAILABLE,
            'testnet': trading_bots[bot_id].get('testnet', True)
        })
        
    except Exception as e:
        trading_bots[bot_id]['status'] = 'error'
        trading_bots[bot_id]['last_updated'] = datetime.now().isoformat()
        
        return jsonify({
            'error': f'봇 시작 실패: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/api/trading/bots/<bot_id>/stop', methods=['POST'])
async def stop_trading_bot(bot_id):
    """자동매매 봇 정지 (실제 라이브 트레이딩)"""
    if bot_id not in trading_bots:
        return jsonify({'error': '봇을 찾을 수 없습니다'}), 404
    
    try:
        if LIVE_TRADING_AVAILABLE and live_trading_manager:
            # 한글 주석: 실제 라이브 트레이딩 정지
            await live_trading_manager.stop_live_trading()
        
        trading_bots[bot_id]['status'] = 'stopped'
        trading_bots[bot_id]['last_updated'] = datetime.now().isoformat()
        
        return jsonify({
            'message': f'{bot_id} 봇이 정지되었습니다',
            'status': trading_bots[bot_id]['status']
        })
        
    except Exception as e:
        return jsonify({
            'error': f'봇 정지 실패: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/api/trading/performance/<bot_id>', methods=['GET'])
def get_bot_performance(bot_id):
    """봇 성과 데이터 조회 (차트용)"""
    if bot_id not in trading_bots:
        return jsonify({'error': '봇을 찾을 수 없습니다'}), 404
    
    # 한글 주석: 실제 라이브 트레이딩 성과 조회 시도
    if LIVE_TRADING_AVAILABLE and live_trading_manager and live_trading_manager.is_running:
        try:
            live_performance = live_trading_manager.get_portfolio_performance()
            if 'error' not in live_performance:
                # 한글 주석: 실제 포트폴리오 데이터를 차트 형식으로 변환
                total_value = live_performance.get('total_account_value', 10000.0)
                
                return jsonify({
                    'bot_id': bot_id,
                    'is_live_data': True,
                    'testnet': trading_bots[bot_id].get('testnet', True),
                    'performance_data': [{
                        'date': datetime.now().strftime('%Y-%m-%d'),
                        'balance': total_value,
                        'pnl': total_value - 10000,
                        'pnl_percentage': (total_value - 10000) / 10000 * 100,
                        'trades_count': live_performance.get('orders_count', 0),
                        'win_rate': 0.0  # 실제 승률 계산 필요
                    }],
                    'live_balances': live_performance.get('balances', {}),
                    'summary': {
                        'total_pnl': total_value - 10000,
                        'total_pnl_percentage': (total_value - 10000) / 10000 * 100,
                        'max_drawdown': 0.0,  # 실제 계산 필요
                        'sharpe_ratio': 0.0,   # 실제 계산 필요
                        'total_trades': live_performance.get('orders_count', 0),
                        'open_positions': live_performance.get('open_positions_count', 0),
                        'account_value': total_value
                    }
                })
        except Exception as e:
            logger.error(f"라이브 성과 데이터 조회 실패: {e}")
    
    # 한글 주석: 시뮬레이션 성과 데이터 생성 (백업)
    import random
    from datetime import timedelta
    
    performance_data = []
    current_time = datetime.now() - timedelta(days=30)
    current_balance = 10000.0
    
    for i in range(30):
        # 랜덤 일일 수익률 (-2% ~ +3%)
        daily_return = random.uniform(-0.02, 0.03)
        current_balance *= (1 + daily_return)
        
        performance_data.append({
            'date': current_time.strftime('%Y-%m-%d'),
            'balance': round(current_balance, 2),
            'pnl': round(current_balance - 10000, 2),
            'pnl_percentage': round((current_balance - 10000) / 10000 * 100, 2),
            'trades_count': random.randint(0, 5),
            'win_rate': random.uniform(0.4, 0.8)
        })
        current_time += timedelta(days=1)
    
    return jsonify({
        'bot_id': bot_id,
        'is_live_data': False,
        'performance_data': performance_data,
        'summary': {
            'total_pnl': round(current_balance - 10000, 2),
            'total_pnl_percentage': round((current_balance - 10000) / 10000 * 100, 2),
            'max_drawdown': -5.2,
            'sharpe_ratio': 1.25,
            'total_trades': sum(d['trades_count'] for d in performance_data),
            'avg_win_rate': round(sum(d['win_rate'] for d in performance_data) / len(performance_data), 3)
        }
    })

@app.route('/api/trading/features/<bot_id>', methods=['GET'])
def get_feature_analysis(bot_id):
    """피처 분석 데이터 조회"""
    if bot_id not in trading_bots:
        return jsonify({'error': '봇을 찾을 수 없습니다'}), 404
    
    # 피처 변화 시뮬레이션 데이터
    import random
    from datetime import timedelta
    
    feature_history = []
    current_time = datetime.now() - timedelta(days=7)
    
    for i in range(7):
        feature_history.append({
            'date': current_time.strftime('%Y-%m-%d %H:%M'),
            'entry_timing_score': round(random.uniform(0.6, 0.9), 3),
            'exit_timing_score': round(random.uniform(0.5, 0.8), 3),
            'risk_mgmt_score': round(random.uniform(0.7, 0.9), 3),
            'pnl_ratio': round(random.uniform(0.8, 1.5), 3),
            'volatility': round(random.uniform(0.1, 0.3), 3)
        })
        current_time += timedelta(days=1)
    
    return jsonify({
        'bot_id': bot_id,
        'current_features': trading_bots[bot_id]['features'],
        'feature_history': feature_history,
        'feature_importance': {
            'entry_timing_score': 0.25,
            'exit_timing_score': 0.20,
            'risk_mgmt_score': 0.30,
            'pnl_ratio': 0.15,
            'volatility': 0.10
        }
    })

@app.route('/api/backtest/stop', methods=['POST'])
def stop_backtest():
    """백테스트 중단 API"""
    global backtest_status
    
    if not backtest_status['running']:
        return jsonify({'error': '실행 중인 백테스트가 없습니다'}), 400
    
    backtest_status.update({
        'running': False,
        'current_step': '사용자에 의해 중단됨',
        'error': '수동 중단'
    })
    backtest_status['logs'].append(f'{datetime.now().strftime("%H:%M:%S")} - 백테스트 중단됨')
    
    return jsonify({
        'success': True,
        'message': '백테스트가 중단되었습니다'
    })

@app.route('/api/models', methods=['GET'])
def get_models():
    """ML 모델 목록 API"""
    models = [
        {
            'id': 'xgb_v1',
            'name': 'XGBoost V1',
            'type': 'xgboost',
            'accuracy': 0.762,
            'created_at': '2025-08-15T10:30:00',
            'status': 'active'
        },
        {
            'id': 'lgb_v2',
            'name': 'LightGBM V2',
            'type': 'lightgbm',
            'accuracy': 0.758,
            'created_at': '2025-08-14T15:20:00',
            'status': 'backup'
        }
    ]
    
    return jsonify({'models': models})

# 연속 백테스팅 API들
@app.route('/api/continuous-backtest/start', methods=['POST'])
def start_continuous_backtest():
    """연속 백테스팅 시작 API"""
    global continuous_backtest_status
    
    if continuous_backtest_status['running']:
        return jsonify({'error': '이미 연속 백테스팅이 실행 중입니다'}), 400
    
    data = request.get_json() or {}
    start_date = data.get('start_date', '2016-01-01')
    interval_minutes = data.get('interval_minutes', 30)
    symbol = data.get('symbol', os.getenv('FIXED_SYMBOL', 'BTCUSDT'))
    # 한글 주석: 고정 모드/모델 잠금은 서버가 결정
    fixed_mode = True
    model_lock_enabled = True
    
    # 한글 주석: 연속 백테스팅 상태 초기화
    continuous_backtest_status.update({
        'running': True,
        'auto_enabled': True,
        'start_date': start_date,
        'current_date': start_date,
        'interval_minutes': interval_minutes,
        'symbol': symbol,
        'results_history': [],
        'comparison_data': [],
        'changes_detected': [],
        'fixed_mode': fixed_mode,
        'model_lock_enabled': model_lock_enabled,
    })

    # 한글 주석: 고정 구간은 서버 기본값 또는 환경변수로 결정
    if fixed_mode:
        continuous_backtest_status['fixed_window'] = get_default_fixed_window()
    
    # 한글 주석: 백그라운드에서 연속 실행
    import threading
    threading.Thread(target=run_continuous_backtest, daemon=True).start()
    
    return jsonify({
        'success': True,
        'message': f'{start_date}부터 {interval_minutes}분 간격으로 연속 백테스팅 시작',
        'status': continuous_backtest_status
    })

@app.route('/api/continuous-backtest/stop', methods=['POST'])
def stop_continuous_backtest():
    """연속 백테스팅 중단 API"""
    global continuous_backtest_status
    
    continuous_backtest_status.update({
        'running': False,
        'auto_enabled': False
    })
    
    return jsonify({
        'success': True,
        'message': '연속 백테스팅이 중단되었습니다'
    })

@app.route('/api/continuous-backtest/status', methods=['GET'])
def get_continuous_backtest_status():
    """연속 백테스팅 상태 조회 API"""
    return jsonify(continuous_backtest_status)

@app.route('/api/continuous-backtest/toggle-auto', methods=['POST'])
def toggle_auto_backtest():
    """자동 백테스팅 토글 API"""
    global continuous_backtest_status
    
    data = request.get_json() or {}
    auto_enabled = data.get('auto_enabled', not continuous_backtest_status['auto_enabled'])
    
    continuous_backtest_status['auto_enabled'] = auto_enabled
    
    if auto_enabled and not continuous_backtest_status['running']:
        # 한글 주석: 자동 모드 활성화 시 연속 백테스팅 시작
        import threading
        threading.Thread(target=run_continuous_backtest, daemon=True).start()
        continuous_backtest_status['running'] = True
    
    return jsonify({
        'success': True,
        'auto_enabled': auto_enabled,
        'message': f'자동 백테스팅이 {"활성화" if auto_enabled else "비활성화"}되었습니다'
    })

def run_continuous_backtest():
    """연속 백테스팅 실행 함수"""
    global continuous_backtest_status
    
    try:
        # 한글 주석: 실행 스레드 시작 시 상태를 명확히 running 으로 표시
        continuous_backtest_status['running'] = True
        from datetime import datetime, timedelta
        from run_1year_backtest import YearLongBacktestRunner
        from nautilus_integration.backtest_runner import NautilusBacktestRunner
        import time
        
        runner = YearLongBacktestRunner()
        start_date = datetime.strptime(continuous_backtest_status['start_date'], '%Y-%m-%d')
        current_date = start_date
        end_date = datetime.now()
        interval = timedelta(minutes=continuous_backtest_status['interval_minutes'])
        
        period_count = 0
        previous_result = None
        
        while (continuous_backtest_status['running']):
            period_count += 1
            
            # 한글 주석: 고정 모드 여부에 따라 기간 결정
            use_fixed = bool(continuous_backtest_status.get('fixed_mode', False))
            symbol = continuous_backtest_status.get('symbol', 'BTCUSDT')
            timeframe = '1m'
            period_start = current_date
            period_end = current_date + interval
            
            if use_fixed:
                fw = continuous_backtest_status.get('fixed_window', {}) or {}
                symbol = fw.get('symbol', symbol)
                timeframe = fw.get('timeframe', '1m')
                # 한글 주석: 고정 구간 시작/종료가 없으면 서버 시작 시점 기준으로 24시간 구간 설정
                try:
                    if fw.get('start') and fw.get('end'):
                        period_start = datetime.strptime(fw['start'], '%Y-%m-%d %H:%M')
                        period_end = datetime.strptime(fw['end'], '%Y-%m-%d %H:%M')
                    else:
                        base = datetime.now() - timedelta(days=1)
                        period_start = base.replace(minute=0, second=0, microsecond=0)
                        period_end = period_start + timedelta(days=1)
                        continuous_backtest_status['fixed_window'] = {
                            'start': period_start.strftime('%Y-%m-%d %H:%M'),
                            'end': period_end.strftime('%Y-%m-%d %H:%M'),
                            'symbol': symbol,
                            'timeframe': timeframe,
                        }
                except Exception:
                    pass
            else:
                # 한글 주석: 이동 구간 모드에서는 현재 시간을 진행
                period_end = current_date + interval
                end_date = datetime.now()
            
            # 한글 주석: 현재 기간/상태 갱신
            continuous_backtest_status.update({
                'current_period': f"{period_start.strftime('%Y-%m-%d %H:%M')} ~ {period_end.strftime('%Y-%m-%d %H:%M')}",
                'current_date': period_start.strftime('%Y-%m-%d %H:%M'),
                'completed_periods': period_count - 1
            })
            
            try:
                # 한글 주석: 고정 모드에서는 동일 구간으로 백테스트 실행
                if use_fixed:
                    backtest_runner = NautilusBacktestRunner()
                    result_file = backtest_runner.run_backtest(
                        symbol=symbol,
                        days=(period_end - period_start).days or 1,
                        start_date=period_start,
                        end_date=period_end,
                        timeframe=timeframe,
                    )
                else:
                    # 한글 주석: 이동 구간 모드 - 짧은 기간으로 빠른 테스트
                    result_file = runner.run_backtest_chunk(
                        symbol=symbol,
                        days=1,
                        timeframe=timeframe,
                    )
                
                if result_file and Path(result_file).exists():
                    # 한글 주석: 결과 분석
                    df = pd.read_csv(result_file)
                    current_result = analyze_backtest_result(df, period_start)
                    
                    # 한글 주석: 이전 결과와 비교
                    if previous_result:
                        changes = compare_results(previous_result, current_result)
                        if changes:
                            continuous_backtest_status['changes_detected'].append({
                                'period': period_start.strftime('%Y-%m-%d %H:%M'),
                                'changes': changes,
                                'timestamp': datetime.now().isoformat()
                            })
                    
                    # 한글 주석: 결과 히스토리에 추가
                    continuous_backtest_status['results_history'].append(current_result)
                    previous_result = current_result
                    
                    # 한글 주석: 모델 고정 모드에서는 재학습을 비활성화하여 동일 모델 유지
                    if not bool(continuous_backtest_status.get('model_lock_enabled', False)):
                        # 한글 주석: ML 학습 주기적 실행 (매 5번째)
                        if period_count % 5 == 0:
                            try:
                                ml_result = run_ml_training_and_evaluation()
                                if ml_result:
                                    continuous_backtest_status['ml_metrics'].update(ml_result)
                                    continuous_backtest_status['changes_detected'].append({
                                        'period': period_start.strftime('%Y-%m-%d %H:%M'),
                                        'changes': [f"ML 모델 재학습 완료 (R²: {ml_result.get('latest_r2_score', 0):.3f})"],
                                        'timestamp': datetime.now().isoformat()
                                    })
                            except Exception as e:
                                logger.error(f"ML 학습 실패: {e}")
                    
                    # 한글 주석: 최신 50개만 유지
                    if len(continuous_backtest_status['results_history']) > 50:
                        continuous_backtest_status['results_history'] = continuous_backtest_status['results_history'][-50:]
                
            except Exception as e:
                continuous_backtest_status['changes_detected'].append({
                    'period': current_date.strftime('%Y-%m-%d %H:%M'),
                    'changes': [f'백테스트 실패: {str(e)}'],
                    'timestamp': datetime.now().isoformat()
                })
            
            # 한글 주석: 다음 주기 준비
            if not use_fixed:
                # 이동 구간에서는 다음 기간으로 이동
                current_date = period_end
                if current_date >= end_date:
                    current_date = datetime.now() - interval
            
            # 자동 모드가 비활성화되면 중단
            if not continuous_backtest_status['auto_enabled']:
                break
            
            # 1분 대기
            time.sleep(60)
    
    except Exception as e:
        continuous_backtest_status.update({
            'running': False,
            'error': str(e)
        })
    finally:
        continuous_backtest_status['running'] = False

def analyze_backtest_result(df: pd.DataFrame, period_start: datetime) -> Dict:
    """백테스트 결과 분석"""
    if len(df) == 0:
        return {
            'period': period_start.strftime('%Y-%m-%d %H:%M'),
            'trades_count': 0,
            'win_rate': 0.0,
            'total_pnl': 0.0,
            'avg_trade_duration': 0.0,
            'max_drawdown': 0.0,
            'timestamp': datetime.now().isoformat()
        }
    
    # 한글 주석: 기본 통계 계산
    trades_count = len(df)
    winning_trades = len(df[df['pnl'] > 0]) if 'pnl' in df.columns else 0
    win_rate = winning_trades / trades_count if trades_count > 0 else 0
    total_pnl = df['pnl'].sum() if 'pnl' in df.columns else 0
    
    return {
        'period': period_start.strftime('%Y-%m-%d %H:%M'),
        'trades_count': trades_count,
        'win_rate': round(win_rate, 3),
        'total_pnl': round(total_pnl, 2),
        'avg_trade_duration': 0.0,  # 실제 계산 필요
        'max_drawdown': 0.0,  # 실제 계산 필요
        'timestamp': datetime.now().isoformat()
    }

def compare_results(previous: Dict, current: Dict) -> List[str]:
    """백테스트 결과 비교 및 변화 감지"""
    changes = []
    
    # 한글 주석: 거래 수 변화
    if abs(current['trades_count'] - previous['trades_count']) > 2:
        changes.append(f"거래 수 변화: {previous['trades_count']} → {current['trades_count']}")
    
    # 한글 주석: 승률 변화 (5% 이상)
    win_rate_change = abs(current['win_rate'] - previous['win_rate'])
    if win_rate_change > 0.05:
        direction = "증가" if current['win_rate'] > previous['win_rate'] else "감소"
        changes.append(f"승률 {direction}: {previous['win_rate']:.1%} → {current['win_rate']:.1%}")
    
    # 한글 주석: PnL 변화 (10% 이상)
    if previous['total_pnl'] != 0:
        pnl_change_pct = abs((current['total_pnl'] - previous['total_pnl']) / previous['total_pnl'])
        if pnl_change_pct > 0.1:
            direction = "증가" if current['total_pnl'] > previous['total_pnl'] else "감소"
            changes.append(f"PnL {direction}: {previous['total_pnl']:.2f} → {current['total_pnl']:.2f}")
    
    return changes

def run_ml_training_and_evaluation() -> Dict:
    """ML 모델 학습 및 평가 실행"""
    try:
        from ml_pipeline.data_processor import MLDataPipeline
        from ml_pipeline.model_trainer import MLModelTrainer
        
        # 한글 주석: 최신 백테스트 데이터로 피처 엔지니어링
        pipeline = MLDataPipeline()
        training_data_file = pipeline.run_pipeline("data/backtest_results")
        
        if not training_data_file or not Path(training_data_file).exists():
            logger.warning("훈련 데이터 생성 실패")
            return {}
        
        # 한글 주석: 모델 학습
        trainer = MLModelTrainer()
        result = trainer.train_model(training_data_file)
        
        if not result:
            logger.warning("모델 학습 실패")
            return {}
        
        # 한글 주석: 훈련 데이터 정보 수집
        training_df = pd.read_csv(training_data_file)
        
        return {
            'latest_r2_score': result.get('r2_score', 0),
            'latest_accuracy': result.get('accuracy', 0),
            'latest_precision': result.get('precision', 0),
            'latest_recall': result.get('recall', 0),
            'latest_f1_score': result.get('f1_score', 0),
            'model_last_trained': datetime.now().isoformat(),
            'training_samples': len(training_df),
            'feature_count': len(training_df.columns) - 1  # 타겟 변수 제외
        }
        
    except Exception as e:
        logger.error(f"ML 학습 및 평가 실패: {e}")
        return {}

@app.route('/api/backtest-results', methods=['GET'])
def get_backtest_results():
    """백테스트 결과 목록 API"""
    try:
        results_dir = Path('../data/backtest_results')
        if not results_dir.exists():
            return jsonify({'results': []})
        
        csv_files = list(results_dir.glob('*.csv'))
        results = []
        
        for file_path in csv_files[:10]:  # 최근 10개만
            try:
                df = pd.read_csv(file_path)
                if len(df) > 0:
                    results.append({
                        'filename': file_path.name,
                        'symbol': df['symbol'].iloc[0] if 'symbol' in df.columns else 'UNKNOWN',
                        'trades_count': len(df),
                        'win_rate': len(df[df['pnl'] > 0]) / len(df) if len(df) > 0 else 0,
                        'total_pnl': df['pnl'].sum() if 'pnl' in df.columns else 0,
                        'created_at': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                    })
            except Exception as e:
                continue
        
        return jsonify({'results': results})
        
    except Exception as e:
        return jsonify({'error': f'백테스트 결과 로드 실패: {str(e)}'}), 500

def start_auto_continuous_backtest():
    """서버 시작 시 연속 백테스팅 자동 시작"""
    global continuous_backtest_status
    
    # 한글 주석: 자동 시작 설정
    continuous_backtest_status.update({
        'running': True,  # 자동 시작 시 실행 상태 반영
        'auto_enabled': True,
        'start_date': '2016-01-01',
        'interval_minutes': 1,
        'symbol': os.getenv('FIXED_SYMBOL', 'BTCUSDT'),
        'fixed_mode': True,            # 동일 구간 반복
        'model_lock_enabled': True,    # 동일 모델 유지
    })
    
    print('🔄 연속 백테스팅 자동 시작 중...')
    
    # 한글 주석: 백그라운드에서 연속 백테스팅 시작
    import threading
    # 고정 구간 기본값 주입
    continuous_backtest_status['fixed_window'] = get_default_fixed_window()
    threading.Thread(target=run_continuous_backtest, daemon=True).start()
    
    print('✅ 연속 백테스팅이 자동으로 시작되었습니다.')

if __name__ == '__main__':
    print('🚀 ML 모니터링 API 서버 시작!')
    print('🌐 API URL: http://localhost:5002')
    print('📱 프론트엔드 URL: http://localhost:3000')
    print('🔐 관리자: admin / ml_admin_2025')
    print('=' * 50)
    
    # 한글 주석: 서버 시작 후 연속 백테스팅 자동 시작
    import threading
    threading.Timer(3.0, start_auto_continuous_backtest).start()  # 3초 후 자동 시작
    
    app.run(host='0.0.0.0', port=5002, debug=True, use_reloader=False)

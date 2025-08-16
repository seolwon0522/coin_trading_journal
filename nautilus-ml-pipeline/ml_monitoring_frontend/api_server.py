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
from datetime import datetime
import pandas as pd
from pathlib import Path

# 상위 디렉토리 모듈 임포트를 위한 경로 추가
sys.path.append(str(Path(__file__).parent.parent))

app = Flask(__name__)

# CORS 설정 - 리액트 개발 서버(3000)와 프로덕션 허용
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"]
    }
})

# 관리자 인증 정보
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "ml_admin_2025"

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
        'logs': [f'{datetime.now().strftime("%H:%M:%S")} - 백테스트 시작: {symbol} ({duration}일)']
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

if __name__ == '__main__':
    print('🚀 ML 모니터링 API 서버 시작!')
    print('🌐 API URL: http://localhost:5002')
    print('📱 프론트엔드 URL: http://localhost:3000')
    print('🔐 관리자: admin / ml_admin_2025')
    print('=' * 50)
    
    app.run(host='0.0.0.0', port=5002, debug=True, use_reloader=False)

"""
간단한 웹 대시보드 (백테스트 테스트용)
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_cors import CORS
from datetime import datetime
import json
import os
import hashlib
from pathlib import Path
import time
import threading
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.secret_key = 'simple-test-key'

# 한글 주석: 백테스트 실행 상태 관리
backtest_status = {
    'running': False,
    'progress': 0,
    'current_step': '',
    'result': None,
    'error': None,
    'start_time': None,
    'logs': []
}

@app.route('/')
def dashboard():
    """메인 대시보드 (로그인 없음, 테스트용)"""
    try:
        dashboard_data = {
            'health_check': {'score': 85, 'status': 'healthy'},
            'performance_summary': {'test_r2': 0.234},
            'recent_alerts': [],
            'recent_history': [],
            'total_evaluations': 0,
            'total_alerts': 0,
            'last_update': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        return render_template('dashboard.html', data=dashboard_data)
        
    except Exception as e:
        return f"대시보드 로드 오류: {str(e)}"

@app.route('/api/backtest/start', methods=['POST'])
def api_start_backtest():
    """1년치 백테스트 시작 API (간단 버전)"""
    global backtest_status
    
    try:
        # 한글 주석: 이미 실행 중인지 확인
        if backtest_status['running']:
            return jsonify({
                'success': False,
                'error': '백테스트가 이미 실행 중입니다'
            }), 400
        
        # 한글 주석: 요청 파라미터 파싱
        data = request.get_json() or {}
        symbol = data.get('symbol', 'BTCUSDT')
        chunk_size = data.get('chunk_size', 30)
        timeframe = data.get('timeframe', '1m')
        
        # 한글 주석: 상태 초기화
        backtest_status.update({
            'running': True,
            'progress': 0,
            'current_step': '백테스트 준비 중...',
            'result': None,
            'error': None,
            'start_time': datetime.now().isoformat(),
            'logs': [f'{datetime.now().strftime("%H:%M:%S")} - {symbol} 1년치 백테스트 시작']
        })
        
        # 한글 주석: 백그라운드에서 백테스트 실행
        executor = ThreadPoolExecutor(max_workers=1)
        executor.submit(run_simple_backtest, symbol, chunk_size, timeframe)
        
        return jsonify({
            'success': True,
            'message': f'{symbol} 1년치 백테스트가 시작되었습니다',
            'status': backtest_status
        })
        
    except Exception as e:
        backtest_status.update({
            'running': False,
            'error': str(e)
        })
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/backtest/status')
def api_backtest_status():
    """백테스트 진행 상황 조회 API"""
    return jsonify({
        'success': True,
        'status': backtest_status
    })

@app.route('/api/backtest/stop', methods=['POST'])
def api_stop_backtest():
    """백테스트 중단 API"""
    global backtest_status
    
    if not backtest_status['running']:
        return jsonify({
            'success': False,
            'error': '실행 중인 백테스트가 없습니다'
        })
    
    backtest_status.update({
        'running': False,
        'current_step': '사용자에 의해 중단됨',
        'error': '수동 중단'
    })
    
    return jsonify({
        'success': True,
        'message': '백테스트 중단 요청 완료'
    })

def run_simple_backtest(symbol: str, chunk_size: int, timeframe: str):
    """간단한 백테스트 시뮬레이션"""
    global backtest_status
    
    try:
        # 한글 주석: 상태 업데이트 헬퍼 함수
        def update_status(progress: int, step: str, log_msg: str = None):
            backtest_status.update({
                'progress': progress,
                'current_step': step
            })
            if log_msg:
                timestamp = datetime.now().strftime("%H:%M:%S")
                backtest_status['logs'].append(f'{timestamp} - {log_msg}')
        
        # 한글 주석: 시뮬레이션 진행
        update_status(5, '백테스트 러너 초기화 중...', '시스템 초기화 완료')
        time.sleep(2)
        
        update_status(20, '데이터 로딩 중...', f'{symbol} 1년치 데이터 로드')
        time.sleep(3)
        
        update_status(40, '거래 신호 생성 중...', '기술적 분석 신호 생성')
        time.sleep(3)
        
        update_status(60, '포지션 관리 중...', '거래 실행 시뮬레이션')
        time.sleep(3)
        
        update_status(75, 'ML 모델 훈련 중...', 'XGBoost 모델 훈련 시작')
        time.sleep(4)
        
        update_status(90, '성능 분석 중...', '결과 분석 및 메트릭 계산')
        time.sleep(2)
        
        update_status(100, '완료!', f'{symbol} 백테스트 및 ML 훈련 완료')
        
        # 한글 주석: 시뮬레이션 결과 생성
        backtest_status.update({
            'running': False,
            'result': {
                'symbol': symbol,
                'trades_generated': 1234,
                'model_r2': 0.234,
                'execution_time_hours': 0.5,  # 30초 시뮬레이션
                'win_rate': 58.3,
                'sharpe_ratio': 1.45
            }
        })
        
    except Exception as e:
        backtest_status.update({
            'running': False,
            'error': str(e),
            'current_step': f'오류 발생: {str(e)}'
        })
        timestamp = datetime.now().strftime("%H:%M:%S")
        backtest_status['logs'].append(f'{timestamp} - 오류: {str(e)}')

if __name__ == '__main__':
    print("🌐 간단한 대시보드 시작 중...")
    print("📍 접속 주소: http://localhost:5001")
    print("🎯 백테스트 기능 테스트 가능")
    app.run(host='0.0.0.0', port=5001, debug=True)

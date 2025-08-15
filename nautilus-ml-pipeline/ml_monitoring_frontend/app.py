"""
ML 성능 모니터링 관리자 대시보드
- 관리자 전용 인증
- 실시간 성능 모니터링
- 알림 관리 및 리포트
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from datetime import datetime, timedelta
import json
import os
import hashlib
from pathlib import Path
import pandas as pd
import sys

# 한글 주석: 상위 디렉토리의 성능 모니터 임포트
sys.path.append(str(Path(__file__).parent.parent))
from ml_pipeline.performance_monitor import PerformanceMonitor

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'ml-monitoring-secret-key-2025')

# 한글 주석: Flask-Login 설정
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = '관리자 로그인이 필요합니다.'

# 한글 주석: 관리자 계정 설정 (환경변수 또는 기본값)
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH', 
    hashlib.sha256('admin123'.encode()).hexdigest())  # 기본 비밀번호: admin123

class User(UserMixin):
    """관리자 사용자 클래스"""
    def __init__(self, id):
        self.id = id
        self.username = ADMIN_USERNAME

@login_manager.user_loader
def load_user(user_id):
    if user_id == ADMIN_USERNAME:
        return User(user_id)
    return None

# 한글 주석: 성능 모니터 인스턴스
performance_monitor = PerformanceMonitor()

@app.route('/')
@login_required
def dashboard():
    """메인 대시보드"""
    try:
        # 한글 주석: 모델 건강성 체크
        health_check = performance_monitor.check_model_health()
        
        # 한글 주석: 최근 7일 성능 요약
        performance_summary = performance_monitor.get_performance_summary(7)
        
        # 한글 주석: 최근 알림 가져오기
        recent_alerts = performance_monitor.alerts[-10:] if performance_monitor.alerts else []
        
        # 한글 주석: 최근 성능 히스토리 (차트용)
        recent_history = performance_monitor.performance_history[-20:] if performance_monitor.performance_history else []
        
        dashboard_data = {
            'health_check': health_check,
            'performance_summary': performance_summary,
            'recent_alerts': recent_alerts,
            'recent_history': recent_history,
            'total_evaluations': len(performance_monitor.performance_history),
            'total_alerts': len(performance_monitor.alerts),
            'last_update': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        return render_template('dashboard.html', data=dashboard_data)
        
    except Exception as e:
        flash(f'대시보드 데이터 로드 실패: {str(e)}', 'error')
        return render_template('dashboard.html', data={})

@app.route('/login', methods=['GET', 'POST'])
def login():
    """관리자 로그인"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # 한글 주석: 비밀번호 해시 검증
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        if username == ADMIN_USERNAME and password_hash == ADMIN_PASSWORD_HASH:
            user = User(username)
            login_user(user, remember=True)
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('dashboard'))
        else:
            flash('잘못된 사용자명 또는 비밀번호입니다.', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    """로그아웃"""
    logout_user()
    flash('성공적으로 로그아웃되었습니다.', 'success')
    return redirect(url_for('login'))

@app.route('/api/performance_data')
@login_required
def api_performance_data():
    """성능 데이터 API (AJAX용)"""
    try:
        days = request.args.get('days', 7, type=int)
        performance_summary = performance_monitor.get_performance_summary(days)
        health_check = performance_monitor.check_model_health()
        
        return jsonify({
            'success': True,
            'health_check': health_check,
            'performance_summary': performance_summary,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/alerts')
@login_required
def api_alerts():
    """알림 데이터 API"""
    try:
        limit = request.args.get('limit', 20, type=int)
        severity_filter = request.args.get('severity', None)
        
        alerts = performance_monitor.alerts
        
        # 한글 주석: 심각도 필터링
        if severity_filter:
            alerts = [a for a in alerts if a.get('severity') == severity_filter]
        
        # 한글 주석: 최신순 정렬 및 제한
        alerts = sorted(alerts, key=lambda x: x['timestamp'], reverse=True)[:limit]
        
        return jsonify({
            'success': True,
            'alerts': alerts,
            'total_count': len(performance_monitor.alerts)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/performance_history')
@login_required
def api_performance_history():
    """성능 히스토리 API (차트용)"""
    try:
        days = request.args.get('days', 30, type=int)
        cutoff_time = datetime.now() - timedelta(days=days)
        
        history = [
            h for h in performance_monitor.performance_history
            if datetime.fromisoformat(h['timestamp']) > cutoff_time
        ]
        
        # 한글 주석: 차트용 데이터 포맷팅
        chart_data = {
            'timestamps': [h['timestamp'] for h in history],
            'r2_scores': [h['r2_score'] for h in history],
            'rmse_scores': [h['rmse'] for h in history],
            'overfit_ratios': [h['overfit_ratio'] for h in history],
            'drift_scores': [h.get('drift_score', 0) for h in history]
        }
        
        return jsonify({
            'success': True,
            'chart_data': chart_data,
            'period_days': days
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/pnl_history')
@login_required
def api_pnl_history():
    """백테스트 결과 기반 PnL 히스토리 제공 API"""
    try:
        agg = request.args.get('agg', 'daily')  # raw | daily
        # 한글 주석: 최신 백테스트 결과 CSV 찾기
        base_dir = Path(__file__).parent.parent
        results_dir = base_dir / 'data' / 'backtest_results'
        if not results_dir.exists():
            return jsonify({'success': True, 'chart_data': {'timestamps': [], 'pnl': [], 'cum_pnl': []}, 'metrics': {}})

        csv_files = sorted(results_dir.glob('backtest_*.csv'), key=lambda p: p.stat().st_mtime, reverse=True)
        if not csv_files:
            return jsonify({'success': True, 'chart_data': {'timestamps': [], 'pnl': [], 'cum_pnl': []}, 'metrics': {}})

        latest_file = csv_files[0]
        df = pd.read_csv(latest_file)

        # 한글 주석: 필수 컬럼 검증
        required_cols = {'timestamp', 'pnl'}
        if not required_cols.issubset(set(df.columns)):
            return jsonify({'success': False, 'error': f'필수 컬럼 누락: {required_cols - set(df.columns)} in {latest_file.name}'}), 400

        # 한글 주석: 타임스탬프 정렬 및 누적 PnL 계산
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp')
        df['cum_pnl'] = df['pnl'].cumsum()

        # 한글 주석: 지표 계산 (간단 버전)
        initial_capital = 10000.0
        equity = initial_capital + df['cum_pnl']
        rolling_max = equity.cummax()
        drawdown = (equity - rolling_max) / rolling_max.replace(0, pd.NA)
        max_dd = float(drawdown.min()) if len(drawdown) else 0.0
        period_years = max((df['timestamp'].iloc[-1] - df['timestamp'].iloc[0]).days / 365.25, 1/365.25) if len(df) else 1.0
        cagr = float((equity.iloc[-1] / initial_capital) ** (1/period_years) - 1) if len(df) else 0.0
        wins = (df['pnl'] > 0).sum()
        losses = (df['pnl'] <= 0).sum()
        total_pnl = float(df['pnl'].sum()) if len(df) else 0.0
        avg_pnl = float(df['pnl'].mean()) if len(df) else 0.0
        profit_factor = float(df.loc[df['pnl']>0,'pnl'].sum() / abs(df.loc[df['pnl']<0,'pnl'].sum())) if (df['pnl']<0).any() else None
        # Sharpe (일간 수익률 기반)
        daily = df[['timestamp','pnl']].set_index('timestamp').resample('1D').sum()
        daily_returns = daily['pnl'] / initial_capital
        sharpe = float((daily_returns.mean() / (daily_returns.std() if daily_returns.std() not in [0, None] else 1e-9)) * (252 ** 0.5)) if len(daily_returns) > 1 else 0.0

        metrics = {
            'trades': int(len(df)),
            'total_pnl': round(total_pnl, 2),
            'win_rate': round((wins / len(df) * 100) if len(df) else 0.0, 2),
            'avg_pnl': round(avg_pnl, 2),
            'max_drawdown_pct': round(max_dd * 100, 2),
            'cagr_pct': round(cagr * 100, 2),
            'sharpe': round(sharpe, 2),
            'profit_factor': round(profit_factor, 2) if profit_factor is not None else None,
            'initial_capital': initial_capital,
        }

        # 한글 주석: 집계(가독성 개선)
        if agg == 'daily':
            df_agg = df[['timestamp','pnl','cum_pnl']].set_index('timestamp').resample('1D').agg({'pnl':'sum'})
            df_agg['cum_pnl'] = df_agg['pnl'].cumsum()
            timestamps = df_agg.index.strftime('%Y-%m-%d').tolist()
            pnl_vals = df_agg['pnl'].fillna(0).tolist()
            cum_vals = df_agg['cum_pnl'].fillna(0).tolist()
        else:
            timestamps = df['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S').tolist()
            pnl_vals = df['pnl'].tolist()
            cum_vals = df['cum_pnl'].tolist()

        chart_data = {
            'timestamps': timestamps,
            'pnl': pnl_vals,
            'cum_pnl': cum_vals,
            'source_file': latest_file.name,
            'aggregation': agg,
        }

        return jsonify({'success': True, 'chart_data': chart_data, 'metrics': metrics})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/export_report')
@login_required
def api_export_report():
    """성능 리포트 내보내기 API"""
    try:
        report_file = performance_monitor.export_performance_report()
        
        if report_file:
            return jsonify({
                'success': True,
                'report_file': report_file,
                'message': '성능 리포트가 성공적으로 생성되었습니다.'
            })
        else:
            return jsonify({
                'success': False,
                'error': '리포트 생성에 실패했습니다.'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/reports')
@login_required
def reports():
    """리포트 페이지"""
    try:
        # 한글 주석: 상세 성능 분석
        performance_summary = performance_monitor.get_performance_summary(30)  # 30일
        health_check = performance_monitor.check_model_health()
        
        # 한글 주석: 알림 통계
        alert_stats = {}
        for alert in performance_monitor.alerts:
            severity = alert.get('severity', 'unknown')
            alert_stats[severity] = alert_stats.get(severity, 0) + 1
        
        reports_data = {
            'performance_summary': performance_summary,
            'health_check': health_check,
            'alert_stats': alert_stats,
            'total_performance_records': len(performance_monitor.performance_history),
            'total_alerts': len(performance_monitor.alerts)
        }
        
        return render_template('reports.html', data=reports_data)
        
    except Exception as e:
        flash(f'리포트 데이터 로드 실패: {str(e)}', 'error')
        return render_template('reports.html', data={})

@app.route('/alerts')
@login_required
def alerts():
    """알림 관리 페이지"""
    try:
        # 한글 주석: 최근 50개 알림
        recent_alerts = sorted(
            performance_monitor.alerts, 
            key=lambda x: x['timestamp'], 
            reverse=True
        )[:50]
        
        # 한글 주석: 알림 통계
        severity_counts = {}
        type_counts = {}
        
        for alert in performance_monitor.alerts:
            severity = alert.get('severity', 'unknown')
            alert_type = alert.get('alert_type', 'unknown')
            
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            type_counts[alert_type] = type_counts.get(alert_type, 0) + 1
        
        alerts_data = {
            'recent_alerts': recent_alerts,
            'severity_counts': severity_counts,
            'type_counts': type_counts,
            'total_alerts': len(performance_monitor.alerts)
        }
        
        return render_template('alerts.html', data=alerts_data)
        
    except Exception as e:
        flash(f'알림 데이터 로드 실패: {str(e)}', 'error')
        return render_template('alerts.html', data={})

@app.errorhandler(404)
def not_found_error(error):
    return render_template('error.html', 
                         error_code=404, 
                         error_message='페이지를 찾을 수 없습니다.'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('error.html', 
                         error_code=500, 
                         error_message='내부 서버 오류가 발생했습니다.'), 500

if __name__ == '__main__':
    # 한글 주석: 개발 모드로 실행
    app.run(host='0.0.0.0', port=5001, debug=True)

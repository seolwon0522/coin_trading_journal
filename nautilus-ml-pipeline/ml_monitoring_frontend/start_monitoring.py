#!/usr/bin/env python3
"""
ML 성능 모니터링 대시보드 시작 스크립트
- 개발/프로덕션 모드 선택
- 환경 변수 설정
- 로그 설정
"""

import os
import sys
import argparse
from pathlib import Path

def setup_environment():
    """환경 변수 설정"""
    # 한글 주석: 기본 환경 변수 설정
    os.environ.setdefault('FLASK_SECRET_KEY', 'ml-monitoring-secret-2025-trading-system')
    os.environ.setdefault('ADMIN_USERNAME', 'admin')
    
    # 한글 주석: 기본 비밀번호 해시 (admin123)
    import hashlib
    default_password_hash = hashlib.sha256('admin123'.encode()).hexdigest()
    os.environ.setdefault('ADMIN_PASSWORD_HASH', default_password_hash)
    
    print("환경 변수 설정 완료")
    print(f"관리자 계정: {os.environ['ADMIN_USERNAME']}")
    print("기본 비밀번호: admin123 (보안을 위해 변경 권장)")

def main():
    parser = argparse.ArgumentParser(description='ML 성능 모니터링 대시보드')
    parser.add_argument('--mode', choices=['dev', 'prod'], default='dev',
                       help='실행 모드 (dev: 개발, prod: 프로덕션)')
    parser.add_argument('--host', default='0.0.0.0', help='서버 호스트')
    parser.add_argument('--port', type=int, default=5001, help='서버 포트')
    parser.add_argument('--debug', action='store_true', help='디버그 모드')
    
    args = parser.parse_args()
    
    # 한글 주석: 환경 설정
    setup_environment()
    
    # 한글 주석: Flask 앱 임포트 및 실행
    try:
        from app import app
        
        print(f"\n{'='*60}")
        print(f"ML 성능 모니터링 대시보드 시작")
        print(f"{'='*60}")
        print(f"모드: {args.mode}")
        print(f"주소: http://{args.host}:{args.port}")
        print(f"관리자 계정: {os.environ['ADMIN_USERNAME']} / admin123")
        print(f"{'='*60}\n")
        
        if args.mode == 'dev':
            app.run(
                host=args.host,
                port=args.port,
                debug=args.debug or True,
                threaded=True
            )
        else:
            # 한글 주석: 프로덕션 모드 (Gunicorn 권장)
            print("프로덕션 모드에서는 Gunicorn 사용을 권장합니다:")
            print(f"gunicorn -w 4 -b {args.host}:{args.port} app:app")
            app.run(
                host=args.host,
                port=args.port,
                debug=False,
                threaded=True
            )
            
    except ImportError as e:
        print(f"Flask 앱 임포트 실패: {e}")
        print("필요한 의존성을 설치해주세요: pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"서버 시작 실패: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

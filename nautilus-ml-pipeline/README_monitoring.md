# ML 성능 모니터링 관리자 대시보드

## 🎯 개요

ML 모델의 성능을 실시간으로 모니터링하고 관리할 수 있는 웹 기반 관리자 전용 대시보드입니다.

## 🔧 주요 기능

### 1. 대시보드

- **실시간 성능 지표**: R², RMSE, 과적합 비율, 드리프트 스코어
- **모델 건강성 체크**: 100점 만점 건강 점수 및 상태 평가
- **성능 트렌드 차트**: 시간별 성능 변화 시각화
- **최근 알림**: 중요도별 알림 표시

### 2. 알림 관리

- **실시간 알림 모니터링**: 성능 저하, 과적합, 데이터 드리프트
- **심각도별 분류**: Critical, High, Medium, Low
- **필터링 및 검색**: 알림 유형, 심각도별 필터
- **추천사항 제공**: 각 알림에 대한 해결 방안

### 3. 성능 리포트

- **종합 성능 분석**: 30일간 성능 요약
- **트렌드 분석**: R², RMSE 개선/악화 추세
- **CSV 내보내기**: 상세 성능 데이터 다운로드
- **건강성 리포트**: 모델 상태 종합 평가

### 4. 보안

- **관리자 전용 접근**: 사용자명/비밀번호 인증
- **세션 관리**: Flask-Login 기반 보안 세션
- **암호화**: SHA256 해시 비밀번호 저장

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
cd ml_monitoring_frontend
pip install -r requirements.txt
```

### 2. 서버 시작

```bash
# 개발 모드
python start_monitoring.py --mode dev

# 프로덕션 모드
python start_monitoring.py --mode prod --host 0.0.0.0 --port 5001
```

### 3. 접속

- **URL**: http://localhost:5001
- **기본 계정**: admin / admin123

## 📊 API 엔드포인트

### 인증 필요 API

| 엔드포인트                     | 설명                      |
| ------------------------------ | ------------------------- |
| `GET /api/performance_data`    | 실시간 성능 데이터        |
| `GET /api/alerts`              | 알림 데이터 (필터링 지원) |
| `GET /api/performance_history` | 성능 히스토리 (차트용)    |
| `GET /api/export_report`       | 성능 리포트 내보내기      |

### 페이지

| 경로       | 설명          |
| ---------- | ------------- |
| `/`        | 메인 대시보드 |
| `/alerts`  | 알림 관리     |
| `/reports` | 성능 리포트   |
| `/login`   | 관리자 로그인 |

## 🔒 보안 설정

### 환경 변수

```bash
export FLASK_SECRET_KEY="your-secret-key-here"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD_HASH="sha256-hash-of-password"
```

### 비밀번호 변경

```python
import hashlib
new_password = "your_new_password"
password_hash = hashlib.sha256(new_password.encode()).hexdigest()
# ADMIN_PASSWORD_HASH 환경 변수에 설정
```

## 📱 UI 특징

### 반응형 디자인

- Bootstrap 5 기반 모던 UI
- 모바일/태블릿 호환
- 다크/라이트 테마 지원

### 실시간 업데이트

- 30초마다 자동 데이터 새로고침
- AJAX 기반 비동기 로딩
- 사용자 친화적 로딩 인디케이터

### 차트 및 시각화

- Chart.js 기반 인터랙티브 차트
- 성능 트렌드 시각화
- 알림 통계 도넛 차트

## 🛠️ 기술 스택

### 백엔드

- **Flask 3.0**: 웹 프레임워크
- **Flask-Login**: 인증 관리
- **Python 3.x**: 백엔드 로직

### 프론트엔드

- **Bootstrap 5**: UI 프레임워크
- **Chart.js**: 차트 라이브러리
- **Font Awesome**: 아이콘
- **JavaScript ES6**: 클라이언트 로직

### 데이터

- **JSON**: 성능 데이터 저장
- **CSV**: 리포트 내보내기
- **메모리**: 실시간 캐싱

## 🔧 커스터마이징

### 알림 임계값 수정

`ml_pipeline/performance_monitor.py`:

```python
self.thresholds = {
    'r2_degradation': 0.05,      # R² 5% 이상 하락
    'rmse_increase': 0.20,       # RMSE 20% 이상 증가
    'overfit_ratio': 0.15,       # 과적합 비율 15% 이상
    'min_performance_r2': 0.7,   # 최소 R² 임계값
    'max_acceptable_rmse': 3.0   # 최대 허용 RMSE
}
```

### UI 테마 변경

`templates/base.html`의 CSS 변수 수정:

```css
:root {
  --primary-color: #0d6efd;
  --success-color: #198754;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
}
```

## 📈 모니터링 지표

### 성능 지표

- **R² Score**: 모델 설명력 (0-1)
- **RMSE**: 평균 제곱근 오차
- **MAE**: 평균 절대 오차
- **과적합 비율**: 훈련/테스트 성능 차이

### 건강성 지표

- **건강 점수**: 종합 점수 (0-100)
- **드리프트 스코어**: 데이터 변화 감지
- **알림 빈도**: 문제 발생 빈도

## 🚨 알림 유형

### 성능 저하 (Degradation)

- R² 점수 임계값 이하
- RMSE 허용 범위 초과
- 성능 급격한 하락

### 과적합 (Overfitting)

- 훈련/테스트 성능 차이 과도
- 일반화 성능 저하

### 데이터 드리프트 (Drift)

- 입력 데이터 분포 변화
- 모델 예측 패턴 변화

## 🔄 업데이트 주기

### 자동 업데이트

- **대시보드**: 30초마다
- **성능 기록**: 모델 훈련 시
- **알림 생성**: 실시간

### 수동 업데이트

- **데이터 새로고침**: 사이드바 버튼
- **리포트 내보내기**: 온디맨드

## 📝 로그 및 디버깅

### 로그 파일

```
logs/
├── pipeline.log          # 메인 파이프라인 로그
├── performance.log       # 성능 모니터링 로그
└── monitoring_app.log    # 웹 앱 로그
```

### 디버그 모드

```bash
python start_monitoring.py --mode dev --debug
```

## 🔐 프로덕션 배포

### Gunicorn 사용

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

### Nginx 프록시

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### SSL 인증서

```bash
certbot --nginx -d your-domain.com
```

## 📞 지원

- **이슈 리포팅**: GitHub Issues
- **문서 업데이트**: README.md 수정
- **기능 요청**: Feature Request 템플릿 사용

---

© 2025 ML Trading System. 관리자 전용 모니터링 대시보드.

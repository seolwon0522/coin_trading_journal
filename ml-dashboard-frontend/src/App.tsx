import React, { useState, useEffect } from "react";
import "./App.css";

// 타입 정의
interface DashboardData {
  health_check: {
    score: number;
    status: string;
    last_update: string;
  };
  performance_summary: {
    model_r2: number;
    accuracy: number;
    total_trades: number;
    win_rate: number;
  };
  recent_alerts: Array<{
    id: number;
    message: string;
    type: string;
    timestamp: string;
  }>;
  system_status: {
    server_status: string;
    db_status: string;
    ml_models: string;
    last_backtest: string;
  };
  statistics: {
    total_backtests: number;
    total_models: number;
    avg_performance: number;
    uptime: string;
  };
}

interface BacktestStatus {
  running: boolean;
  progress: number;
  current_step: string;
  result?: any;
  error?: string;
  logs: string[];
}

const API_BASE = "http://localhost:5002/api";

function App() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [backtestStatus, setBacktestStatus] = useState<BacktestStatus | null>(
    null
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // 대시보드 데이터 로드
  const loadDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("대시보드 데이터 로드 실패:", error);
    }
  };

  // 백테스트 상태 확인
  const checkBacktestStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/backtest/status`);
      if (response.ok) {
        const status = await response.json();
        setBacktestStatus(status);
      }
    } catch (error) {
      console.error("백테스트 상태 확인 실패:", error);
    }
  };

  // 로그인 처리
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        await response.json();
        setIsLoggedIn(true);
        loadDashboardData();
      } else {
        const error = await response.json();
        setLoginError(error.error || "로그인 실패");
      }
    } catch {
      setLoginError("서버 연결 실패");
    }
  };

  // 백테스트 시작
  const startBacktest = async () => {
    try {
      const response = await fetch(`${API_BASE}/backtest/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: "BTCUSDT",
          timeframe: "1m",
          duration: 30,
        }),
      });

      if (response.ok) {
        checkBacktestStatus();
      }
    } catch (error) {
      console.error("백테스트 시작 실패:", error);
    }
  };

  // 백테스트 중단
  const stopBacktest = async () => {
    try {
      await fetch(`${API_BASE}/backtest/stop`, { method: "POST" });
      checkBacktestStatus();
    } catch (error) {
      console.error("백테스트 중단 실패:", error);
    }
  };

  // 컴포넌트 마운트 시 실행
  useEffect(() => {
    if (isLoggedIn) {
      loadDashboardData();
      const interval = setInterval(() => {
        checkBacktestStatus();
      }, 2000); // 2초마다 상태 확인

      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // 로그인 화면
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>ML 모니터링 대시보드</h1>
          <p>관리자 로그인이 필요합니다</p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input
                type="text"
                placeholder="사용자명"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {loginError && <div className="error">{loginError}</div>}
            <button type="submit" className="login-btn">
              로그인
            </button>
          </form>

          <div className="login-hint">
            <small>기본 계정: admin / ml_admin_2025</small>
          </div>
        </div>
      </div>
    );
  }

  // 메인 대시보드
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>ML 모니터링 대시보드</h1>
        <div className="header-actions">
          <span>관리자: {username}</span>
          <button onClick={() => setIsLoggedIn(false)} className="logout-btn">
            로그아웃
          </button>
        </div>
      </header>

      {dashboardData && (
        <div className="dashboard-content">
          {/* 시스템 상태 */}
          <div className="status-grid">
            <div className="status-card">
              <h3>시스템 상태</h3>
              <div className="status-item">
                <span>서버:</span>{" "}
                <span className="status-ok">
                  {dashboardData.system_status.server_status}
                </span>
              </div>
              <div className="status-item">
                <span>DB:</span>{" "}
                <span className="status-ok">
                  {dashboardData.system_status.db_status}
                </span>
              </div>
              <div className="status-item">
                <span>ML 모델:</span>{" "}
                <span className="status-ok">
                  {dashboardData.system_status.ml_models}
                </span>
              </div>
            </div>

            <div className="status-card">
              <h3>성능 요약</h3>
              <div className="metric">
                <span>모델 정확도:</span>{" "}
                <strong>
                  {(dashboardData.performance_summary.accuracy * 100).toFixed(
                    1
                  )}
                  %
                </strong>
              </div>
              <div className="metric">
                <span>승률:</span>{" "}
                <strong>
                  {(dashboardData.performance_summary.win_rate * 100).toFixed(
                    1
                  )}
                  %
                </strong>
              </div>
              <div className="metric">
                <span>총 거래:</span>{" "}
                <strong>
                  {dashboardData.performance_summary.total_trades}
                </strong>
              </div>
            </div>

            <div className="status-card">
              <h3>통계</h3>
              <div className="metric">
                <span>총 백테스트:</span>{" "}
                <strong>{dashboardData.statistics.total_backtests}</strong>
              </div>
              <div className="metric">
                <span>ML 모델:</span>{" "}
                <strong>{dashboardData.statistics.total_models}</strong>
              </div>
              <div className="metric">
                <span>가동시간:</span>{" "}
                <strong>{dashboardData.statistics.uptime}</strong>
              </div>
            </div>
          </div>

          {/* 백테스트 컨트롤 */}
          <div className="backtest-section">
            <div className="section-header">
              <h2>백테스트 & ML 훈련</h2>
              <div className="backtest-controls">
                {!backtestStatus?.running ? (
                  <button onClick={startBacktest} className="start-btn">
                    백테스트 시작
                  </button>
                ) : (
                  <button onClick={stopBacktest} className="stop-btn">
                    중단
                  </button>
                )}
              </div>
            </div>

            {backtestStatus && (
              <div className="backtest-status">
                <div className="status-info">
                  <span>
                    상태: {backtestStatus.running ? "실행 중" : "대기"}
                  </span>
                  <span>진행: {backtestStatus.progress}%</span>
                  <span>단계: {backtestStatus.current_step}</span>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${backtestStatus.progress}%` }}
                  ></div>
                </div>

                {backtestStatus.logs.length > 0 && (
                  <div className="logs-section">
                    <h4>실시간 로그</h4>
                    <div className="logs">
                      {backtestStatus.logs.slice(-5).map((log, index) => (
                        <div key={index} className="log-entry">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {backtestStatus.result && (
                  <div className="results-section">
                    <h4>백테스트 결과</h4>
                    <div className="result-grid">
                      <div>
                        거래 수:{" "}
                        <strong>
                          {backtestStatus.result.trades_generated}
                        </strong>
                      </div>
                      <div>
                        승률:{" "}
                        <strong>
                          {(backtestStatus.result.win_rate * 100).toFixed(1)}%
                        </strong>
                      </div>
                      <div>
                        총 수익률:{" "}
                        <strong>
                          {backtestStatus.result.total_return?.toFixed(2)}%
                        </strong>
                      </div>
                      <div>
                        최대 손실:{" "}
                        <strong>{backtestStatus.result.max_drawdown}%</strong>
                      </div>
                    </div>

                    {backtestStatus.result.features_engineered && (
                      <div className="features-section">
                        <h5>생성된 피처들</h5>
                        <div className="features-list">
                          {backtestStatus.result.features_engineered.map(
                            (feature: string, index: number) => (
                              <span key={index} className="feature-tag">
                                {feature}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {backtestStatus.result.model_updated && (
                      <div className="model-update-notice">
                        <span className="success-icon">●</span>
                        ML 모델이 새로운 데이터로 업데이트되었습니다!
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 알림 */}
          {dashboardData.recent_alerts.length > 0 && (
            <div className="alerts-section">
              <h3>최근 알림</h3>
              {dashboardData.recent_alerts.map((alert) => (
                <div key={alert.id} className={`alert alert-${alert.type}`}>
                  {alert.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

"""
Nautilus Trading Node - 메인 트레이딩 노드
"""
import asyncio
from typing import Dict, List, Optional, Any, Type
from datetime import datetime
import signal
import sys
from pathlib import Path

from .logger import setup_logger, get_logger, TradingLogger
from .event_handler import EventHandler, Event, EventType
from .engine import TradingEngine
from config.config import TradingConfig


class TradingNode:
    """
    트레이딩 노드 - Nautilus Trader의 메인 컨트롤러
    모든 컴포넌트를 관리하고 조정
    """

    def __init__(
        self,
        node_id: str = "TRADING_NODE_001",
        config: Optional[TradingConfig] = None
    ):
        """
        트레이딩 노드 초기화

        Args:
            node_id: 노드 식별자
            config: 트레이딩 설정
        """
        self.node_id = node_id
        self.config = config or TradingConfig()

        # 로거 설정
        self.logger = setup_logger(
            name=f"{node_id}_logger",
            log_level=self.config.log_level,
            log_file=self.config.log_file_path,
            console_output=True
        )
        self.trading_logger = TradingLogger(self.logger)

        # 이벤트 핸들러
        self.event_handler = EventHandler(f"{node_id}_EventHandler")

        # 트레이딩 엔진
        self.trading_engine = TradingEngine(
            engine_id=f"{node_id}_Engine",
            event_handler=self.event_handler
        )

        # 데이터 클라이언트 (향후 구현)
        self.data_clients: Dict[str, Any] = {}

        # 실행 클라이언트 (향후 구현)
        self.exec_clients: Dict[str, Any] = {}

        # 전략 레지스트리
        self.strategies: Dict[str, Any] = {}

        # 어댑터 레지스트리 (향후 구현)
        self.adapters: Dict[str, Any] = {}

        # 실행 상태
        self._running = False
        self._loop: Optional[asyncio.AbstractEventLoop] = None

        # 성능 메트릭
        self.start_time: Optional[datetime] = None
        self.total_trades = 0
        self.total_pnl = 0.0

        self.logger.info(f"트레이딩 노드 초기화 완료: {self.node_id}")
        self._log_configuration()

    def _log_configuration(self):
        """설정 정보 로깅"""
        self.logger.info("=== 트레이딩 노드 설정 ===")
        self.logger.info(f"노드 ID: {self.node_id}")
        self.logger.info(f"트레이더 ID: {self.config.trader_id}")
        self.logger.info(f"테스트넷 사용: {self.config.use_testnet}")
        self.logger.info(f"초기 자본: {self.config.initial_capital}")
        self.logger.info(f"최대 포지션 크기: {self.config.max_position_size}")
        self.logger.info(f"최대 오픈 포지션: {self.config.max_open_positions}")
        self.logger.info(f"일일 손실 한도: {self.config.daily_loss_limit}")
        self.logger.info(f"로그 레벨: {self.config.log_level}")
        self.logger.info("========================")

    async def initialize(self):
        """노드 초기화 - 모든 컴포넌트 설정"""
        try:
            self.logger.info("트레이딩 노드 초기화 시작...")

            # 이벤트 핸들러 시작
            await self.event_handler.start()

            # 이벤트 구독 설정
            self._setup_event_subscriptions()

            # 트레이딩 엔진 시작
            await self.trading_engine.start()

            # 데이터 클라이언트 초기화 (향후 구현)
            await self._initialize_data_clients()

            # 실행 클라이언트 초기화 (향후 구현)
            await self._initialize_exec_clients()

            self.logger.info("트레이딩 노드 초기화 완료")

        except Exception as e:
            self.logger.error(f"노드 초기화 실패: {str(e)}", exc_info=True)
            raise

    async def _initialize_data_clients(self):
        """데이터 클라이언트 초기화"""
        # TODO: Binance 데이터 클라이언트 초기화
        self.logger.info("데이터 클라이언트 초기화 (향후 구현 예정)")

    async def _initialize_exec_clients(self):
        """실행 클라이언트 초기화"""
        # TODO: Binance 실행 클라이언트 초기화
        self.logger.info("실행 클라이언트 초기화 (향후 구현 예정)")

    def _setup_event_subscriptions(self):
        """이벤트 구독 설정"""
        # 시스템 이벤트
        self.event_handler.subscribe(
            EventType.SYSTEM_ERROR,
            self._handle_system_error
        )

        # 연결 이벤트
        self.event_handler.subscribe(
            EventType.CONNECTION_LOST,
            self._handle_connection_lost
        )

        self.event_handler.subscribe(
            EventType.CONNECTION_RESTORED,
            self._handle_connection_restored
        )

        # 전략 이벤트
        self.event_handler.subscribe(
            EventType.STRATEGY_ERROR,
            self._handle_strategy_error
        )

        self.logger.info("이벤트 구독 설정 완료")

    def _handle_system_error(self, event: Event):
        """시스템 에러 처리"""
        error_msg = event.data.get("error", "Unknown error")
        self.logger.error(f"시스템 에러: {error_msg}")
        self.trading_logger.error(f"시스템 에러 발생", exception=event.data.get("exception"))

    def _handle_connection_lost(self, event: Event):
        """연결 끊김 처리"""
        source = event.data.get("source", "Unknown")
        self.logger.warning(f"연결 끊김: {source}")

        # 자동 재연결 시도
        asyncio.create_task(self._reconnect(source))

    def _handle_connection_restored(self, event: Event):
        """연결 복구 처리"""
        source = event.data.get("source", "Unknown")
        self.logger.info(f"연결 복구됨: {source}")

    def _handle_strategy_error(self, event: Event):
        """전략 에러 처리"""
        strategy_id = event.data.get("strategy_id", "Unknown")
        error_msg = event.data.get("error", "Unknown error")
        self.logger.error(f"전략 에러 [{strategy_id}]: {error_msg}")

    async def _reconnect(self, source: str, max_retries: int = 5):
        """재연결 시도"""
        for retry in range(1, max_retries + 1):
            self.logger.info(f"재연결 시도 {retry}/{max_retries}: {source}")

            try:
                # TODO: 실제 재연결 로직 구현
                await asyncio.sleep(2 ** retry)  # 지수 백오프

                # 재연결 성공 이벤트
                self.event_handler.publish(Event(
                    event_type=EventType.CONNECTION_RESTORED,
                    source=self.node_id,
                    data={"source": source}
                ))
                break

            except Exception as e:
                self.logger.error(f"재연결 실패: {str(e)}")

                if retry == max_retries:
                    self.logger.critical(f"최대 재연결 시도 횟수 초과: {source}")

    def add_strategy(self, strategy_id: str, strategy: Any):
        """
        전략 추가

        Args:
            strategy_id: 전략 식별자
            strategy: 전략 인스턴스
        """
        if strategy_id in self.strategies:
            self.logger.warning(f"전략이 이미 존재함: {strategy_id}")
            return

        self.strategies[strategy_id] = strategy
        self.logger.info(f"전략 추가됨: {strategy_id}")

        # 전략 시작 이벤트
        self.event_handler.publish(Event(
            event_type=EventType.STRATEGY_START,
            source=self.node_id,
            data={"strategy_id": strategy_id}
        ))

    def remove_strategy(self, strategy_id: str):
        """
        전략 제거

        Args:
            strategy_id: 전략 식별자
        """
        if strategy_id not in self.strategies:
            self.logger.warning(f"전략을 찾을 수 없음: {strategy_id}")
            return

        # 전략 중지 이벤트
        self.event_handler.publish(Event(
            event_type=EventType.STRATEGY_STOP,
            source=self.node_id,
            data={"strategy_id": strategy_id}
        ))

        del self.strategies[strategy_id]
        self.logger.info(f"전략 제거됨: {strategy_id}")

    async def start(self):
        """트레이딩 노드 시작"""
        if self._running:
            self.logger.warning("트레이딩 노드가 이미 실행 중입니다")
            return

        try:
            self.logger.info("트레이딩 노드 시작...")
            self._running = True
            self.start_time = datetime.utcnow()

            # 이벤트 루프 저장
            self._loop = asyncio.get_running_loop()

            # 노드 초기화
            await self.initialize()

            # 시그널 핸들러 설정
            self._setup_signal_handlers()

            # 시스템 시작 이벤트
            self.event_handler.publish(Event(
                event_type=EventType.SYSTEM_START,
                source=self.node_id
            ))

            self.logger.info("트레이딩 노드 시작 완료")

            # 메인 루프
            await self._main_loop()

        except Exception as e:
            self.logger.error(f"트레이딩 노드 시작 실패: {str(e)}", exc_info=True)
            await self.stop()
            raise

    async def _main_loop(self):
        """메인 실행 루프"""
        self.logger.info("메인 루프 시작")

        while self._running:
            try:
                # 상태 체크 및 모니터링
                await self._check_health()

                # 1초 대기
                await asyncio.sleep(1)

            except Exception as e:
                self.logger.error(f"메인 루프 에러: {str(e)}", exc_info=True)

        self.logger.info("메인 루프 종료")

    async def _check_health(self):
        """시스템 헬스 체크"""
        # 10초마다 상태 로그
        if int(datetime.utcnow().timestamp()) % 10 == 0:
            summary = self.trading_engine.get_account_summary()
            self.logger.debug(f"시스템 상태: {summary}")

    async def stop(self):
        """트레이딩 노드 중지"""
        if not self._running:
            return

        try:
            self.logger.info("트레이딩 노드 중지 시작...")
            self._running = False

            # 모든 전략 중지
            for strategy_id in list(self.strategies.keys()):
                self.remove_strategy(strategy_id)

            # 트레이딩 엔진 중지
            await self.trading_engine.stop()

            # 이벤트 핸들러 중지
            await self.event_handler.stop()

            # 시스템 중지 이벤트
            self.event_handler.publish(Event(
                event_type=EventType.SYSTEM_STOP,
                source=self.node_id
            ))

            # 최종 성과 로그
            self._log_final_performance()

            self.logger.info("트레이딩 노드 중지 완료")

        except Exception as e:
            self.logger.error(f"트레이딩 노드 중지 실패: {str(e)}", exc_info=True)

    def _log_final_performance(self):
        """최종 성과 로깅"""
        if self.start_time:
            runtime = datetime.utcnow() - self.start_time
            hours = runtime.total_seconds() / 3600

            self.logger.info("=== 최종 성과 요약 ===")
            self.logger.info(f"실행 시간: {hours:.2f} 시간")
            self.logger.info(f"총 거래 수: {self.total_trades}")
            self.logger.info(f"총 손익: {self.total_pnl:+.2f}")
            self.logger.info("======================")

    def _setup_signal_handlers(self):
        """시그널 핸들러 설정 (Ctrl+C 등)"""
        def signal_handler(signum, frame):
            self.logger.info(f"시그널 수신: {signum}")

            if self._loop and self._loop.is_running():
                asyncio.create_task(self.stop())

        # 시그널 핸들러 등록
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        self.logger.info("시그널 핸들러 설정 완료")

    def get_status(self) -> Dict[str, Any]:
        """노드 상태 반환"""
        runtime = None
        if self.start_time:
            runtime = (datetime.utcnow() - self.start_time).total_seconds()

        return {
            "node_id": self.node_id,
            "running": self._running,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "runtime_seconds": runtime,
            "strategies": list(self.strategies.keys()),
            "total_trades": self.total_trades,
            "total_pnl": self.total_pnl,
            "engine_status": self.trading_engine.get_account_summary(),
            "event_stats": self.event_handler.get_statistics()
        }


async def main():
    """테스트용 메인 함수"""
    # 설정 로드
    config = TradingConfig()

    # 트레이딩 노드 생성
    node = TradingNode(
        node_id="TEST_NODE",
        config=config
    )

    try:
        # 노드 시작
        await node.start()

    except KeyboardInterrupt:
        print("\n키보드 인터럽트 감지")

    except Exception as e:
        print(f"에러 발생: {e}")

    finally:
        # 노드 중지
        await node.stop()


if __name__ == "__main__":
    # 이벤트 루프 실행
    asyncio.run(main())
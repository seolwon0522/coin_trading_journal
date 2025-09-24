"""
이벤트 처리 시스템
"""
from typing import Dict, List, Callable, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import asyncio
from collections import defaultdict
import traceback
from .logger import get_logger


class EventType(Enum):
    """이벤트 타입 정의"""
    # 시장 데이터 이벤트
    MARKET_DATA = "market_data"
    PRICE_UPDATE = "price_update"
    ORDERBOOK_UPDATE = "orderbook_update"
    TRADE_UPDATE = "trade_update"

    # 트레이딩 이벤트
    SIGNAL_GENERATED = "signal_generated"
    ORDER_SUBMITTED = "order_submitted"
    ORDER_FILLED = "order_filled"
    ORDER_CANCELLED = "order_cancelled"
    ORDER_REJECTED = "order_rejected"

    # 포지션 이벤트
    POSITION_OPENED = "position_opened"
    POSITION_CLOSED = "position_closed"
    POSITION_UPDATED = "position_updated"

    # 리스크 이벤트
    RISK_LIMIT_TRIGGERED = "risk_limit_triggered"
    STOP_LOSS_TRIGGERED = "stop_loss_triggered"
    TAKE_PROFIT_TRIGGERED = "take_profit_triggered"

    # 시스템 이벤트
    SYSTEM_START = "system_start"
    SYSTEM_STOP = "system_stop"
    SYSTEM_ERROR = "system_error"
    CONNECTION_LOST = "connection_lost"
    CONNECTION_RESTORED = "connection_restored"

    # 전략 이벤트
    STRATEGY_START = "strategy_start"
    STRATEGY_STOP = "strategy_stop"
    STRATEGY_ERROR = "strategy_error"


@dataclass
class Event:
    """기본 이벤트 클래스"""
    event_type: EventType
    timestamp: datetime = field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = field(default_factory=dict)
    source: Optional[str] = None

    def __str__(self):
        return f"Event({self.event_type.value}, {self.timestamp}, source={self.source})"


class EventHandler:
    """이벤트 핸들러 - 이벤트 발행/구독 패턴 구현"""

    def __init__(self, name: str = "EventHandler"):
        self.name = name
        self.logger = get_logger(self.__class__.__name__)

        # 이벤트 타입별 핸들러 저장
        self._handlers: Dict[EventType, List[Callable]] = defaultdict(list)

        # 비동기 핸들러 저장
        self._async_handlers: Dict[EventType, List[Callable]] = defaultdict(list)

        # 이벤트 큐
        self._event_queue: asyncio.Queue = None

        # 이벤트 히스토리 (최근 100개 저장)
        self._event_history: List[Event] = []
        self._history_limit = 100

        # 통계
        self._event_counts: Dict[EventType, int] = defaultdict(int)

        # 실행 중 플래그
        self._running = False

        self.logger.info(f"{self.name} 이벤트 핸들러 초기화 완료")

    def subscribe(self, event_type: EventType, handler: Callable):
        """
        이벤트 구독

        Args:
            event_type: 구독할 이벤트 타입
            handler: 이벤트 처리 함수
        """
        if asyncio.iscoroutinefunction(handler):
            self._async_handlers[event_type].append(handler)
            self.logger.debug(f"비동기 핸들러 등록: {event_type.value} -> {handler.__name__}")
        else:
            self._handlers[event_type].append(handler)
            self.logger.debug(f"동기 핸들러 등록: {event_type.value} -> {handler.__name__}")

    def unsubscribe(self, event_type: EventType, handler: Callable):
        """
        이벤트 구독 해제

        Args:
            event_type: 구독 해제할 이벤트 타입
            handler: 제거할 핸들러
        """
        if handler in self._handlers[event_type]:
            self._handlers[event_type].remove(handler)
            self.logger.debug(f"핸들러 제거: {event_type.value} -> {handler.__name__}")

        if handler in self._async_handlers[event_type]:
            self._async_handlers[event_type].remove(handler)
            self.logger.debug(f"비동기 핸들러 제거: {event_type.value} -> {handler.__name__}")

    def publish(self, event: Event):
        """
        이벤트 발행 (동기)

        Args:
            event: 발행할 이벤트
        """
        # 히스토리에 추가
        self._add_to_history(event)

        # 통계 업데이트
        self._event_counts[event.event_type] += 1

        # 동기 핸들러 실행
        for handler in self._handlers[event.event_type]:
            try:
                handler(event)
            except Exception as e:
                self.logger.error(
                    f"이벤트 핸들러 에러 ({handler.__name__}): {str(e)}",
                    exc_info=True
                )

        # 비동기 큐에 추가 (비동기 루프가 실행 중인 경우)
        if self._event_queue and self._running:
            try:
                self._event_queue.put_nowait(event)
            except asyncio.QueueFull:
                self.logger.warning(f"이벤트 큐 가득참: {event.event_type.value}")

    async def publish_async(self, event: Event):
        """
        이벤트 발행 (비동기)

        Args:
            event: 발행할 이벤트
        """
        # 히스토리에 추가
        self._add_to_history(event)

        # 통계 업데이트
        self._event_counts[event.event_type] += 1

        # 동기 핸들러 실행
        for handler in self._handlers[event.event_type]:
            try:
                handler(event)
            except Exception as e:
                self.logger.error(
                    f"이벤트 핸들러 에러 ({handler.__name__}): {str(e)}",
                    exc_info=True
                )

        # 비동기 핸들러 실행
        tasks = []
        for handler in self._async_handlers[event.event_type]:
            tasks.append(self._run_async_handler(handler, event))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _run_async_handler(self, handler: Callable, event: Event):
        """비동기 핸들러 실행"""
        try:
            await handler(event)
        except Exception as e:
            self.logger.error(
                f"비동기 이벤트 핸들러 에러 ({handler.__name__}): {str(e)}",
                exc_info=True
            )

    async def start(self, queue_size: int = 1000):
        """
        비동기 이벤트 처리 시작

        Args:
            queue_size: 이벤트 큐 크기
        """
        if self._running:
            self.logger.warning("이벤트 핸들러가 이미 실행 중입니다")
            return

        self._event_queue = asyncio.Queue(maxsize=queue_size)
        self._running = True

        self.logger.info("비동기 이벤트 처리 시작")

        # 시스템 시작 이벤트 발행
        await self.publish_async(Event(
            event_type=EventType.SYSTEM_START,
            source=self.name
        ))

        # 이벤트 처리 루프 시작
        asyncio.create_task(self._process_events())

    async def stop(self):
        """비동기 이벤트 처리 중지"""
        if not self._running:
            return

        self._running = False

        # 시스템 중지 이벤트 발행
        await self.publish_async(Event(
            event_type=EventType.SYSTEM_STOP,
            source=self.name
        ))

        # 남은 이벤트 처리
        if self._event_queue:
            while not self._event_queue.empty():
                try:
                    event = self._event_queue.get_nowait()
                    await self.publish_async(event)
                except asyncio.QueueEmpty:
                    break

        self.logger.info("비동기 이벤트 처리 중지")

    async def _process_events(self):
        """이벤트 큐 처리 루프"""
        while self._running:
            try:
                # 이벤트 대기 (타임아웃 1초)
                event = await asyncio.wait_for(
                    self._event_queue.get(),
                    timeout=1.0
                )

                # 비동기 핸들러 실행
                tasks = []
                for handler in self._async_handlers[event.event_type]:
                    tasks.append(self._run_async_handler(handler, event))

                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)

            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.logger.error(f"이벤트 처리 루프 에러: {str(e)}", exc_info=True)

    def _add_to_history(self, event: Event):
        """이벤트를 히스토리에 추가"""
        self._event_history.append(event)

        # 히스토리 크기 제한
        if len(self._event_history) > self._history_limit:
            self._event_history = self._event_history[-self._history_limit:]

    def get_event_history(
        self,
        event_type: Optional[EventType] = None,
        limit: int = 10
    ) -> List[Event]:
        """
        이벤트 히스토리 조회

        Args:
            event_type: 필터링할 이벤트 타입 (None이면 전체)
            limit: 반환할 최대 개수
        """
        history = self._event_history

        if event_type:
            history = [e for e in history if e.event_type == event_type]

        return history[-limit:]

    def get_statistics(self) -> Dict[str, Any]:
        """이벤트 통계 반환"""
        return {
            "total_events": sum(self._event_counts.values()),
            "event_counts": dict(self._event_counts),
            "handlers_count": {
                et.value: len(self._handlers[et]) + len(self._async_handlers[et])
                for et in EventType
            },
            "history_size": len(self._event_history),
            "running": self._running
        }

    def clear_history(self):
        """이벤트 히스토리 초기화"""
        self._event_history.clear()
        self.logger.info("이벤트 히스토리 초기화 완료")

    def reset_statistics(self):
        """통계 초기화"""
        self._event_counts.clear()
        self.logger.info("이벤트 통계 초기화 완료")
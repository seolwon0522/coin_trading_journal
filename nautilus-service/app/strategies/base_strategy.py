"""
Base Strategy using Nautilus Actor Pattern
Nautilus Best Practice에 따른 전략 베이스 클래스
"""

from decimal import Decimal
from typing import Optional, Dict, Any
import pandas as pd

from nautilus_trader.common.actor import Actor
from nautilus_trader.core.data import Data
from nautilus_trader.core.message import Event
from nautilus_trader.model.data import Bar
from nautilus_trader.model.data import OrderBookDeltas
from nautilus_trader.model.data import QuoteTick
from nautilus_trader.model.data import TradeTick
from nautilus_trader.model.enums import OrderSide
from nautilus_trader.model.enums import OrderType
from nautilus_trader.model.enums import TimeInForce
from nautilus_trader.model.events import OrderFilled
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.identifiers import StrategyId
from nautilus_trader.model.instruments import Instrument
from nautilus_trader.model.objects import Price
from nautilus_trader.model.objects import Quantity
from nautilus_trader.model.orders import LimitOrder
from nautilus_trader.model.orders import MarketOrder
from nautilus_trader.model.orders import Order
from nautilus_trader.trading.strategy import Strategy


class BaseStrategy(Strategy):
    """
    Nautilus Best Practice 전략 베이스 클래스
    모든 전략은 이 클래스를 상속받아 구현
    """

    def __init__(
        self,
        strategy_id: str,
        config: Dict[str, Any]
    ):
        """
        전략 초기화

        Parameters:
            strategy_id: 전략 고유 ID
            config: 전략 설정
        """
        super().__init__(StrategyId(strategy_id))

        # 설정 저장
        self.config = config
        self.instrument_id = InstrumentId.from_str(config.get("symbol", "BTCUSDT.BINANCE"))

        # 상태 관리
        self.is_running = False
        self._position_size = Decimal(str(config.get("position_size", "0.001")))
        self._max_positions = config.get("max_positions", 1)

    def on_start(self):
        """
        전략 시작 시 호출
        """
        self.log.info(f"Strategy {self.id} starting...")

        # 데이터 구독
        self.subscribe_quote_ticks(self.instrument_id)
        self.subscribe_trade_ticks(self.instrument_id)

        # 초기 상태 설정
        self.is_running = True

        self.log.info(f"Strategy {self.id} started successfully")

    def on_stop(self):
        """
        전략 중지 시 호출
        """
        self.log.info(f"Strategy {self.id} stopping...")

        # 모든 열린 주문 취소
        self._cancel_all_orders()

        # 데이터 구독 해제
        self.unsubscribe_quote_ticks(self.instrument_id)
        self.unsubscribe_trade_ticks(self.instrument_id)

        self.is_running = False

        self.log.info(f"Strategy {self.id} stopped successfully")

    def on_quote_tick(self, tick: QuoteTick):
        """
        Quote tick 수신 시 호출

        Parameters:
            tick: Quote tick 데이터
        """
        if not self.is_running:
            return

        # 서브클래스에서 구현
        self._process_quote_tick(tick)

    def on_trade_tick(self, tick: TradeTick):
        """
        Trade tick 수신 시 호출

        Parameters:
            tick: Trade tick 데이터
        """
        if not self.is_running:
            return

        # 서브클래스에서 구현
        self._process_trade_tick(tick)

    def on_bar(self, bar: Bar):
        """
        Bar 데이터 수신 시 호출

        Parameters:
            bar: Bar 데이터
        """
        if not self.is_running:
            return

        # 서브클래스에서 구현
        self._process_bar(bar)

    def on_order_filled(self, event: OrderFilled):
        """
        주문 체결 시 호출

        Parameters:
            event: 주문 체결 이벤트
        """
        self.log.info(
            f"Order filled: {event.order_id}, "
            f"side={event.order_side}, "
            f"price={event.last_px}, "
            f"qty={event.last_qty}"
        )

        # 서브클래스에서 구현
        self._on_order_filled(event)

    def _process_quote_tick(self, tick: QuoteTick):
        """
        Quote tick 처리 (서브클래스에서 구현)
        """
        pass

    def _process_trade_tick(self, tick: TradeTick):
        """
        Trade tick 처리 (서브클래스에서 구현)
        """
        pass

    def _process_bar(self, bar: Bar):
        """
        Bar 데이터 처리 (서브클래스에서 구현)
        """
        pass

    def _on_order_filled(self, event: OrderFilled):
        """
        주문 체결 처리 (서브클래스에서 구현)
        """
        pass

    # === 헬퍼 메서드 ===

    def submit_market_order(
        self,
        side: OrderSide,
        quantity: Optional[Decimal] = None
    ) -> MarketOrder:
        """
        시장가 주문 제출

        Parameters:
            side: 주문 방향
            quantity: 수량 (기본값: position_size)

        Returns:
            생성된 주문
        """
        qty = quantity or self._position_size

        order = self.order_factory.market(
            instrument_id=self.instrument_id,
            order_side=side,
            quantity=Quantity.from_str(str(qty)),
        )

        self.submit_order(order)
        return order

    def submit_limit_order(
        self,
        side: OrderSide,
        price: Decimal,
        quantity: Optional[Decimal] = None,
        post_only: bool = True
    ) -> LimitOrder:
        """
        지정가 주문 제출

        Parameters:
            side: 주문 방향
            price: 가격
            quantity: 수량 (기본값: position_size)
            post_only: Post-only 주문 여부

        Returns:
            생성된 주문
        """
        qty = quantity or self._position_size

        order = self.order_factory.limit(
            instrument_id=self.instrument_id,
            order_side=side,
            quantity=Quantity.from_str(str(qty)),
            price=Price.from_str(str(price)),
            time_in_force=TimeInForce.GTC,
            post_only=post_only,
        )

        self.submit_order(order)
        return order

    def _cancel_all_orders(self):
        """
        모든 열린 주문 취소
        """
        for order in self.cache.orders_open(strategy_id=self.id):
            self.cancel_order(order)

    def get_position_count(self) -> int:
        """
        현재 열린 포지션 수 반환
        """
        return len(self.cache.positions_open(strategy_id=self.id))

    def get_total_pnl(self) -> Decimal:
        """
        전체 PnL 반환
        """
        positions = self.cache.positions(strategy_id=self.id)
        total_pnl = Decimal("0")

        for position in positions:
            if position.realized_pnl:
                total_pnl += Decimal(str(position.realized_pnl))
            if position.unrealized_pnl:
                total_pnl += Decimal(str(position.unrealized_pnl))

        return total_pnl

    def get_performance_stats(self) -> Dict[str, Any]:
        """
        전략 성과 통계 반환
        """
        return self.portfolio.analyzer.get_performance_stats_pnls(
            strategy_id=self.id
        )
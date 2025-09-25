"""
Grid Trading Strategy Implementation
Nautilus Actor Pattern을 활용한 그리드 트레이딩 전략
"""

from decimal import Decimal
from typing import Dict, List, Optional, Any
import numpy as np

from nautilus_trader.model.data import QuoteTick, TradeTick, Bar
from nautilus_trader.model.enums import OrderSide
from nautilus_trader.model.events import OrderFilled
from nautilus_trader.model.objects import Price, Quantity
from nautilus_trader.model.orders import LimitOrder

from app.strategies.base_strategy import BaseStrategy


class GridTradingStrategy(BaseStrategy):
    """
    그리드 트레이딩 전략
    지정된 가격 범위 내에서 일정 간격으로 매수/매도 주문을 배치
    """

    def __init__(self, strategy_id: str, config: Dict[str, Any]):
        """
        전략 초기화

        Parameters:
            strategy_id: 전략 ID
            config: 전략 설정
                - upper_price: 그리드 상한가
                - lower_price: 그리드 하한가
                - grid_levels: 그리드 레벨 수
                - position_size: 각 그리드 주문 크기
                - max_positions: 최대 포지션 수
        """
        super().__init__(strategy_id, config)

        # 그리드 설정
        self.upper_price = Decimal(str(config["upper_price"]))
        self.lower_price = Decimal(str(config["lower_price"]))
        self.grid_levels = config["grid_levels"]

        # 그리드 가격 계산
        self.grid_prices = self._calculate_grid_prices()
        self.grid_orders: Dict[Decimal, LimitOrder] = {}

        # 현재 가격 추적
        self.current_price: Optional[Decimal] = None
        self.last_filled_price: Optional[Decimal] = None

    def on_start(self):
        """
        전략 시작
        """
        super().on_start()

        self.log.info(
            f"Grid Trading Strategy started: "
            f"Range [{self.lower_price} - {self.upper_price}], "
            f"Levels: {self.grid_levels}"
        )

        # 초기 그리드 설정은 첫 가격 수신 후 진행

    def on_stop(self):
        """
        전략 중지
        """
        # 모든 그리드 주문 취소
        self._cancel_all_grid_orders()

        super().on_stop()

    def _process_quote_tick(self, tick: QuoteTick):
        """
        Quote tick 처리
        """
        # 현재 가격 업데이트
        mid_price = (float(tick.bid_price) + float(tick.ask_price)) / 2
        self.current_price = Decimal(str(mid_price))

        # 첫 가격 수신 시 그리드 설정
        if not self.grid_orders and self.is_running:
            self._setup_initial_grid()

        # 그리드 주문 업데이트
        self._update_grid_orders()

    def _setup_initial_grid(self):
        """
        초기 그리드 설정
        """
        if not self.current_price:
            return

        self.log.info(f"Setting up initial grid at price {self.current_price}")

        for grid_price in self.grid_prices:
            if grid_price < self.current_price:
                # 현재 가격보다 낮은 레벨에 매수 주문
                self._place_grid_order(OrderSide.BUY, grid_price)
            elif grid_price > self.current_price:
                # 현재 가격보다 높은 레벨에 매도 주문
                self._place_grid_order(OrderSide.SELL, grid_price)

        self.log.info(f"Initial grid setup complete with {len(self.grid_orders)} orders")

    def _update_grid_orders(self):
        """
        그리드 주문 업데이트
        체결된 주문의 반대 주문 생성
        """
        # 체결된 주문 확인 및 재배치는 on_order_filled에서 처리
        pass

    def _on_order_filled(self, event: OrderFilled):
        """
        주문 체결 처리
        """
        filled_price = Decimal(str(event.last_px))
        filled_side = event.order_side

        self.log.info(
            f"Grid order filled: {filled_side.name} @ {filled_price}"
        )

        # 체결된 그리드 주문 제거
        if filled_price in self.grid_orders:
            del self.grid_orders[filled_price]

        # 반대 방향 주문 생성
        if filled_side == OrderSide.BUY:
            # 매수 체결 -> 상위 레벨에 매도 주문
            next_sell_price = self._get_next_grid_price(filled_price, direction="up")
            if next_sell_price and next_sell_price not in self.grid_orders:
                self._place_grid_order(OrderSide.SELL, next_sell_price)

        elif filled_side == OrderSide.SELL:
            # 매도 체결 -> 하위 레벨에 매수 주문
            next_buy_price = self._get_next_grid_price(filled_price, direction="down")
            if next_buy_price and next_buy_price not in self.grid_orders:
                self._place_grid_order(OrderSide.BUY, next_buy_price)

        self.last_filled_price = filled_price

        # 성과 로깅
        total_pnl = self.get_total_pnl()
        self.log.info(f"Current total PnL: {total_pnl}")

    def _place_grid_order(
        self,
        side: OrderSide,
        price: Decimal
    ) -> Optional[LimitOrder]:
        """
        그리드 주문 생성 및 제출

        Parameters:
            side: 주문 방향
            price: 주문 가격

        Returns:
            생성된 주문 또는 None
        """
        try:
            order = self.submit_limit_order(
                side=side,
                price=price,
                quantity=self._position_size,
                post_only=True
            )

            self.grid_orders[price] = order

            self.log.debug(
                f"Grid order placed: {side.name} "
                f"{self._position_size} @ {price}"
            )

            return order

        except Exception as e:
            self.log.error(f"Failed to place grid order: {e}")
            return None

    def _cancel_all_grid_orders(self):
        """
        모든 그리드 주문 취소
        """
        for price, order in list(self.grid_orders.items()):
            try:
                self.cancel_order(order)
                del self.grid_orders[price]
            except Exception as e:
                self.log.error(f"Failed to cancel grid order: {e}")

        self.log.info("All grid orders cancelled")

    def _calculate_grid_prices(self) -> List[Decimal]:
        """
        그리드 가격 레벨 계산

        Returns:
            그리드 가격 리스트
        """
        price_range = self.upper_price - self.lower_price
        grid_spacing = price_range / (self.grid_levels - 1)

        prices = []
        for i in range(self.grid_levels):
            price = self.lower_price + (grid_spacing * i)
            # 가격 정밀도 조정 (Binance는 보통 소수점 2자리)
            price = Decimal(str(round(float(price), 2)))
            prices.append(price)

        return prices

    def _get_next_grid_price(
        self,
        current_price: Decimal,
        direction: str
    ) -> Optional[Decimal]:
        """
        다음 그리드 가격 찾기

        Parameters:
            current_price: 현재 가격
            direction: "up" 또는 "down"

        Returns:
            다음 그리드 가격 또는 None
        """
        if direction == "up":
            higher_prices = [p for p in self.grid_prices if p > current_price]
            return min(higher_prices) if higher_prices else None
        else:  # direction == "down"
            lower_prices = [p for p in self.grid_prices if p < current_price]
            return max(lower_prices) if lower_prices else None

    def get_grid_status(self) -> Dict[str, Any]:
        """
        그리드 상태 반환

        Returns:
            그리드 상태 정보
        """
        buy_orders = sum(
            1 for order in self.grid_orders.values()
            if order.side == OrderSide.BUY
        )
        sell_orders = sum(
            1 for order in self.grid_orders.values()
            if order.side == OrderSide.SELL
        )

        return {
            "strategy_id": str(self.id),
            "upper_price": float(self.upper_price),
            "lower_price": float(self.lower_price),
            "grid_levels": self.grid_levels,
            "current_price": float(self.current_price) if self.current_price else None,
            "active_orders": len(self.grid_orders),
            "buy_orders": buy_orders,
            "sell_orders": sell_orders,
            "last_filled_price": float(self.last_filled_price) if self.last_filled_price else None,
            "total_pnl": float(self.get_total_pnl()),
            "position_count": self.get_position_count(),
        }
"""
바이낸스 데이터 타입 정의
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional
from enum import Enum


class TimeInForce(Enum):
    """주문 유효 시간"""
    GTC = "GTC"  # Good Till Cancel
    IOC = "IOC"  # Immediate or Cancel
    FOK = "FOK"  # Fill or Kill
    GTX = "GTX"  # Good Till Crossing


class OrderSide(Enum):
    """주문 방향"""
    BUY = "BUY"
    SELL = "SELL"


class OrderType(Enum):
    """주문 타입"""
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP_LOSS = "STOP_LOSS"
    STOP_LOSS_LIMIT = "STOP_LOSS_LIMIT"
    TAKE_PROFIT = "TAKE_PROFIT"
    TAKE_PROFIT_LIMIT = "TAKE_PROFIT_LIMIT"
    LIMIT_MAKER = "LIMIT_MAKER"


class OrderStatus(Enum):
    """주문 상태"""
    NEW = "NEW"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELED = "CANCELED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    EXPIRED_IN_MATCH = "EXPIRED_IN_MATCH"


@dataclass
class BinanceSymbolInfo:
    """바이낸스 심볼 정보"""
    symbol: str
    base_asset: str
    quote_asset: str
    status: str
    base_precision: int
    quote_precision: int
    min_qty: Decimal
    max_qty: Decimal
    step_size: Decimal
    min_notional: Decimal
    tick_size: Decimal
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BinanceTicker:
    """바이낸스 티커 데이터"""
    symbol: str
    timestamp: datetime
    bid_price: Decimal
    bid_qty: Decimal
    ask_price: Decimal
    ask_qty: Decimal
    last_price: Decimal
    volume: Decimal
    quote_volume: Decimal
    open_price: Decimal
    high_price: Decimal
    low_price: Decimal
    close_price: Decimal
    change: Decimal
    change_percent: Decimal
    count: int  # 거래 건수


@dataclass
class BinanceBar:
    """바이낸스 캔들스틱 (OHLCV) 데이터"""
    symbol: str
    timestamp: datetime
    interval: str  # 1m, 5m, 1h, 1d 등
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    quote_volume: Decimal
    trades_count: int
    taker_buy_volume: Decimal
    taker_buy_quote_volume: Decimal
    is_closed: bool = True


@dataclass
class BinanceTrade:
    """바이낸스 거래 데이터"""
    trade_id: int
    symbol: str
    timestamp: datetime
    price: Decimal
    quantity: Decimal
    buyer_order_id: int
    seller_order_id: int
    is_buyer_maker: bool
    is_best_match: bool


@dataclass
class BinanceOrderBookLevel:
    """호가창 레벨"""
    price: Decimal
    quantity: Decimal

    def __repr__(self):
        return f"{float(self.price):.2f} x {float(self.quantity):.4f}"


@dataclass
class BinanceOrderBook:
    """바이낸스 호가창 데이터"""
    symbol: str
    timestamp: datetime
    last_update_id: int
    bids: List[BinanceOrderBookLevel]
    asks: List[BinanceOrderBookLevel]

    @property
    def best_bid(self) -> Optional[BinanceOrderBookLevel]:
        """최고 매수 호가"""
        return self.bids[0] if self.bids else None

    @property
    def best_ask(self) -> Optional[BinanceOrderBookLevel]:
        """최저 매도 호가"""
        return self.asks[0] if self.asks else None

    @property
    def spread(self) -> Optional[Decimal]:
        """스프레드"""
        if self.best_bid and self.best_ask:
            return self.best_ask.price - self.best_bid.price
        return None

    @property
    def mid_price(self) -> Optional[Decimal]:
        """중간 가격"""
        if self.best_bid and self.best_ask:
            return (self.best_bid.price + self.best_ask.price) / 2
        return None


@dataclass
class BinanceOrder:
    """바이낸스 주문"""
    symbol: str
    order_id: int
    client_order_id: str
    price: Decimal
    orig_qty: Decimal
    executed_qty: Decimal
    cumulative_quote_qty: Decimal
    status: OrderStatus
    time_in_force: TimeInForce
    type: OrderType
    side: OrderSide
    stop_price: Optional[Decimal]
    iceberg_qty: Optional[Decimal]
    time: datetime
    update_time: datetime
    is_working: bool
    orig_quote_order_qty: Optional[Decimal]

    @property
    def avg_price(self) -> Decimal:
        """평균 체결 가격"""
        if self.executed_qty > 0:
            return self.cumulative_quote_qty / self.executed_qty
        return Decimal("0")

    @property
    def filled_percent(self) -> Decimal:
        """체결 비율"""
        if self.orig_qty > 0:
            return (self.executed_qty / self.orig_qty) * 100
        return Decimal("0")

    @property
    def remaining_qty(self) -> Decimal:
        """미체결 수량"""
        return self.orig_qty - self.executed_qty


@dataclass
class BinanceBalance:
    """바이낸스 잔고"""
    asset: str
    free: Decimal  # 사용 가능
    locked: Decimal  # 주문 중

    @property
    def total(self) -> Decimal:
        """총 잔고"""
        return self.free + self.locked


@dataclass
class BinanceAccount:
    """바이낸스 계좌 정보"""
    maker_commission: int  # 메이커 수수료 (basis points)
    taker_commission: int  # 테이커 수수료 (basis points)
    buyer_commission: int
    seller_commission: int
    can_trade: bool
    can_withdraw: bool
    can_deposit: bool
    brokered: bool
    require_self_trade_prevention: bool
    prevent_sor: bool
    update_time: datetime
    account_type: str
    balances: List[BinanceBalance]
    permissions: List[str]
    uid: int

    def get_balance(self, asset: str) -> Optional[BinanceBalance]:
        """특정 자산의 잔고 조회"""
        for balance in self.balances:
            if balance.asset == asset:
                return balance
        return None


@dataclass
class BinancePosition:
    """바이낸스 포지션 (선물용)"""
    symbol: str
    position_side: str  # BOTH, LONG, SHORT
    position_amt: Decimal
    unrealized_profit: Decimal
    margin_type: str  # isolated, cross
    isolated_wallet: Decimal
    mark_price: Decimal
    entry_price: Decimal
    max_notional: Decimal
    position_risk: Decimal
    liquidation_price: Optional[Decimal]
    leverage: int

    @property
    def pnl_percent(self) -> Decimal:
        """손익률"""
        if self.entry_price > 0:
            return ((self.mark_price - self.entry_price) / self.entry_price) * 100
        return Decimal("0")

    @property
    def is_long(self) -> bool:
        """롱 포지션 여부"""
        return self.position_amt > 0

    @property
    def is_short(self) -> bool:
        """숏 포지션 여부"""
        return self.position_amt < 0


@dataclass
class BinanceWebSocketMessage:
    """웹소켓 메시지 기본 클래스"""
    event_type: str
    event_time: datetime
    symbol: str
    data: Dict[str, Any]


@dataclass
class BinanceKlineMessage(BinanceWebSocketMessage):
    """캔들스틱 웹소켓 메시지"""
    kline: BinanceBar

    @classmethod
    def from_dict(cls, data: dict) -> "BinanceKlineMessage":
        """딕셔너리로부터 생성"""
        kline_data = data["k"]
        return cls(
            event_type="kline",
            event_time=datetime.fromtimestamp(data["E"] / 1000),
            symbol=data["s"],
            data=data,
            kline=BinanceBar(
                symbol=data["s"],
                timestamp=datetime.fromtimestamp(kline_data["t"] / 1000),
                interval=kline_data["i"],
                open=Decimal(kline_data["o"]),
                high=Decimal(kline_data["h"]),
                low=Decimal(kline_data["l"]),
                close=Decimal(kline_data["c"]),
                volume=Decimal(kline_data["v"]),
                quote_volume=Decimal(kline_data["q"]),
                trades_count=kline_data["n"],
                taker_buy_volume=Decimal(kline_data["V"]),
                taker_buy_quote_volume=Decimal(kline_data["Q"]),
                is_closed=kline_data["x"]
            )
        )


@dataclass
class BinanceTradeMessage(BinanceWebSocketMessage):
    """거래 웹소켓 메시지"""
    trade: BinanceTrade

    @classmethod
    def from_dict(cls, data: dict) -> "BinanceTradeMessage":
        """딕셔너리로부터 생성"""
        return cls(
            event_type="trade",
            event_time=datetime.fromtimestamp(data["E"] / 1000),
            symbol=data["s"],
            data=data,
            trade=BinanceTrade(
                trade_id=data["t"],
                symbol=data["s"],
                timestamp=datetime.fromtimestamp(data["T"] / 1000),
                price=Decimal(data["p"]),
                quantity=Decimal(data["q"]),
                buyer_order_id=data["b"],
                seller_order_id=data["a"],
                is_buyer_maker=data["m"],
                is_best_match=data.get("M", True)
            )
        )
"""
바이낸스 어댑터 - 데이터 및 실행
"""
import asyncio
import json
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from decimal import Decimal
import aiohttp
import hmac
import hashlib
import time
from urllib.parse import urlencode

from core.logger import get_logger
from core.event_handler import EventHandler, Event, EventType
from config.config import TradingConfig
from .data_types import (
    BinanceTicker, BinanceBar, BinanceTrade, BinanceOrderBook,
    BinanceOrder, BinanceBalance, BinanceAccount, BinanceSymbolInfo,
    OrderType, OrderSide, OrderStatus, TimeInForce,
    BinanceKlineMessage, BinanceTradeMessage, BinanceOrderBookLevel
)


class BinanceDataAdapter:
    """바이낸스 데이터 어댑터 - 시장 데이터 수집 및 웹소켓 스트리밍"""

    def __init__(
        self,
        config: TradingConfig,
        event_handler: EventHandler,
        adapter_id: str = "BINANCE_DATA"
    ):
        """
        데이터 어댑터 초기화

        Args:
            config: 트레이딩 설정
            event_handler: 이벤트 핸들러
            adapter_id: 어댑터 식별자
        """
        self.adapter_id = adapter_id
        self.config = config
        self.event_handler = event_handler
        self.logger = get_logger(self.__class__.__name__)

        # API 설정
        creds = config.get_api_credentials()
        self.api_key = creds["api_key"]
        self.api_secret = creds["api_secret"]
        self.testnet = creds["testnet"]

        # Base URLs
        if self.testnet:
            self.rest_url = "https://testnet.binance.vision/api/v3"
            self.ws_url = "wss://testnet.binance.vision/ws"
            # 테스트넷은 stream endpoint 대신 ws endpoint 사용
            self.stream_url = "wss://testnet.binance.vision/ws"
        else:
            self.rest_url = "https://api.binance.com/api/v3"
            self.ws_url = "wss://stream.binance.com:9443/ws"
            self.stream_url = "wss://stream.binance.com:9443/stream"

        # 웹소켓 연결
        self.ws_connections: Dict[str, aiohttp.ClientWebSocketResponse] = {}
        self.ws_handlers: Dict[str, List[Callable]] = {}

        # 세션
        self.session: Optional[aiohttp.ClientSession] = None

        # 심볼 정보 캐시
        self.symbol_info: Dict[str, BinanceSymbolInfo] = {}

        # 실행 상태
        self._running = False

        self.logger.info(f"바이낸스 데이터 어댑터 초기화: {adapter_id}")

    async def start(self):
        """어댑터 시작"""
        if self._running:
            self.logger.warning("데이터 어댑터가 이미 실행 중입니다")
            return

        self._running = True

        # HTTP 세션 생성
        self.session = aiohttp.ClientSession()

        # 서버 시간 동기화
        await self._sync_server_time()

        # 교환 정보 로드
        await self._load_exchange_info()

        self.logger.info("바이낸스 데이터 어댑터 시작")

    async def stop(self):
        """어댑터 중지"""
        if not self._running:
            return

        self._running = False

        # 모든 웹소켓 연결 종료
        for ws_id, ws in self.ws_connections.items():
            await ws.close()

        self.ws_connections.clear()

        # HTTP 세션 종료
        if self.session:
            await self.session.close()

        self.logger.info("바이낸스 데이터 어댑터 중지")

    async def _sync_server_time(self):
        """서버 시간 동기화"""
        try:
            response = await self._request("GET", "/time")
            server_time = response["serverTime"]
            local_time = int(time.time() * 1000)
            self.time_offset = server_time - local_time

            self.logger.info(f"서버 시간 동기화 완료: offset={self.time_offset}ms")

        except Exception as e:
            self.logger.error(f"서버 시간 동기화 실패: {e}")
            self.time_offset = 0

    async def _load_exchange_info(self):
        """거래소 정보 로드"""
        try:
            response = await self._request("GET", "/exchangeInfo")

            for symbol_data in response["symbols"]:
                if symbol_data["status"] != "TRADING":
                    continue

                symbol = symbol_data["symbol"]

                # 필터 파싱
                filters = {f["filterType"]: f for f in symbol_data["filters"]}

                # LOT_SIZE 필터
                lot_size = filters.get("LOT_SIZE", {})
                min_qty = Decimal(lot_size.get("minQty", "0"))
                max_qty = Decimal(lot_size.get("maxQty", "0"))
                step_size = Decimal(lot_size.get("stepSize", "0"))

                # PRICE_FILTER
                price_filter = filters.get("PRICE_FILTER", {})
                tick_size = Decimal(price_filter.get("tickSize", "0"))

                # MIN_NOTIONAL
                min_notional = filters.get("MIN_NOTIONAL", {})
                min_notional_value = Decimal(min_notional.get("minNotional", "0"))

                self.symbol_info[symbol] = BinanceSymbolInfo(
                    symbol=symbol,
                    base_asset=symbol_data["baseAsset"],
                    quote_asset=symbol_data["quoteAsset"],
                    status=symbol_data["status"],
                    base_precision=symbol_data["baseAssetPrecision"],
                    quote_precision=symbol_data["quoteAssetPrecision"],
                    min_qty=min_qty,
                    max_qty=max_qty,
                    step_size=step_size,
                    min_notional=min_notional_value,
                    tick_size=tick_size,
                    metadata=symbol_data
                )

            self.logger.info(f"거래소 정보 로드 완료: {len(self.symbol_info)}개 심볼")

        except Exception as e:
            self.logger.error(f"거래소 정보 로드 실패: {e}")

    async def _request(self, method: str, endpoint: str, params: Dict = None, signed: bool = False) -> Dict:
        """REST API 요청"""
        if not self.session:
            raise RuntimeError("세션이 초기화되지 않았습니다")

        url = self.rest_url + endpoint

        if signed:
            # 서명이 필요한 요청
            params = params or {}
            params["timestamp"] = int(time.time() * 1000) + self.time_offset
            query = urlencode(params)
            signature = hmac.new(
                self.api_secret.encode(),
                query.encode(),
                hashlib.sha256
            ).hexdigest()
            params["signature"] = signature

        headers = {"X-MBX-APIKEY": self.api_key} if signed or self.api_key else {}

        async with self.session.request(method, url, params=params, headers=headers) as response:
            data = await response.json()

            if response.status != 200:
                raise Exception(f"API 오류: {data}")

            return data

    async def get_ticker(self, symbol: str) -> BinanceTicker:
        """24시간 티커 정보 조회"""
        try:
            data = await self._request("GET", "/ticker/24hr", {"symbol": symbol})

            ticker = BinanceTicker(
                symbol=symbol,
                timestamp=datetime.now(),
                bid_price=Decimal(data["bidPrice"]),
                bid_qty=Decimal(data["bidQty"]),
                ask_price=Decimal(data["askPrice"]),
                ask_qty=Decimal(data["askQty"]),
                last_price=Decimal(data["lastPrice"]),
                volume=Decimal(data["volume"]),
                quote_volume=Decimal(data["quoteVolume"]),
                open_price=Decimal(data["openPrice"]),
                high_price=Decimal(data["highPrice"]),
                low_price=Decimal(data["lowPrice"]),
                close_price=Decimal(data["prevClosePrice"]),
                change=Decimal(data["priceChange"]),
                change_percent=Decimal(data["priceChangePercent"]),
                count=int(data["count"])
            )

            # 이벤트 발행
            self._publish_ticker_event(ticker)

            return ticker

        except Exception as e:
            self.logger.error(f"티커 조회 실패 [{symbol}]: {e}")
            raise

    async def get_klines(
        self,
        symbol: str,
        interval: str = "1m",
        limit: int = 100,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[BinanceBar]:
        """캔들스틱 데이터 조회"""
        try:
            params = {
                "symbol": symbol,
                "interval": interval,
                "limit": limit
            }

            if start_time:
                params["startTime"] = int(start_time.timestamp() * 1000)
            if end_time:
                params["endTime"] = int(end_time.timestamp() * 1000)

            data = await self._request("GET", "/klines", params)

            bars = []
            for kline in data:
                bar = BinanceBar(
                    symbol=symbol,
                    timestamp=datetime.fromtimestamp(kline[0] / 1000),
                    interval=interval,
                    open=Decimal(kline[1]),
                    high=Decimal(kline[2]),
                    low=Decimal(kline[3]),
                    close=Decimal(kline[4]),
                    volume=Decimal(kline[5]),
                    quote_volume=Decimal(kline[7]),
                    trades_count=kline[8],
                    taker_buy_volume=Decimal(kline[9]),
                    taker_buy_quote_volume=Decimal(kline[10]),
                    is_closed=True
                )
                bars.append(bar)

            self.logger.debug(f"캔들스틱 조회 완료 [{symbol}]: {len(bars)}개")
            return bars

        except Exception as e:
            self.logger.error(f"캔들스틱 조회 실패 [{symbol}]: {e}")
            raise

    async def get_orderbook(self, symbol: str, limit: int = 20) -> BinanceOrderBook:
        """호가창 조회"""
        try:
            params = {"symbol": symbol, "limit": limit}
            data = await self._request("GET", "/depth", params)

            bids = [
                BinanceOrderBookLevel(Decimal(price), Decimal(qty))
                for price, qty in data["bids"]
            ]

            asks = [
                BinanceOrderBookLevel(Decimal(price), Decimal(qty))
                for price, qty in data["asks"]
            ]

            orderbook = BinanceOrderBook(
                symbol=symbol,
                timestamp=datetime.now(),
                last_update_id=data["lastUpdateId"],
                bids=bids,
                asks=asks
            )

            # 이벤트 발행
            self._publish_orderbook_event(orderbook)

            return orderbook

        except Exception as e:
            self.logger.error(f"호가창 조회 실패 [{symbol}]: {e}")
            raise

    async def subscribe_klines(self, symbol: str, interval: str = "1m", handler: Callable = None):
        """캔들스틱 웹소켓 구독"""
        stream = f"{symbol.lower()}@kline_{interval}"
        await self._subscribe_stream(stream, handler, "kline")

    async def subscribe_trades(self, symbol: str, handler: Callable = None):
        """거래 웹소켓 구독"""
        stream = f"{symbol.lower()}@trade"
        await self._subscribe_stream(stream, handler, "trade")

    async def subscribe_ticker(self, symbol: str, handler: Callable = None):
        """티커 웹소켓 구독"""
        stream = f"{symbol.lower()}@ticker"
        await self._subscribe_stream(stream, handler, "ticker")

    async def subscribe_orderbook(self, symbol: str, levels: int = 20, handler: Callable = None):
        """호가창 웹소켓 구독"""
        stream = f"{symbol.lower()}@depth{levels}"
        await self._subscribe_stream(stream, handler, "orderbook")

    async def _subscribe_stream(self, stream: str, handler: Callable, stream_type: str):
        """웹소켓 스트림 구독"""
        try:
            ws_id = f"{stream_type}_{stream}"

            # 이미 연결되어 있으면 핸들러만 추가
            if ws_id in self.ws_connections:
                if handler:
                    self.ws_handlers[ws_id].append(handler)
                return

            # 웹소켓 연결
            # 테스트넷은 stream 파라미터를 지원하지 않음
            if self.testnet:
                url = f"{self.ws_url}/{stream}"
            else:
                url = f"{self.stream_url}?streams={stream}"
            ws = await self.session.ws_connect(url)

            self.ws_connections[ws_id] = ws
            self.ws_handlers[ws_id] = [handler] if handler else []

            self.logger.info(f"웹소켓 스트림 구독: {stream}")

            # 메시지 처리 태스크 시작
            asyncio.create_task(self._handle_ws_messages(ws_id, ws, stream_type))

        except Exception as e:
            self.logger.error(f"웹소켓 구독 실패 [{stream}]: {e}")
            raise

    async def _handle_ws_messages(self, ws_id: str, ws: aiohttp.ClientWebSocketResponse, stream_type: str):
        """웹소켓 메시지 처리"""
        try:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)

                    # 스트림 데이터 파싱
                    if "stream" in data:
                        stream_data = data["data"]
                    else:
                        stream_data = data

                    # 메시지 타입별 처리
                    if stream_type == "kline":
                        message = BinanceKlineMessage.from_dict(stream_data)
                        self._publish_kline_event(message.kline)

                    elif stream_type == "trade":
                        message = BinanceTradeMessage.from_dict(stream_data)
                        self._publish_trade_event(message.trade)

                    # 핸들러 실행
                    for handler in self.ws_handlers.get(ws_id, []):
                        try:
                            await handler(stream_data)
                        except Exception as e:
                            self.logger.error(f"웹소켓 핸들러 오류: {e}")

                elif msg.type == aiohttp.WSMsgType.ERROR:
                    self.logger.error(f"웹소켓 오류: {msg.data}")
                    break

        except Exception as e:
            self.logger.error(f"웹소켓 메시지 처리 오류: {e}")

        finally:
            # 연결 정리
            if ws_id in self.ws_connections:
                del self.ws_connections[ws_id]
            if ws_id in self.ws_handlers:
                del self.ws_handlers[ws_id]

            # 재연결 시도
            if self._running:
                await asyncio.sleep(5)
                self.logger.info(f"웹소켓 재연결 시도: {ws_id}")
                # TODO: 재구독 로직

    def _publish_ticker_event(self, ticker: BinanceTicker):
        """티커 이벤트 발행"""
        self.event_handler.publish(Event(
            event_type=EventType.PRICE_UPDATE,
            source=self.adapter_id,
            data={
                "symbol": ticker.symbol,
                "price": float(ticker.last_price),
                "bid": float(ticker.bid_price),
                "ask": float(ticker.ask_price),
                "volume": float(ticker.volume)
            }
        ))

    def _publish_kline_event(self, bar: BinanceBar):
        """캔들스틱 이벤트 발행"""
        self.event_handler.publish(Event(
            event_type=EventType.MARKET_DATA,
            source=self.adapter_id,
            data={
                "type": "kline",
                "symbol": bar.symbol,
                "interval": bar.interval,
                "open": float(bar.open),
                "high": float(bar.high),
                "low": float(bar.low),
                "close": float(bar.close),
                "volume": float(bar.volume),
                "timestamp": bar.timestamp.isoformat()
            }
        ))

    def _publish_trade_event(self, trade: BinanceTrade):
        """거래 이벤트 발행"""
        self.event_handler.publish(Event(
            event_type=EventType.TRADE_UPDATE,
            source=self.adapter_id,
            data={
                "trade_id": trade.trade_id,
                "symbol": trade.symbol,
                "price": float(trade.price),
                "quantity": float(trade.quantity),
                "is_buyer_maker": trade.is_buyer_maker,
                "timestamp": trade.timestamp.isoformat()
            }
        ))

    def _publish_orderbook_event(self, orderbook: BinanceOrderBook):
        """호가창 이벤트 발행"""
        self.event_handler.publish(Event(
            event_type=EventType.ORDERBOOK_UPDATE,
            source=self.adapter_id,
            data={
                "symbol": orderbook.symbol,
                "best_bid": float(orderbook.best_bid.price) if orderbook.best_bid else None,
                "best_ask": float(orderbook.best_ask.price) if orderbook.best_ask else None,
                "spread": float(orderbook.spread) if orderbook.spread else None,
                "mid_price": float(orderbook.mid_price) if orderbook.mid_price else None,
                "timestamp": orderbook.timestamp.isoformat()
            }
        ))


class BinanceExecutionAdapter:
    """바이낸스 실행 어댑터 - 주문 실행 및 계좌 관리"""

    def __init__(
        self,
        config: TradingConfig,
        event_handler: EventHandler,
        adapter_id: str = "BINANCE_EXEC"
    ):
        """
        실행 어댑터 초기화

        Args:
            config: 트레이딩 설정
            event_handler: 이벤트 핸들러
            adapter_id: 어댑터 식별자
        """
        self.adapter_id = adapter_id
        self.config = config
        self.event_handler = event_handler
        self.logger = get_logger(self.__class__.__name__)

        # API 설정
        creds = config.get_api_credentials()
        self.api_key = creds["api_key"]
        self.api_secret = creds["api_secret"]
        self.testnet = creds["testnet"]

        # Base URLs
        if self.testnet:
            self.rest_url = "https://testnet.binance.vision/api/v3"
            self.ws_url = "wss://testnet.binance.vision/ws"
        else:
            self.rest_url = "https://api.binance.com/api/v3"
            self.ws_url = "wss://stream.binance.com:9443/ws"

        # 세션
        self.session: Optional[aiohttp.ClientSession] = None

        # 주문 캐시
        self.orders: Dict[str, BinanceOrder] = {}

        # 실행 상태
        self._running = False
        self.time_offset = 0

        self.logger.info(f"바이낸스 실행 어댑터 초기화: {adapter_id}")

    async def start(self):
        """어댑터 시작"""
        if self._running:
            self.logger.warning("실행 어댑터가 이미 실행 중입니다")
            return

        self._running = True

        # HTTP 세션 생성
        self.session = aiohttp.ClientSession()

        # 서버 시간 동기화
        await self._sync_server_time()

        # 계좌 정보 확인
        await self.get_account()

        self.logger.info("바이낸스 실행 어댑터 시작")

    async def stop(self):
        """어댑터 중지"""
        if not self._running:
            return

        self._running = False

        # HTTP 세션 종료
        if self.session:
            await self.session.close()

        self.logger.info("바이낸스 실행 어댑터 중지")

    async def _sync_server_time(self):
        """서버 시간 동기화"""
        try:
            response = await self._request("GET", "/time")
            server_time = response["serverTime"]
            local_time = int(time.time() * 1000)
            self.time_offset = server_time - local_time

            self.logger.info(f"서버 시간 동기화 완료: offset={self.time_offset}ms")

        except Exception as e:
            self.logger.error(f"서버 시간 동기화 실패: {e}")
            self.time_offset = 0

    async def _request(self, method: str, endpoint: str, params: Dict = None, signed: bool = False) -> Dict:
        """REST API 요청"""
        if not self.session:
            raise RuntimeError("세션이 초기화되지 않았습니다")

        url = self.rest_url + endpoint

        if signed:
            # 서명이 필요한 요청
            params = params or {}
            params["timestamp"] = int(time.time() * 1000) + self.time_offset
            query = urlencode(params)
            signature = hmac.new(
                self.api_secret.encode(),
                query.encode(),
                hashlib.sha256
            ).hexdigest()
            params["signature"] = signature

        headers = {"X-MBX-APIKEY": self.api_key} if signed or self.api_key else {}

        async with self.session.request(method, url, params=params, headers=headers) as response:
            data = await response.json()

            if response.status != 200:
                raise Exception(f"API 오류: {data}")

            return data

    async def create_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: Decimal,
        price: Optional[Decimal] = None,
        stop_price: Optional[Decimal] = None,
        time_in_force: TimeInForce = TimeInForce.GTC,
        client_order_id: Optional[str] = None
    ) -> BinanceOrder:
        """
        주문 생성

        Args:
            symbol: 거래 심볼
            side: 매수/매도
            order_type: 주문 타입
            quantity: 주문 수량
            price: 지정가 (LIMIT 주문)
            stop_price: 스톱 가격
            time_in_force: 주문 유효 시간
            client_order_id: 클라이언트 주문 ID
        """
        try:
            params = {
                "symbol": symbol,
                "side": side.value,
                "type": order_type.value,
                "quantity": str(quantity)
            }

            # 지정가 주문인 경우
            if order_type in [OrderType.LIMIT, OrderType.LIMIT_MAKER]:
                if not price:
                    raise ValueError("지정가 주문은 가격이 필요합니다")
                params["price"] = str(price)
                params["timeInForce"] = time_in_force.value

            # 스톱 주문인 경우
            if order_type in [OrderType.STOP_LOSS, OrderType.STOP_LOSS_LIMIT]:
                if not stop_price:
                    raise ValueError("스톱 주문은 스톱 가격이 필요합니다")
                params["stopPrice"] = str(stop_price)

            # 클라이언트 주문 ID
            if client_order_id:
                params["newClientOrderId"] = client_order_id

            # API 호출
            data = await self._request("POST", "/order", params, signed=True)

            # 주문 객체 생성
            order = self._parse_order(data)

            # 캐시에 저장
            self.orders[order.client_order_id] = order

            # 이벤트 발행
            self._publish_order_event(order, EventType.ORDER_SUBMITTED)

            self.logger.info(
                f"주문 생성: {symbol} {side.value} {quantity} @ "
                f"{price if price else 'MARKET'}"
            )

            return order

        except Exception as e:
            self.logger.error(f"주문 생성 실패: {e}")
            raise

    async def cancel_order(
        self,
        symbol: str,
        order_id: Optional[int] = None,
        client_order_id: Optional[str] = None
    ) -> BinanceOrder:
        """주문 취소"""
        try:
            params = {"symbol": symbol}

            if order_id:
                params["orderId"] = order_id
            elif client_order_id:
                params["origClientOrderId"] = client_order_id
            else:
                raise ValueError("order_id 또는 client_order_id가 필요합니다")

            data = await self._request("DELETE", "/order", params, signed=True)

            order = self._parse_order(data)

            # 이벤트 발행
            self._publish_order_event(order, EventType.ORDER_CANCELLED)

            self.logger.info(f"주문 취소: {symbol} {order_id or client_order_id}")

            return order

        except Exception as e:
            self.logger.error(f"주문 취소 실패: {e}")
            raise

    async def get_order(
        self,
        symbol: str,
        order_id: Optional[int] = None,
        client_order_id: Optional[str] = None
    ) -> BinanceOrder:
        """주문 조회"""
        try:
            params = {"symbol": symbol}

            if order_id:
                params["orderId"] = order_id
            elif client_order_id:
                params["origClientOrderId"] = client_order_id
            else:
                raise ValueError("order_id 또는 client_order_id가 필요합니다")

            data = await self._request("GET", "/order", params, signed=True)

            return self._parse_order(data)

        except Exception as e:
            self.logger.error(f"주문 조회 실패: {e}")
            raise

    async def get_open_orders(self, symbol: Optional[str] = None) -> List[BinanceOrder]:
        """열린 주문 조회"""
        try:
            params = {}
            if symbol:
                params["symbol"] = symbol

            data = await self._request("GET", "/openOrders", params, signed=True)

            orders = [self._parse_order(order_data) for order_data in data]

            self.logger.debug(f"열린 주문 조회: {len(orders)}개")

            return orders

        except Exception as e:
            self.logger.error(f"열린 주문 조회 실패: {e}")
            raise

    async def get_account(self) -> BinanceAccount:
        """계좌 정보 조회"""
        try:
            data = await self._request("GET", "/account", signed=True)

            balances = []
            for balance_data in data["balances"]:
                free = Decimal(balance_data["free"])
                locked = Decimal(balance_data["locked"])

                # 0이 아닌 잔고만 포함
                if free > 0 or locked > 0:
                    balances.append(BinanceBalance(
                        asset=balance_data["asset"],
                        free=free,
                        locked=locked
                    ))

            account = BinanceAccount(
                maker_commission=data["makerCommission"],
                taker_commission=data["takerCommission"],
                buyer_commission=data["buyerCommission"],
                seller_commission=data["sellerCommission"],
                can_trade=data["canTrade"],
                can_withdraw=data["canWithdraw"],
                can_deposit=data["canDeposit"],
                brokered=data.get("brokered", False),
                require_self_trade_prevention=data.get("requireSelfTradePrevention", False),
                prevent_sor=data.get("preventSor", False),
                update_time=datetime.fromtimestamp(data["updateTime"] / 1000),
                account_type=data["accountType"],
                balances=balances,
                permissions=data["permissions"],
                uid=data.get("uid", 0)
            )

            self.logger.info(f"계좌 정보 조회: {len(balances)}개 자산")

            return account

        except Exception as e:
            self.logger.error(f"계좌 정보 조회 실패: {e}")
            raise

    def _parse_order(self, data: Dict) -> BinanceOrder:
        """주문 데이터 파싱"""
        return BinanceOrder(
            symbol=data["symbol"],
            order_id=data["orderId"],
            client_order_id=data["clientOrderId"],
            price=Decimal(data.get("price", "0")),
            orig_qty=Decimal(data["origQty"]),
            executed_qty=Decimal(data["executedQty"]),
            cumulative_quote_qty=Decimal(data.get("cummulativeQuoteQty", "0")),
            status=OrderStatus(data["status"]),
            time_in_force=TimeInForce(data.get("timeInForce", "GTC")),
            type=OrderType(data["type"]),
            side=OrderSide(data["side"]),
            stop_price=Decimal(data["stopPrice"]) if data.get("stopPrice") else None,
            iceberg_qty=Decimal(data["icebergQty"]) if data.get("icebergQty") else None,
            time=datetime.fromtimestamp(data.get("time", 0) / 1000),
            update_time=datetime.fromtimestamp(data.get("updateTime", 0) / 1000),
            is_working=data.get("isWorking", True),
            orig_quote_order_qty=Decimal(data["origQuoteOrderQty"]) if data.get("origQuoteOrderQty") else None
        )

    def _publish_order_event(self, order: BinanceOrder, event_type: EventType):
        """주문 이벤트 발행"""
        event_data = {
            "order_id": order.client_order_id,
            "symbol": order.symbol,
            "side": order.side.value,
            "type": order.type.value,
            "quantity": float(order.orig_qty),
            "price": float(order.price) if order.price else None,
            "status": order.status.value,
            "filled_qty": float(order.executed_qty),
            "avg_price": float(order.avg_price) if order.avg_price else None
        }

        self.event_handler.publish(Event(
            event_type=event_type,
            source=self.adapter_id,
            data=event_data
        ))
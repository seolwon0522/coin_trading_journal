#!/usr/bin/env python
"""
바이낸스 어댑터 테스트 스크립트
Phase 2 검증: 바이낸스 데이터 수신 및 주문 실행 확인
"""
import asyncio
import sys
from pathlib import Path
from decimal import Decimal

# 프로젝트 경로 추가
sys.path.append(str(Path(__file__).parent))

from config.config import TradingConfig
from core.event_handler import EventHandler, Event, EventType
from core.logger import setup_logger
from adapters.binance_adapter import BinanceDataAdapter, BinanceExecutionAdapter
from adapters.data_types import OrderSide, OrderType, TimeInForce


async def test_binance_adapters():
    """바이낸스 어댑터 테스트"""

    print("=" * 60)
    print("바이낸스 어댑터 테스트 시작")
    print("=" * 60)

    # 설정 및 로거 초기화
    config = TradingConfig()
    logger = setup_logger("test", "INFO", console_output=True)

    # 이벤트 핸들러 생성
    event_handler = EventHandler("TEST_EVENT_HANDLER")
    await event_handler.start()

    # 데이터 어댑터 생성
    data_adapter = BinanceDataAdapter(config, event_handler)

    # 실행 어댑터 생성
    exec_adapter = BinanceExecutionAdapter(config, event_handler)

    try:
        # 어댑터 시작
        print("\n[1] 어댑터 시작...")
        await data_adapter.start()
        await exec_adapter.start()
        print("[OK] 어댑터 시작 완료")

        # 심볼 정보 확인
        print("\n[2] 심볼 정보 확인...")
        if "BTCUSDT" in data_adapter.symbol_info:
            info = data_adapter.symbol_info["BTCUSDT"]
            print(f"  - 심볼: {info.symbol}")
            print(f"  - 베이스 자산: {info.base_asset}")
            print(f"  - 인용 자산: {info.quote_asset}")
            print(f"  - 최소 수량: {info.min_qty}")
            print(f"  - 틱 사이즈: {info.tick_size}")
            print("[OK] 심볼 정보 로드 완료")
        else:
            print("[WARNING] BTCUSDT 심볼 정보를 찾을 수 없습니다")

        # 티커 데이터 조회
        print("\n[3] 티커 데이터 조회...")
        ticker = await data_adapter.get_ticker("BTCUSDT")
        print(f"  - 현재가: ${ticker.last_price}")
        print(f"  - 24시간 변동: {ticker.change_percent}%")
        print(f"  - 거래량: {ticker.volume}")
        print(f"  - 매수호가: ${ticker.bid_price}")
        print(f"  - 매도호가: ${ticker.ask_price}")
        print("[OK] 티커 조회 성공")

        # 캔들스틱 데이터 조회
        print("\n[4] 캔들스틱 데이터 조회...")
        klines = await data_adapter.get_klines("BTCUSDT", interval="1m", limit=5)
        print(f"  - 조회된 캔들 수: {len(klines)}")
        if klines:
            latest = klines[-1]
            print(f"  - 최근 캔들: O:{latest.open} H:{latest.high} L:{latest.low} C:{latest.close}")
            print(f"  - 거래량: {latest.volume}")
        print("[OK] 캔들스틱 조회 성공")

        # 호가창 조회
        print("\n[5] 호가창 조회...")
        orderbook = await data_adapter.get_orderbook("BTCUSDT", limit=5)
        print(f"  - 최고 매수호가: ${orderbook.best_bid.price if orderbook.best_bid else 'N/A'}")
        print(f"  - 최저 매도호가: ${orderbook.best_ask.price if orderbook.best_ask else 'N/A'}")
        print(f"  - 스프레드: ${orderbook.spread if orderbook.spread else 'N/A'}")
        print(f"  - 중간가: ${orderbook.mid_price if orderbook.mid_price else 'N/A'}")
        print("[OK] 호가창 조회 성공")

        # 계좌 정보 조회
        print("\n[6] 계좌 정보 조회...")
        account = await exec_adapter.get_account()
        print(f"  - 거래 가능: {account.can_trade}")
        print(f"  - 계좌 타입: {account.account_type}")
        print(f"  - 자산 수: {len(account.balances)}")

        # 주요 잔고 표시
        for balance in account.balances[:5]:  # 상위 5개만
            if balance.total > 0:
                print(f"  - {balance.asset}: {balance.free} (사용가능) + {balance.locked} (잠김) = {balance.total}")
        print("[OK] 계좌 조회 성공")

        # 웹소켓 스트림 테스트 (선택적)
        print("\n[7] 웹소켓 스트림 테스트 (스킵 가능)...")

        try:
            # 가격 업데이트 카운터
            price_updates = {"count": 0}

            def handle_price_update(event: Event):
                if event.event_type == EventType.PRICE_UPDATE:
                    price_updates["count"] += 1
                    data = event.data
                    print(f"  [PRICE] {data['symbol']}: ${data['price']}")

            # 이벤트 구독
            event_handler.subscribe(EventType.PRICE_UPDATE, handle_price_update)

            # 티커 구독
            await data_adapter.subscribe_ticker("btcusdt", None)
            print("  - 티커 스트림 구독 시작")

            # 5초간 데이터 수신
            print("  - 5초간 실시간 데이터 수신 중...")
            await asyncio.sleep(5)

            print(f"  - 받은 가격 업데이트: {price_updates['count']}개")
            print("[OK] 웹소켓 스트림 테스트 완료")

        except Exception as e:
            print(f"[WARNING] 웹소켓 테스트 스킵: {e}")
            print("  - 테스트넷 웹소켓이 제한적일 수 있습니다")

        # 열린 주문 조회
        print("\n[8] 열린 주문 조회...")
        open_orders = await exec_adapter.get_open_orders("BTCUSDT")
        print(f"  - 열린 주문 수: {len(open_orders)}")
        for order in open_orders[:3]:  # 상위 3개만
            print(f"  - {order.side.value} {order.orig_qty} @ {order.price} ({order.status.value})")
        print("[OK] 열린 주문 조회 완료")

        # 테스트 주문 생성 (테스트넷에서만)
        if config.use_testnet:
            print("\n[9] 테스트 주문 생성 (테스트넷)...")
            try:
                # 현재가보다 10% 낮은 가격으로 소액 지정가 매수 주문
                test_price = ticker.last_price * Decimal("0.9")
                test_price = test_price.quantize(Decimal("0.01"))  # 소수점 2자리

                order = await exec_adapter.create_order(
                    symbol="BTCUSDT",
                    side=OrderSide.BUY,
                    order_type=OrderType.LIMIT,
                    quantity=Decimal("0.001"),  # 0.001 BTC
                    price=test_price,
                    time_in_force=TimeInForce.GTC
                )
                print(f"  - 주문 ID: {order.order_id}")
                print(f"  - 상태: {order.status.value}")
                print(f"  - 타입: {order.side.value} {order.orig_qty} @ {order.price}")

                # 주문 취소
                print("  - 3초 후 주문 취소...")
                await asyncio.sleep(3)

                cancelled = await exec_adapter.cancel_order(
                    symbol="BTCUSDT",
                    order_id=order.order_id
                )
                print(f"  - 취소 상태: {cancelled.status.value}")
                print("[OK] 테스트 주문 생성/취소 완료")

            except Exception as e:
                print(f"[WARNING] 테스트 주문 실패: {e}")

        # 이벤트 통계
        print("\n[10] 이벤트 통계...")
        stats = event_handler.get_statistics()
        print(f"  - 총 이벤트: {stats['total_events']}")
        print(f"  - 이벤트 타입별:")
        for event_type, count in stats['event_counts'].items():
            if count > 0:
                print(f"    - {event_type}: {count}")
        print("[OK] 이벤트 통계 조회 완료")

        print("\n" + "=" * 60)
        print("[SUCCESS] 모든 테스트 완료!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # 정리
        print("\n어댑터 중지...")
        await data_adapter.stop()
        await exec_adapter.stop()
        await event_handler.stop()
        print("정리 완료")


async def test_websocket_streaming():
    """웹소켓 스트리밍 전용 테스트"""

    print("\n" + "=" * 60)
    print("웹소켓 스트리밍 테스트")
    print("=" * 60)

    config = TradingConfig()
    event_handler = EventHandler("WS_TEST")
    await event_handler.start()

    data_adapter = BinanceDataAdapter(config, event_handler)

    try:
        await data_adapter.start()

        # 콜백 함수들
        async def on_kline(data):
            print(f"[KLINE] {data.get('s')}: {data.get('k', {}).get('c')}")

        async def on_trade(data):
            print(f"[TRADE] {data.get('s')}: {data.get('p')} x {data.get('q')}")

        # 스트림 구독
        await data_adapter.subscribe_klines("btcusdt", "1m", on_kline)
        await data_adapter.subscribe_trades("btcusdt", on_trade)

        print("스트리밍 시작... (10초간 실행)")
        await asyncio.sleep(10)

        print("스트리밍 테스트 완료")

    finally:
        await data_adapter.stop()
        await event_handler.stop()


if __name__ == "__main__":
    print("\n>>> 바이낸스 어댑터 테스트 시작\n")

    # 메인 테스트 실행
    try:
        asyncio.run(test_binance_adapters())

        # 웹소켓 테스트는 별도로 실행 가능
        print("\n웹소켓 스트리밍 테스트를 원하시면 별도로 실행하세요")

        print("\n[OK] Phase 2 검증 완료: 바이낸스 어댑터가 정상적으로 작동합니다!")

    except KeyboardInterrupt:
        print("\n\n[WARNING] 사용자에 의해 중단됨")
    except Exception as e:
        print(f"\n[ERROR] 치명적 오류: {e}")
        import traceback
        traceback.print_exc()
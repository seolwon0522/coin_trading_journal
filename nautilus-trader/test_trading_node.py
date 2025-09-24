#!/usr/bin/env python
"""
Trading Node 테스트 스크립트
Phase 1 검증: Trading Node가 정상 시작하고 로그를 출력하는지 확인
"""
import asyncio
import sys
from pathlib import Path

# 프로젝트 경로 추가
sys.path.append(str(Path(__file__).parent))

from core.trading_node import TradingNode
from config.config import TradingConfig
from core.event_handler import Event, EventType


async def test_trading_node():
    """Trading Node 테스트"""

    print("=" * 60)
    print("Nautilus Trading Node 테스트 시작")
    print("=" * 60)

    # 설정 로드
    config = TradingConfig()

    # Trading Node 생성
    node = TradingNode(
        node_id="TEST_NODE_001",
        config=config
    )

    try:
        # 노드 초기화
        await node.initialize()
        print("\n[OK] 노드 초기화 성공")

        # 노드 상태 확인
        status = node.get_status()
        print("\n[STATUS] 노드 상태:")
        print(f"  - 노드 ID: {status['node_id']}")
        print(f"  - 실행 중: {status['running']}")
        print(f"  - 이벤트 통계: {status['event_stats']['total_events']} 이벤트")

        # 이벤트 발행 테스트
        print("\n[EVENT] 이벤트 발행 테스트...")

        # 가격 업데이트 이벤트
        node.event_handler.publish(Event(
            event_type=EventType.PRICE_UPDATE,
            source="TEST",
            data={
                "symbol": "BTCUSDT",
                "price": 50000.0,
                "bid": 49999.0,
                "ask": 50001.0,
                "volume": 1234.56
            }
        ))
        print("  - 가격 업데이트 이벤트 발행됨")

        # 시그널 생성 이벤트
        node.event_handler.publish(Event(
            event_type=EventType.SIGNAL_GENERATED,
            source="TEST_STRATEGY",
            data={
                "symbol": "BTCUSDT",
                "side": "BUY",
                "price": 50000.0,
                "quantity": 0.1
            }
        ))
        print("  - 시그널 생성 이벤트 발행됨")

        # 주문 생성 테스트
        print("\n[ORDER] 주문 생성 테스트...")
        from core.engine import OrderType
        order = node.trading_engine.create_order(
            symbol="BTCUSDT",
            order_type=OrderType.LIMIT,
            side="BUY",
            quantity=0.1,
            price=50000.0,
            strategy_id="TEST_STRATEGY"
        )
        print(f"  - 주문 생성됨: {order.order_id}")

        # 주문 제출
        success = await node.trading_engine.submit_order(order)
        print(f"  - 주문 제출: {'성공' if success else '실패'}")

        # 계좌 요약
        account = node.trading_engine.get_account_summary()
        print("\n[ACCOUNT] 계좌 요약:")
        print(f"  - 열린 주문: {account['open_orders']}")
        print(f"  - 열린 포지션: {account['open_positions']}")
        print(f"  - 미실현 손익: {account['total_unrealized_pnl']}")

        # 이벤트 히스토리
        history = node.event_handler.get_event_history(limit=5)
        print(f"\n[HISTORY] 최근 이벤트 ({len(history)}개):")
        for event in history:
            print(f"  - {event.event_type.value} ({event.timestamp.strftime('%H:%M:%S')})")

        # 10초 동안 실행
        print("\n[TEST] 10초 동안 노드 실행 테스트...")

        # 백그라운드 작업 시작
        run_task = asyncio.create_task(run_node_for_seconds(node, 10))

        # 주기적으로 상태 체크
        for i in range(5):
            await asyncio.sleep(2)
            stats = node.event_handler.get_statistics()
            print(f"  [{i*2+2}초] 총 이벤트: {stats['total_events']}")

        await run_task

        print("\n[OK] 모든 테스트 완료")

    except Exception as e:
        print(f"\n[ERROR] 테스트 실패: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        # 노드 정리
        await cleanup_node(node)

    print("\n" + "=" * 60)
    print("테스트 종료")
    print("=" * 60)


async def run_node_for_seconds(node: TradingNode, seconds: int):
    """노드를 지정된 시간 동안 실행"""
    from datetime import datetime
    node._running = True
    node.start_time = datetime.utcnow()

    for _ in range(seconds):
        await asyncio.sleep(1)

        # 랜덤 이벤트 발행
        if _ % 3 == 0:
            node.event_handler.publish(Event(
                event_type=EventType.PRICE_UPDATE,
                source="TEST",
                data={
                    "symbol": "BTCUSDT",
                    "price": 50000.0 + (_ * 10),
                    "volume": 100.0 + _
                }
            ))


async def cleanup_node(node: TradingNode):
    """노드 정리"""
    try:
        if node.trading_engine:
            await node.trading_engine.stop()
        if node.event_handler:
            await node.event_handler.stop()
    except Exception as e:
        print(f"정리 중 에러: {e}")


if __name__ == "__main__":
    print("\n>>> Nautilus Trading Node 테스트 시작\n")

    # 이벤트 루프 실행
    try:
        asyncio.run(test_trading_node())
        print("\n[OK] Phase 1 검증 완료: Trading Node가 정상적으로 작동합니다!")
    except KeyboardInterrupt:
        print("\n\n[WARNING] 사용자에 의해 중단됨")
    except Exception as e:
        print(f"\n[ERROR] 치명적 오류: {e}")
        import traceback
        traceback.print_exc()
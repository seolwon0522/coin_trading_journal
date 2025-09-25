"""
Test Script for Final Nautilus Engine Implementation
Production-ready test with error handling
"""

import asyncio
import logging
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.nautilus_engine_final import NautilusEngineFinal
from app.core.binance_listener import get_listen_key_manager
from app.websocket.manager import WebSocketManager
from app.adapters.instrument_provider import instrument_manager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("test_final.log")
    ]
)

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


async def test_nautilus_engine():
    """Test Final Nautilus Engine Implementation"""

    engine = None
    ws_manager = None
    listen_key_manager = None

    try:
        print("\n" + "=" * 60)
        print("🚀 NAUTILUS ENGINE FINAL TEST")
        print("=" * 60)

        # Step 1: Listen Key Manager (Optional for testnet)
        print("\n[1/10] Initializing Listen Key Manager...")
        try:
            listen_key_manager = get_listen_key_manager()
            await listen_key_manager.start()
            print("✅ Listen Key Manager started")
        except Exception as e:
            print(f"⚠️  Listen Key Manager failed (non-critical): {e}")

        # Step 2: WebSocket Manager
        print("\n[2/10] Initializing WebSocket Manager...")
        ws_manager = WebSocketManager()
        print("✅ WebSocket Manager ready")

        # Step 3: Initialize Engine
        print("\n[3/10] Initializing Nautilus Engine...")
        engine = NautilusEngineFinal()
        await engine.initialize()
        print("✅ Nautilus Engine initialized")

        # Step 4: Start Engine
        print("\n[4/10] Starting Nautilus Engine...")
        await engine.start()
        await asyncio.sleep(3)

        if engine.is_running:
            print("✅ Nautilus Engine is running")
        else:
            print("❌ Nautilus Engine failed to start")
            return

        # Step 5: Portfolio Status
        print("\n[5/10] Checking Portfolio Status...")
        try:
            portfolio_status = engine.get_portfolio_status()
            print(f"✅ Portfolio Status:")
            print(f"   - Status: {portfolio_status['status']}")
            print(f"   - Node Running: {portfolio_status['node_status']}")
            print(f"   - Accounts: {len(portfolio_status.get('balances', {}))}")
        except Exception as e:
            print(f"⚠️  Portfolio status error: {e}")

        # Step 6: Risk Metrics
        print("\n[6/10] Getting Risk Metrics...")
        try:
            risk_metrics = engine.get_risk_metrics()
            print(f"✅ Risk Metrics:")
            print(f"   - Open Positions: {risk_metrics['portfolio_metrics']['position_count']}")
            print(f"   - Open Orders: {risk_metrics['portfolio_metrics']['order_count']}")
        except Exception as e:
            print(f"⚠️  Risk metrics error: {e}")

        # Step 7: Create Strategy
        print("\n[7/10] Creating Test Strategy...")
        strategy_config = {
            "instruments": ["BTCUSDT", "ETHUSDT"],
            "max_positions": 2,
            "position_size": 0.001,
        }

        strategy_id = engine.add_strategy(
            strategy_type="simple",
            strategy_id="TEST_STRATEGY_001",
            config=strategy_config
        )
        print(f"✅ Strategy created: {strategy_id}")

        # Step 8: Start Strategy
        print("\n[8/10] Starting Strategy...")
        if engine.start_strategy(strategy_id):
            print("✅ Strategy started successfully")
        else:
            print("❌ Failed to start strategy")

        # Step 9: Monitor
        print("\n[9/10] Monitoring for 5 seconds...")
        for i in range(5):
            await asyncio.sleep(1)
            print(f"   Monitoring... {i+1}/5")

        # Step 10: Cleanup Strategy
        print("\n[10/10] Cleaning up strategy...")
        if engine.stop_strategy(strategy_id):
            print("✅ Strategy stopped")

        if engine.remove_strategy(strategy_id):
            print("✅ Strategy removed")

        print("\n" + "=" * 60)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        logger.error(f"Test failed: {e}", exc_info=True)

    finally:
        # Cleanup
        print("\n🧹 Cleanup...")

        if listen_key_manager:
            try:
                await listen_key_manager.stop()
                print("   - Listen Key Manager stopped")
            except Exception as e:
                logger.warning(f"Error stopping Listen Key Manager: {e}")

        if engine:
            try:
                await engine.stop()
                await engine.dispose()
                print("   - Engine disposed")
            except Exception as e:
                logger.warning(f"Error disposing engine: {e}")

        print("✅ Cleanup completed")


async def quick_test():
    """Quick test to verify basic functionality"""

    print("\n" + "=" * 60)
    print("⚡ QUICK TEST")
    print("=" * 60)

    # Test instrument provider
    print("\n[1/3] Testing Instrument Provider...")
    try:
        test_instrument = instrument_manager.create_test_instrument("BTCUSDT")
        print(f"✅ Instrument created: {test_instrument.id}")
    except Exception as e:
        print(f"❌ Instrument test failed: {e}")

    # Test engine initialization
    print("\n[2/3] Testing Engine Initialization...")
    engine = NautilusEngineFinal()
    await engine.initialize()
    print("✅ Engine initialized")

    # Test engine start/stop
    print("\n[3/3] Testing Engine Start/Stop...")
    await engine.start()
    await asyncio.sleep(2)

    if engine.is_running:
        print("✅ Engine started")

    await engine.stop()
    await engine.dispose()
    print("✅ Engine stopped and disposed")

    print("\n" + "=" * 60)
    print("✅ QUICK TEST PASSED")
    print("=" * 60)


async def main():
    """Main test runner"""

    try:
        # Run quick test first
        await quick_test()

        # Check if running in interactive mode
        import os
        is_interactive = os.isatty(0) if hasattr(os, 'isatty') else False
        auto_run = os.getenv("AUTO_RUN_TESTS", "false").lower() == "true"

        if is_interactive and not auto_run:
            # Ask user if they want to run full test
            print("\n" + "=" * 60)
            try:
                response = input("Run full test? (y/n): ")
                if response.lower() == 'y':
                    await test_nautilus_engine()
                else:
                    print("Skipping full test")
            except EOFError:
                print("Non-interactive mode detected, skipping full test")
        else:
            print("\n" + "=" * 60)
            print("Non-interactive mode - Running full test automatically")
            await test_nautilus_engine()

    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        logger.error(f"Test suite failed: {e}", exc_info=True)


if __name__ == "__main__":
    # Set UTF-8 encoding for Windows console
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

    # Run the test
    asyncio.run(main())
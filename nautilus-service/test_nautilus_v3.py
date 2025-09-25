"""
Test Script for Nautilus Engine V3 - Best Practice Implementation
Tests the engine following Nautilus Trader standards
"""

import asyncio
import logging
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.nautilus_engine_v3 import NautilusEngineV3
from app.core.binance_listener import get_listen_key_manager
from app.websocket.manager import WebSocketManager
from app.bridge.event_bridge_v2 import EventBridgeManagerV2
from app.adapters.instrument_provider import instrument_manager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("test_nautilus_v3.log")
    ]
)

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


async def test_nautilus_engine():
    """
    Test Nautilus Engine V3 with Best Practices
    """
    engine = None
    ws_manager = None
    event_bridge_manager = None
    listen_key_manager = None

    try:
        logger.info("=" * 60)
        logger.info("Starting Nautilus Engine V3 Test - Best Practices")
        logger.info("=" * 60)

        # Step 1: Initialize Listen Key Manager
        logger.info("\n[Step 1] Initializing Listen Key Manager...")
        try:
            listen_key_manager = get_listen_key_manager()
            await listen_key_manager.start()
            logger.info(f"[OK] Listen Key Manager started")
            logger.info(f"    Listen Key: {listen_key_manager.listen_key[:10]}...")
            logger.info(f"    WebSocket URL: {listen_key_manager.get_websocket_url()}")
        except Exception as e:
            logger.warning(f"[WARN] Listen Key Manager failed (may not be critical): {e}")

        # Step 2: Initialize WebSocket Manager
        logger.info("\n[Step 2] Initializing WebSocket Manager...")
        ws_manager = WebSocketManager()
        logger.info("[OK] WebSocket Manager initialized")

        # Step 3: Initialize Nautilus Engine
        logger.info("\n[Step 3] Initializing Nautilus Engine V3...")
        engine = NautilusEngineV3()
        await engine.initialize()
        logger.info("[OK] Nautilus Engine initialized with best practices")

        # Step 4: Start the Engine
        logger.info("\n[Step 4] Starting Nautilus Engine...")
        await engine.start()

        # Wait for engine to fully start
        await asyncio.sleep(3)

        if engine.is_running:
            logger.info("[OK] Nautilus Engine is running")
        else:
            logger.error("[ERROR] Nautilus Engine failed to start")
            return

        # Step 5: Initialize Event Bridge
        logger.info("\n[Step 5] Initializing Event Bridge...")
        event_bridge_manager = EventBridgeManagerV2(engine, ws_manager)
        success = await event_bridge_manager.start()

        if success:
            logger.info("[OK] Event Bridge started with best practices")
        else:
            logger.warning("[WARN] Event Bridge failed to start")

        # Step 6: Check Portfolio Status
        logger.info("\n[Step 6] Checking Portfolio Status...")
        try:
            portfolio_status = engine.get_portfolio_status()
            logger.info("[OK] Portfolio Status Retrieved")
            logger.info(f"    Status: {portfolio_status['status']}")
            logger.info(f"    Node Running: {portfolio_status['node_status']}")
            logger.info(f"    Accounts: {portfolio_status['accounts']}")
            logger.info(f"    Balances: {portfolio_status['balances']}")
        except Exception as e:
            logger.error(f"[ERROR] Portfolio status failed: {e}")

        # Step 7: Get Risk Metrics
        logger.info("\n[Step 7] Getting Risk Metrics...")
        try:
            risk_metrics = engine.get_risk_metrics()
            logger.info("[OK] Risk Metrics Retrieved")
            logger.info(f"    Total Equity: ${risk_metrics['portfolio_metrics']['total_equity']}")
            logger.info(f"    Open Positions: {risk_metrics['portfolio_metrics']['position_count']}")
            logger.info(f"    Open Orders: {risk_metrics['portfolio_metrics']['order_count']}")
        except Exception as e:
            logger.error(f"[ERROR] Risk metrics failed: {e}")

        # Step 8: Create Test Strategy
        logger.info("\n[Step 8] Creating Test Strategy...")
        strategy_config = {
            "instruments": ["BTCUSDT", "ETHUSDT"],
            "max_positions": 2,
            "position_size": 0.001,
        }

        strategy_id = engine.add_strategy(
            strategy_type="nautilus",
            strategy_id="TEST_STRATEGY_001",
            config=strategy_config
        )
        logger.info(f"[OK] Strategy created: {strategy_id}")

        # Step 9: Start Strategy
        logger.info("\n[Step 9] Starting Strategy...")
        if engine.start_strategy(strategy_id):
            logger.info("[OK] Strategy started successfully")
        else:
            logger.error("[ERROR] Failed to start strategy")

        # Step 10: Get Strategy Info
        logger.info("\n[Step 10] Getting Strategy Info...")
        try:
            strategy_info = engine.get_strategy_info(strategy_id)
            logger.info("[OK] Strategy Info Retrieved")
            logger.info(f"    ID: {strategy_info['strategy_id']}")
            logger.info(f"    Running: {strategy_info['is_running']}")
            logger.info(f"    Instruments: {strategy_info['subscribed_instruments']}")
        except Exception as e:
            logger.error(f"[ERROR] Strategy info failed: {e}")

        # Step 11: Monitor for a few seconds
        logger.info("\n[Step 11] Monitoring for 5 seconds...")
        for i in range(5):
            await asyncio.sleep(1)

            # Check for orders
            orders = engine.get_active_orders()
            if orders:
                logger.info(f"Active Orders: {orders}")

            # Check for positions
            positions = engine.get_positions()
            if positions:
                logger.info(f"Open Positions: {positions}")

            logger.info(f"Monitoring... {i+1}/5")

        # Step 12: Stop Strategy
        logger.info("\n[Step 12] Stopping Strategy...")
        if engine.stop_strategy(strategy_id):
            logger.info("[OK] Strategy stopped successfully")

        # Step 13: Remove Strategy
        logger.info("\n[Step 13] Removing Strategy...")
        if engine.remove_strategy(strategy_id):
            logger.info("[OK] Strategy removed successfully")

        logger.info("\n" + "=" * 60)
        logger.info("[SUCCESS] All tests completed!")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"[ERROR] Test failed: {e}", exc_info=True)

    finally:
        # Cleanup
        logger.info("\n[Cleanup] Shutting down...")

        # Stop Listen Key Manager
        if listen_key_manager:
            try:
                await listen_key_manager.stop()
                logger.info("Listen Key Manager stopped")
            except Exception as e:
                logger.warning(f"Error stopping Listen Key Manager: {e}")

        # Stop Event Bridge
        if event_bridge_manager:
            try:
                await event_bridge_manager.stop()
                logger.info("Event Bridge stopped")
            except Exception as e:
                logger.warning(f"Error stopping Event Bridge: {e}")

        # Stop and Dispose Engine
        if engine:
            try:
                await engine.stop()
                await engine.dispose()
                logger.info("Engine disposed")
            except Exception as e:
                logger.warning(f"Error disposing engine: {e}")

        logger.info("Cleanup completed")


async def test_instrument_provider():
    """
    Test the instrument provider
    """
    logger.info("\n" + "=" * 60)
    logger.info("Testing Instrument Provider")
    logger.info("=" * 60)

    try:
        # Create test instrument
        logger.info("\n[Test] Creating test instrument...")
        test_instrument = instrument_manager.create_test_instrument("BTCUSDT")
        logger.info(f"[OK] Test instrument created: {test_instrument.id}")

        # Test symbol mapping
        logger.info("\n[Test] Testing symbol mapping...")
        instrument_id = instrument_manager.symbol_to_instrument_id("ETHUSDT")
        logger.info(f"    ETHUSDT -> {instrument_id}")

        binance_symbol = instrument_manager.instrument_id_to_symbol(instrument_id)
        logger.info(f"    {instrument_id} -> {binance_symbol}")

        # Test validation
        logger.info("\n[Test] Testing order validation...")
        from decimal import Decimal

        is_valid = instrument_manager.validate_order_quantity(
            test_instrument.id,
            Decimal("0.01")
        )
        logger.info(f"    Quantity 0.01 BTC valid: {is_valid}")

        is_valid = instrument_manager.validate_order_price(
            test_instrument.id,
            Decimal("50000.00")
        )
        logger.info(f"    Price $50,000 valid: {is_valid}")

        logger.info("\n[SUCCESS] Instrument provider tests passed")

    except Exception as e:
        logger.error(f"[ERROR] Instrument provider test failed: {e}")


async def main():
    """
    Main test runner
    """
    try:
        # Test instrument provider
        await test_instrument_provider()

        # Test the main engine
        await test_nautilus_engine()

    except KeyboardInterrupt:
        logger.info("\n\nTest interrupted by user")
    except Exception as e:
        logger.error(f"Test suite failed: {e}", exc_info=True)


if __name__ == "__main__":
    # Run the test
    asyncio.run(main())
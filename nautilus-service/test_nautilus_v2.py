"""
Test Script for Nautilus Engine V2
Tests the new engine with Binance testnet connection
"""

import asyncio
import logging
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.nautilus_engine_v2 import NautilusEngineV2
from app.core.binance_listener import get_listen_key_manager
from app.websocket.manager import WebSocketManager
from app.bridge.event_bridge import EventBridgeManager
from app.adapters.instrument_provider import instrument_manager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("test_nautilus.log")
    ]
)

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


async def test_nautilus_engine():
    """
    Test the Nautilus Engine V2 with Binance testnet
    """
    engine = None
    ws_manager = None
    event_bridge_manager = None
    listen_key_manager = None

    try:
        logger.info("=" * 60)
        logger.info("Starting Nautilus Engine V2 Test")
        logger.info("=" * 60)

        # Step 0: Initialize Listen Key Manager (for user data stream)
        logger.info("\n[Step 0] Initializing Listen Key Manager...")
        listen_key_manager = get_listen_key_manager()
        await listen_key_manager.start()
        logger.info("[OK] Listen Key Manager started with keep-alive")

        # Step 1: Initialize WebSocket Manager
        logger.info("\n[Step 1] Initializing WebSocket Manager...")
        ws_manager = WebSocketManager()
        logger.info("[OK] WebSocket Manager initialized")

        # Step 2: Initialize Nautilus Engine
        logger.info("\n[Step 2] Initializing Nautilus Engine V2...")
        engine = NautilusEngineV2()
        await engine.initialize()
        logger.info("[OK] Nautilus Engine initialized")

        # Step 3: Start the engine
        logger.info("\n[Step 3] Starting Nautilus Engine...")
        await engine.start()
        await asyncio.sleep(2)  # Give it time to connect

        if engine.is_running:
            logger.info("[OK] Nautilus Engine is running")
        else:
            logger.error("[ERROR] Nautilus Engine failed to start")
            return

        # Step 4: Initialize Event Bridge
        logger.info("\n[Step 4] Initializing Event Bridge...")
        event_bridge_manager = EventBridgeManager(engine, ws_manager)
        await event_bridge_manager.start()
        logger.info("[OK] Event Bridge connected")

        # Step 5: Check portfolio status
        logger.info("\n[Step 5] Checking Portfolio Status...")
        portfolio_status = engine.get_portfolio_status()
        logger.info(f"Portfolio Status: {portfolio_status}")

        # Step 6: Get risk metrics
        logger.info("\n[Step 6] Getting Risk Metrics...")
        risk_metrics = engine.get_risk_metrics()
        logger.info(f"Risk Metrics: {risk_metrics}")

        # Step 7: Create and start a test strategy
        logger.info("\n[Step 7] Creating Test Strategy...")
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

        # Step 8: Start the strategy
        logger.info("\n[Step 8] Starting Strategy...")
        if engine.start_strategy(strategy_id):
            logger.info("[OK] Strategy started successfully")
        else:
            logger.error("[ERROR] Failed to start strategy")

        # Step 9: Get strategy info
        logger.info("\n[Step 9] Getting Strategy Info...")
        strategy_info = engine.get_strategy_info(strategy_id)
        logger.info(f"Strategy Info: {strategy_info}")

        # Step 10: Monitor for 10 seconds
        logger.info("\n[Step 10] Monitoring for 10 seconds...")
        for i in range(10):
            await asyncio.sleep(1)

            # Check for orders
            orders = engine.get_active_orders()
            if orders:
                logger.info(f"Active Orders: {orders}")

            # Check for positions
            positions = engine.get_positions()
            if positions:
                logger.info(f"Open Positions: {positions}")

            # Progress indicator
            logger.info(f"Monitoring... {i+1}/10")

        # Step 11: Stop the strategy
        logger.info("\n[Step 11] Stopping Strategy...")
        if engine.stop_strategy(strategy_id):
            logger.info("[OK] Strategy stopped successfully")

        # Step 12: Remove the strategy
        logger.info("\n[Step 12] Removing Strategy...")
        if engine.remove_strategy(strategy_id):
            logger.info("[OK] Strategy removed successfully")

        logger.info("\n" + "=" * 60)
        logger.info("[SUCCESS] All tests completed successfully!")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"[ERROR] Test failed with error: {e}", exc_info=True)

    finally:
        # Cleanup
        logger.info("\n[Cleanup] Shutting down...")

        if listen_key_manager:
            await listen_key_manager.stop()
            logger.info("Listen Key Manager stopped")

        if event_bridge_manager:
            await event_bridge_manager.stop()
            logger.info("Event Bridge stopped")

        if engine:
            await engine.stop()
            await engine.dispose()
            logger.info("Engine disposed")

        logger.info("Cleanup completed")


async def test_instrument_provider():
    """
    Test the instrument provider separately
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
        logger.info(f"ETHUSDT -> {instrument_id}")

        binance_symbol = instrument_manager.instrument_id_to_symbol(instrument_id)
        logger.info(f"{instrument_id} -> {binance_symbol}")

        # Test validation
        logger.info("\n[Test] Testing order validation...")
        from decimal import Decimal

        is_valid = instrument_manager.validate_order_quantity(
            test_instrument.id,
            Decimal("0.01")
        )
        logger.info(f"Quantity 0.01 BTC valid: {is_valid}")

        is_valid = instrument_manager.validate_order_price(
            test_instrument.id,
            Decimal("50000.00")
        )
        logger.info(f"Price $50,000 valid: {is_valid}")

        logger.info("\n[SUCCESS] Instrument provider tests passed")

    except Exception as e:
        logger.error(f"[ERROR] Instrument provider test failed: {e}")


async def main():
    """
    Main test runner
    """
    try:
        # Test instrument provider first
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
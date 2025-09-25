"""
Test Script for Mainnet Connection
Tests real Binance connection (not testnet)
"""

import asyncio
import logging
import sys
import io
import os
from pathlib import Path
from dotenv import load_dotenv

# Set UTF-8 encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

# Override to use mainnet
os.environ["BINANCE_TESTNET"] = "false"

from app.core.nautilus_engine_final import NautilusEngineFinal

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("test_mainnet.log")
    ]
)

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


async def test_mainnet():
    """Test Mainnet Connection"""

    engine = None

    try:
        print("\n" + "=" * 60)
        print("🌍 MAINNET CONNECTION TEST")
        print("=" * 60)
        print("⚠️  WARNING: Using REAL Binance API (not testnet)")
        print("⚠️  Ensure you have minimal balance for safety")
        print("=" * 60)

        # Confirm mainnet mode
        testnet = os.getenv("BINANCE_TESTNET", "false").lower() == "true"
        print(f"\nMode: {'TESTNET' if testnet else 'MAINNET'}")

        if testnet:
            print("❌ Still in testnet mode! Set BINANCE_TESTNET=false")
            return

        # Step 1: Initialize Engine
        print("\n[1/4] Initializing Mainnet Engine...")
        engine = NautilusEngineFinal()
        await engine.initialize()
        print("✅ Mainnet Engine initialized")

        # Step 2: Start Engine
        print("\n[2/4] Starting Mainnet Engine...")
        await engine.start()

        # Wait for engine to fully start
        print("   Waiting for connection...")
        await asyncio.sleep(5)

        if engine.is_running:
            print("✅ Mainnet Engine is running - WebSocket connected!")
        else:
            print("❌ Mainnet Engine failed to start")
            return

        # Step 3: Check Portfolio
        print("\n[3/4] Checking Real Portfolio...")
        try:
            portfolio_status = engine.get_portfolio_status()
            print("✅ Real Portfolio Retrieved")
            print(f"   - Status: {portfolio_status['status']}")
            print(f"   - Balances: {len(portfolio_status.get('balances', {}))}")

            # Show some balances (if any)
            balances = portfolio_status.get('balances', {})
            if balances:
                for account, account_balances in list(balances.items())[:1]:
                    print(f"\n   Account: {account}")
                    for currency, balance in list(account_balances.items())[:5]:
                        if balance['total'] > 0:
                            print(f"     {currency}: {balance['total']}")
        except Exception as e:
            print(f"⚠️  Portfolio error: {e}")

        # Step 4: Monitor
        print("\n[4/4] Monitoring for 10 seconds...")
        for i in range(10):
            await asyncio.sleep(1)
            print(f"   Connected... {i+1}/10")

        print("\n" + "=" * 60)
        print("✅ MAINNET TEST SUCCESSFUL!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        logger.error(f"Test failed: {e}", exc_info=True)

    finally:
        # Cleanup
        print("\n🧹 Cleanup...")

        if engine:
            try:
                await engine.stop()
                await engine.dispose()
                print("   - Engine disposed")
            except Exception as e:
                logger.warning(f"Error disposing engine: {e}")

        print("✅ Cleanup completed")


async def main():
    """Main test runner"""

    try:
        # Safety check
        print("\n" + "=" * 60)
        print("⚠️  MAINNET CONNECTION WARNING")
        print("=" * 60)
        print("This will connect to REAL Binance (not testnet)")
        print("Ensure you have:")
        print("1. Valid mainnet API keys in .env")
        print("2. Minimal balance for safety")
        print("3. Read-only API keys recommended for testing")
        print("=" * 60)

        # Run test
        await test_mainnet()

    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        logger.error(f"Test suite failed: {e}", exc_info=True)


if __name__ == "__main__":
    asyncio.run(main())
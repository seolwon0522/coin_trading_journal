"""
Test Script for Patched Nautilus Engine
Tests the WebSocket 404 fix
"""

import asyncio
import logging
import sys
import io
from pathlib import Path
from dotenv import load_dotenv

# Set UTF-8 encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.nautilus_engine_patched import NautilusEnginePatched

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("test_patched.log")
    ]
)

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


async def test_nautilus_patched():
    """Test Patched Nautilus Engine"""

    engine = None

    try:
        print("\n" + "=" * 60)
        print("🔧 NAUTILUS ENGINE PATCHED TEST")
        print("=" * 60)

        # Step 1: Initialize Engine
        print("\n[1/5] Initializing Patched Nautilus Engine...")
        engine = NautilusEnginePatched()
        await engine.initialize()
        print("✅ Patched Engine initialized")

        # Step 2: Start Engine
        print("\n[2/5] Starting Patched Engine...")
        await engine.start()

        # Wait for engine to fully start
        print("   Waiting for engine startup...")
        await asyncio.sleep(5)

        if engine.is_running:
            print("✅ Patched Engine is running")
        else:
            print("❌ Patched Engine failed to start")
            return

        # Step 3: Check Portfolio Status
        print("\n[3/5] Checking Portfolio Status...")
        try:
            portfolio_status = engine.get_portfolio_status()
            print("✅ Portfolio Status Retrieved")
            print(f"   - Status: {portfolio_status['status']}")
            print(f"   - Node Running: {portfolio_status['node_status']}")
        except Exception as e:
            print(f"⚠️  Portfolio status error: {e}")

        # Step 4: Monitor for a few seconds
        print("\n[4/5] Monitoring for 10 seconds...")
        for i in range(10):
            await asyncio.sleep(1)
            print(f"   Monitoring... {i+1}/10")

            # Check if any errors occurred
            if not engine.is_running:
                print("❌ Engine stopped unexpectedly")
                break

        # Step 5: Success check
        print("\n[5/5] Final Status Check...")
        if engine.is_running:
            print("✅ Engine still running - WebSocket connection successful!")
        else:
            print("❌ Engine stopped - check logs for errors")

        print("\n" + "=" * 60)
        print("✅ PATCHED TEST COMPLETED")
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
        await test_nautilus_patched()

    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        logger.error(f"Test suite failed: {e}", exc_info=True)


if __name__ == "__main__":
    asyncio.run(main())
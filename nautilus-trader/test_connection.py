"""
Binance Testnet Connection Test
"""
import asyncio
import os
from datetime import datetime
from binance import AsyncClient, BinanceSocketManager
from dotenv import load_dotenv
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

# Load environment variables
load_dotenv()


async def test_rest_api():
    """Test REST API connection"""
    print("\n[TEST] Testing REST API Connection...")

    api_key = os.getenv("BINANCE_TESTNET_API_KEY")
    api_secret = os.getenv("BINANCE_TESTNET_API_SECRET")

    if not api_key or not api_secret:
        print("[ERROR] API credentials not found in .env file")
        return False

    try:
        # Create client with testnet URL
        client = await AsyncClient.create(
            api_key=api_key,
            api_secret=api_secret,
            testnet=True
        )

        # Test server time
        server_time = await client.get_server_time()
        server_datetime = datetime.fromtimestamp(server_time['serverTime'] / 1000)
        print(f"[OK] Connected to Binance Testnet")
        print(f"  Server time: {server_datetime}")

        # Get account info
        try:
            account = await client.get_account()
            print(f"[OK] Account access successful")
            print(f"  Can trade: {account['canTrade']}")
            print(f"  Can withdraw: {account['canWithdraw']}")
            print(f"  Can deposit: {account['canDeposit']}")

            # Show balances
            balances = [b for b in account['balances'] if float(b['free']) > 0 or float(b['locked']) > 0]
            if balances:
                print("\n  Balances:")
                for balance in balances[:5]:  # Show first 5 non-zero balances
                    print(f"    {balance['asset']}: {balance['free']} (free) + {balance['locked']} (locked)")
            else:
                print("  No balances found (normal for new testnet account)")

        except Exception as e:
            print(f"[WARNING] Account access failed: {e}")
            print("  This is normal if the testnet account is new")

        # Test market data
        ticker = await client.get_symbol_ticker(symbol="BTCUSDT")
        print(f"\n[OK] Market data access successful")
        print(f"  BTC/USDT price: ${float(ticker['price']):,.2f}")

        # Get exchange info
        exchange_info = await client.get_exchange_info()
        print(f"[OK] Exchange info retrieved")
        print(f"  Trading pairs available: {len(exchange_info['symbols'])}")

        await client.close_connection()
        return True

    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        return False


async def test_websocket():
    """Test WebSocket connection"""
    print("\n[TEST] Testing WebSocket Connection...")

    api_key = os.getenv("BINANCE_TESTNET_API_KEY")
    api_secret = os.getenv("BINANCE_TESTNET_API_SECRET")

    try:
        client = await AsyncClient.create(
            api_key=api_key,
            api_secret=api_secret,
            testnet=True
        )

        bm = BinanceSocketManager(client)

        # Test ticker stream
        ts = bm.symbol_ticker_socket("BTCUSDT")

        print("[OK] WebSocket connected")
        print("  Receiving BTC/USDT ticker data (5 messages)...")

        count = 0
        async with ts as tscm:
            while count < 5:
                res = await tscm.recv()
                if res:
                    count += 1
                    print(f"  [{count}] Price: ${float(res['c']):,.2f}, "
                          f"Volume: {float(res['v']):,.0f}")

        await client.close_connection()
        print("[OK] WebSocket test completed")
        return True

    except Exception as e:
        print(f"[ERROR] WebSocket connection failed: {e}")
        return False


async def test_trading_pairs():
    """Test available trading pairs"""
    print("\n[INFO] Checking Available Trading Pairs...")

    api_key = os.getenv("BINANCE_TESTNET_API_KEY")
    api_secret = os.getenv("BINANCE_TESTNET_API_SECRET")

    try:
        client = await AsyncClient.create(
            api_key=api_key,
            api_secret=api_secret,
            testnet=True
        )

        # Get exchange info
        exchange_info = await client.get_exchange_info()

        # Filter USDT pairs
        usdt_pairs = [
            s['symbol'] for s in exchange_info['symbols']
            if s['symbol'].endswith('USDT') and s['status'] == 'TRADING'
        ]

        print(f"[OK] Found {len(usdt_pairs)} USDT trading pairs")
        print(f"  Popular pairs: {', '.join(usdt_pairs[:10])}")

        # Check specific pairs for our strategies
        target_pairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']
        available = [p for p in target_pairs if p in usdt_pairs]

        print(f"\n[OK] Strategy pairs available: {', '.join(available)}")

        await client.close_connection()
        return True

    except Exception as e:
        print(f"[ERROR] Failed to get trading pairs: {e}")
        return False


async def main():
    """Main test function"""
    print("=" * 60)
    print("BINANCE TESTNET CONNECTION TEST")
    print("=" * 60)

    results = []

    # Test REST API
    results.append(await test_rest_api())

    # Test WebSocket
    results.append(await test_websocket())

    # Test trading pairs
    results.append(await test_trading_pairs())

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    if all(results):
        print("[SUCCESS] All tests passed successfully!")
        print("\n[SUCCESS] Your Binance Testnet connection is working correctly!")
        print("You can now proceed to Day 2: Basic Structure Setup")
    else:
        print("[ERROR] Some tests failed")
        print("\nPlease check:")
        print("1. Your .env file has correct API keys")
        print("2. Your internet connection is stable")
        print("3. Binance Testnet is accessible from your location")

    return all(results)


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
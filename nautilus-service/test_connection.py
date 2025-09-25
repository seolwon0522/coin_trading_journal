"""
Test script to verify Binance testnet connection
"""

import os
import asyncio
from dotenv import load_dotenv
from binance import AsyncClient, BinanceSocketManager
from binance.exceptions import BinanceAPIException

# Load environment variables
load_dotenv()

async def test_connection():

    """Test Binance testnet connection"""

    api_key = os.getenv("BINANCE_API_KEY")
    api_secret = os.getenv("BINANCE_API_SECRET")

    if not api_key or not api_secret:
        print("[ERROR] API keys not found in environment")
        return False

    print("Testing Binance Testnet Connection...")
    print(f"API Key: {api_key[:10]}...")

    try:
        # Create client with testnet URL
        client = await AsyncClient.create(
            api_key=api_key,
            api_secret=api_secret,
            testnet=True
        )

        print("[OK] Connected to Binance Testnet")

        # Test 1: Get account info
        try:
            account = await client.get_account()
            print(f"[OK] Account Info Retrieved")
            print(f"   - Can Trade: {account['canTrade']}")
            print(f"   - Can Withdraw: {account['canWithdraw']}")
            print(f"   - Can Deposit: {account['canDeposit']}")

            # Show balances
            balances = [b for b in account['balances'] if float(b['free']) > 0 or float(b['locked']) > 0]
            if balances:
                print("   - Balances:")
                for balance in balances[:5]:  # Show first 5 non-zero balances
                    print(f"     {balance['asset']}: {balance['free']} (free), {balance['locked']} (locked)")
        except BinanceAPIException as e:
            print(f"[ERROR] Failed to get account info: {e}")

        # Test 2: Get exchange info
        try:
            exchange_info = await client.get_exchange_info()
            print(f"[OK] Exchange Info Retrieved")
            print(f"   - Number of symbols: {len(exchange_info['symbols'])}")

            # Find BTCUSDT
            btcusdt = next((s for s in exchange_info['symbols'] if s['symbol'] == 'BTCUSDT'), None)
            if btcusdt:
                print(f"   - BTCUSDT Status: {btcusdt['status']}")
        except BinanceAPIException as e:
            print(f"[ERROR] Failed to get exchange info: {e}")

        # Test 3: Get ticker
        try:
            ticker = await client.get_symbol_ticker(symbol="BTCUSDT")
            print(f"[OK] Ticker Retrieved")
            print(f"   - BTCUSDT Price: {ticker['price']}")
        except BinanceAPIException as e:
            print(f"[ERROR] Failed to get ticker: {e}")

        # Test 4: WebSocket connection
        try:
            print("\nTesting WebSocket connection...")
            bm = BinanceSocketManager(client)

            # Test trade socket
            ts = bm.trade_socket('BTCUSDT')

            # Receive one message and close
            async with ts as tscm:
                res = await tscm.recv()
                if res:
                    print(f"[OK] WebSocket Connected")
                    print(f"   - Received trade data for {res['s']}")

        except Exception as e:
            print(f"[ERROR] WebSocket connection failed: {e}")

        await client.close_connection()
        print("\n[OK] All tests completed successfully!")
        return True

    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        return False

async def test_market_data():
    """Test market data retrieval"""

    api_key = os.getenv("BINANCE_API_KEY")
    api_secret = os.getenv("BINANCE_API_SECRET")

    client = await AsyncClient.create(
        api_key=api_key,
        api_secret=api_secret,
        testnet=True
    )

    try:
        print("\n[INFO] Testing Market Data...")

        # Get order book
        depth = await client.get_order_book(symbol='BTCUSDT', limit=5)
        print(f"[OK] Order Book Retrieved")
        print(f"   - Bids: {len(depth['bids'])} levels")
        print(f"   - Asks: {len(depth['asks'])} levels")
        if depth['bids']:
            print(f"   - Best Bid: {depth['bids'][0][0]} @ {depth['bids'][0][1]}")
        if depth['asks']:
            print(f"   - Best Ask: {depth['asks'][0][0]} @ {depth['asks'][0][1]}")

        # Get recent trades
        trades = await client.get_recent_trades(symbol='BTCUSDT', limit=5)
        print(f"[OK] Recent Trades Retrieved")
        print(f"   - Number of trades: {len(trades)}")

        # Get klines
        klines = await client.get_klines(symbol='BTCUSDT', interval='1m', limit=5)
        print(f"[OK] Klines Retrieved")
        print(f"   - Number of candles: {len(klines)}")
        if klines:
            last_candle = klines[-1]
            print(f"   - Last candle: O:{last_candle[1]} H:{last_candle[2]} L:{last_candle[3]} C:{last_candle[4]}")

    except Exception as e:
        print(f"[ERROR] Market data test failed: {e}")

    await client.close_connection()

if __name__ == "__main__":
    print("=" * 50)
    print("Binance Testnet Connection Test")
    print("=" * 50)

    # Run connection test
    asyncio.run(test_connection())

    # Run market data test
    asyncio.run(test_market_data())

    print("\n" + "=" * 50)
    print("Test Complete")
    print("=" * 50)
"""
Check Binance API Key Permissions
Verify that API key has required permissions for WebSocket user data stream
"""

import os
import hmac
import hashlib
import time
import httpx
import asyncio
from urllib.parse import urlencode
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


async def check_api_permissions():
    """
    Check Binance API key permissions and connectivity
    """
    api_key = os.getenv("BINANCE_API_KEY")
    api_secret = os.getenv("BINANCE_API_SECRET")
    testnet = os.getenv("BINANCE_TESTNET", "true").lower() == "true"

    if not api_key or not api_secret:
        print("❌ API_KEY or API_SECRET not found in environment")
        return

    print(f"🔍 Checking API permissions...")
    print(f"   Mode: {'TESTNET' if testnet else 'MAINNET'}")
    print(f"   API Key: {api_key[:10]}...")

    # Determine base URL
    if testnet:
        base_url = "https://testnet.binance.vision"
    else:
        base_url = "https://api.binance.com"

    # Test 1: Check API connectivity
    print("\n[1/4] Testing API connectivity...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{base_url}/api/v3/ping")
            response.raise_for_status()
            print("✅ API server is reachable")
        except Exception as e:
            print(f"❌ Cannot reach API server: {e}")
            return

    # Test 2: Check account info (requires signature)
    print("\n[2/4] Checking account permissions...")
    timestamp = int(time.time() * 1000)
    query_string = f"timestamp={timestamp}"

    # Create signature
    signature = hmac.new(
        api_secret.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    headers = {
        "X-MBX-APIKEY": api_key
    }

    async with httpx.AsyncClient() as client:
        try:
            url = f"{base_url}/api/v3/account?{query_string}&signature={signature}"
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            account_data = response.json()
            permissions = account_data.get('permissions', [])
            print(f"✅ Account accessible with permissions: {permissions}")

            # Check for required permissions
            if 'SPOT' in permissions:
                print("✅ SPOT trading permission: ENABLED")
            else:
                print("⚠️  SPOT trading permission: NOT FOUND")

        except httpx.HTTPStatusError as e:
            print(f"❌ Account access failed: {e.response.status_code}")
            print(f"   Response: {e.response.text}")
            if e.response.status_code == 401:
                print("   → Check API key and secret")
            elif e.response.status_code == 403:
                print("   → API key may lack permissions or IP restriction")
        except Exception as e:
            print(f"❌ Account check error: {e}")

    # Test 3: Create listen key (most important for WebSocket)
    print("\n[3/4] Testing listen key creation...")
    headers = {
        "X-MBX-APIKEY": api_key
    }

    async with httpx.AsyncClient() as client:
        try:
            url = f"{base_url}/api/v3/userDataStream"
            response = await client.post(url, headers=headers)
            response.raise_for_status()

            data = response.json()
            listen_key = data.get("listenKey")
            if listen_key:
                print(f"✅ Listen key created: {listen_key[:20]}...")

                # Test 4: Check WebSocket URL
                print("\n[4/4] Checking WebSocket URL formation...")
                if testnet:
                    ws_base = "wss://testnet.binance.vision"
                else:
                    ws_base = "wss://stream.binance.com"

                ws_url = f"{ws_base}/ws/{listen_key}"
                print(f"   WebSocket URL: {ws_url[:50]}...")

                # Try to delete the listen key (cleanup)
                try:
                    params = {"listenKey": listen_key}
                    await client.delete(url, headers=headers, params=params)
                    print("✅ Listen key cleanup successful")
                except:
                    pass

        except httpx.HTTPStatusError as e:
            print(f"❌ Listen key creation failed: {e.response.status_code}")
            print(f"   Response: {e.response.text}")
            if e.response.status_code == 401:
                print("   → API key is invalid or expired")
            elif e.response.status_code == 403:
                print("   → API key lacks 'Enable Spot & Margin Trading' permission")
        except Exception as e:
            print(f"❌ Listen key error: {e}")

    print("\n" + "=" * 60)
    print("📋 CHECKLIST FOR 404 ERRORS:")
    print("=" * 60)
    print("1. ✅ Remove port :9443 from mainnet WebSocket URL")
    print("2. ✅ Use correct path: /ws/{listenKey} OR just /{listenKey}")
    print("3. ✅ Ensure API key has 'Enable Spot & Margin Trading' permission")
    print("4. ✅ Check if using correct environment (testnet vs mainnet)")
    print("5. ✅ Verify listen key is created before WebSocket connection")
    print("=" * 60)


if __name__ == "__main__":
    import sys
    import io
    # Set UTF-8 encoding for Windows console
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

    asyncio.run(check_api_permissions())
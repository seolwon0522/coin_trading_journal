#!/usr/bin/env python3
"""
Test Binance Futures Testnet API - Check Account Balance
"""
import asyncio
import hmac
import hashlib
import time
from urllib.parse import urlencode
import httpx

API_KEY = "e189691f0f3f301496d046f4c8b139990e7301de168a770c2a19a2ed6a435c4e"
API_SECRET = "d2e2802212973f992addafc6629cebf25ce67486da5806d4c167a1c98bdab851"
BASE_URL = "https://testnet.binancefuture.com"


def create_signature(query_string: str, secret: str) -> str:
    """Create HMAC SHA256 signature"""
    return hmac.new(
        secret.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()


async def get_account_balance():
    """Get Futures account balance"""
    print("=" * 60)
    print("Binance Futures Testnet - Account Balance Check")
    print("=" * 60)
    
    # Prepare request
    timestamp = int(time.time() * 1000)
    params = {
        'timestamp': timestamp,
        'recvWindow': 5000
    }
    
    query_string = urlencode(params)
    signature = create_signature(query_string, API_SECRET)
    
    url = f"{BASE_URL}/fapi/v2/account"
    headers = {
        'X-MBX-APIKEY': API_KEY
    }
    
    print(f"\n[1] Testing API Connection...")
    print(f"    URL: {url}")
    print(f"    API Key: {API_KEY[:20]}...")
    
    async with httpx.AsyncClient() as client:
        try:
            # Test 1: Get account info
            response = await client.get(
                url,
                params={**params, 'signature': signature},
                headers=headers,
                timeout=10.0
            )
            
            print(f"\n[2] Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("\n✅ SUCCESS! Account balance:")
                print("-" * 60)
                
                # Print account info
                total_wallet_balance = float(data.get('totalWalletBalance', 0))
                available_balance = float(data.get('availableBalance', 0))
                total_unrealized_profit = float(data.get('totalUnrealizedProfit', 0))
                
                print(f"Total Wallet Balance:    {total_wallet_balance:.2f} USDT")
                print(f"Available Balance:       {available_balance:.2f} USDT")
                print(f"Unrealized PnL:          {total_unrealized_profit:.2f} USDT")
                
                # Print asset balances
                print("\n💰 Asset Balances:")
                assets = data.get('assets', [])
                if assets:
                    for asset in assets:
                        asset_name = asset.get('asset', 'Unknown')
                        wallet_balance = float(asset.get('walletBalance', 0))
                        available = float(asset.get('availableBalance', 0))
                        
                        if wallet_balance > 0:
                            print(f"   {asset_name}: {wallet_balance:.8f} (Available: {available:.8f})")
                else:
                    print("   No assets found")
                
                # Print positions
                print("\n📊 Open Positions:")
                positions = data.get('positions', [])
                open_positions = [p for p in positions if float(p.get('positionAmt', 0)) != 0]
                
                if open_positions:
                    for pos in open_positions:
                        symbol = pos.get('symbol', 'Unknown')
                        position_amt = float(pos.get('positionAmt', 0))
                        entry_price = float(pos.get('entryPrice', 0))
                        unrealized_profit = float(pos.get('unrealizedProfit', 0))
                        
                        print(f"   {symbol}: {position_amt} @ {entry_price:.2f} (PnL: {unrealized_profit:.2f})")
                else:
                    print("   No open positions")
                
                print("\n" + "=" * 60)
                return True
                
            else:
                print(f"\n❌ FAILED! Status: {response.status_code}")
                print(f"Response: {response.text}")
                
                try:
                    error_data = response.json()
                    error_code = error_data.get('code', 'Unknown')
                    error_msg = error_data.get('msg', 'Unknown error')
                    
                    print(f"\nError Code: {error_code}")
                    print(f"Error Message: {error_msg}")
                    
                    if error_code == -2015:
                        print("\n⚠️  API Key Permission Issue:")
                        print("   1. Make sure API key is created on https://testnet.binancefuture.com")
                        print("   2. Check if 'Enable Futures' permission is enabled")
                        print("   3. Try creating a new API key with full permissions")
                    elif error_code == -4109:
                        print("\n⚠️  Account Inactive:")
                        print("   Please get test funds from the faucet:")
                        print("   https://testnet.binancefuture.com - Click 'Get Test Funds'")
                    
                except:
                    pass
                
                return False
                
        except httpx.TimeoutException:
            print("\n❌ Request timeout!")
            return False
        except Exception as e:
            print(f"\n❌ Error: {e}")
            return False


async def test_server_time():
    """Test if we can reach the server"""
    print("\n[Testing Server Connection...]")
    url = f"{BASE_URL}/fapi/v1/time"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                server_time = data.get('serverTime', 0)
                print(f"✅ Server is reachable. Server time: {server_time}")
                return True
            else:
                print(f"❌ Server returned status: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Cannot reach server: {e}")
            return False


async def main():
    # Test server connection first
    if not await test_server_time():
        print("\n⚠️  Cannot connect to Binance Futures Testnet server")
        return
    
    # Test account balance
    await get_account_balance()


if __name__ == "__main__":
    asyncio.run(main())




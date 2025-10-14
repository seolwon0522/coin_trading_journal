#!/usr/bin/env python3
"""
Request Test Funds from Binance Futures Testnet via API
"""
import asyncio
import httpx

API_KEY = "e189691f0f3f301496d046f4c8b139990e7301de168a770c2a19a2ed6a435c4e"
BASE_URL = "https://testnet.binancefuture.com"


async def request_test_funds():
    """Try to request test funds via API"""
    print("=" * 60)
    print("Requesting Test Funds from Binance Futures Testnet")
    print("=" * 60)
    
    headers = {
        'X-MBX-APIKEY': API_KEY,
        'Content-Type': 'application/json'
    }
    
    # Possible faucet endpoints to try
    endpoints = [
        "/fapi/v1/faucet",
        "/fapi/v1/testnet/faucet",
        "/sapi/v1/faucet",
        "/sapi/v1/asset/get-funding-asset",
    ]
    
    async with httpx.AsyncClient() as client:
        for endpoint in endpoints:
            url = f"{BASE_URL}{endpoint}"
            print(f"\n[Trying] {url}")
            
            try:
                # Try POST
                response = await client.post(url, headers=headers, timeout=10.0)
                print(f"  POST Status: {response.status_code}")
                
                if response.status_code == 200:
                    print(f"  ✅ SUCCESS!")
                    print(f"  Response: {response.text}")
                    return True
                elif response.status_code == 404:
                    print(f"  ❌ Endpoint not found")
                else:
                    print(f"  Response: {response.text[:200]}")
                    
            except Exception as e:
                print(f"  Error: {e}")
            
            try:
                # Try GET
                response = await client.get(url, headers=headers, timeout=10.0)
                print(f"  GET Status: {response.status_code}")
                
                if response.status_code == 200:
                    print(f"  ✅ SUCCESS!")
                    print(f"  Response: {response.text}")
                    return True
                elif response.status_code != 404:
                    print(f"  Response: {response.text[:200]}")
                    
            except Exception as e:
                print(f"  Error: {e}")
    
    print("\n" + "=" * 60)
    print("⚠️  No API faucet endpoint found")
    print("\nAlternative options:")
    print("1. Use Web UI: https://testnet.binancefuture.com")
    print("   - Login and click 'Get Test Funds' or 'Faucet' button")
    print("\n2. Try different browser/clear cookies if faucet fails")
    print("\n3. Create a new testnet account and try again")
    print("=" * 60)
    
    return False


async def check_existing_balance():
    """Check if there's already a balance"""
    print("\n[Checking existing balance...]")
    
    url = f"{BASE_URL}/fapi/v2/balance"
    headers = {'X-MBX-APIKEY': API_KEY}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            
            if response.status_code == 200:
                balances = response.json()
                usdt_balance = next((b for b in balances if b.get('asset') == 'USDT'), None)
                
                if usdt_balance:
                    balance = float(usdt_balance.get('balance', 0))
                    print(f"Current USDT Balance: {balance:.2f}")
                    
                    if balance > 0:
                        print("✅ You already have funds!")
                        return True
                    else:
                        print("❌ Balance is 0 - need to request test funds")
                else:
                    print("❌ No USDT balance found")
            else:
                print(f"Cannot check balance: {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"Error checking balance: {e}")
    
    return False


async def main():
    # Check existing balance first
    has_balance = await check_existing_balance()
    
    if not has_balance:
        print("\nAttempting to request test funds via API...")
        await request_test_funds()


if __name__ == "__main__":
    asyncio.run(main())




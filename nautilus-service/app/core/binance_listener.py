"""
Binance Listen Key Manager
Handles listen key creation and keep-alive for user data stream
"""

import asyncio
import logging
import os
import httpx
from typing import Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class BinanceListenKeyManager:
    """
    Manages Binance listen key lifecycle
    - Creates listen key for user data stream
    - Sends keep-alive every 30 minutes
    - Handles reconnection on failure
    """

    def __init__(self, api_key: str, api_secret: str, testnet: bool = True):
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet

        # Base URLs for testnet vs production
        if testnet:
            self.base_url = "https://testnet.binance.vision"
        else:
            self.base_url = "https://api.binance.com"

        self.listen_key: Optional[str] = None
        self.last_keepalive: Optional[datetime] = None
        self.keepalive_task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self):
        """
        Start listen key manager
        Creates initial listen key and starts keep-alive task
        """
        try:
            # Create initial listen key
            await self.create_listen_key()

            # Start keep-alive task
            self._running = True
            self.keepalive_task = asyncio.create_task(self._keepalive_loop())

            logger.info(f"Listen key manager started - Key: {self.listen_key[:10]}...")

        except Exception as e:
            logger.error(f"Failed to start listen key manager: {e}")
            raise

    async def stop(self):
        """
        Stop listen key manager
        Closes listen key and stops keep-alive task
        """
        self._running = False

        # Cancel keep-alive task
        if self.keepalive_task and not self.keepalive_task.done():
            self.keepalive_task.cancel()
            try:
                await self.keepalive_task
            except asyncio.CancelledError:
                pass

        # Close listen key
        if self.listen_key:
            await self.close_listen_key()

        logger.info("Listen key manager stopped")

    async def create_listen_key(self):
        """
        Create a new listen key for user data stream
        """
        endpoint = "/api/v3/userDataStream"
        url = f"{self.base_url}{endpoint}"

        headers = {
            "X-MBX-APIKEY": self.api_key
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers)
                response.raise_for_status()

                data = response.json()
                self.listen_key = data.get("listenKey")
                self.last_keepalive = datetime.now()

                logger.info(f"Created listen key: {self.listen_key[:10]}...")
                return self.listen_key

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error creating listen key: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Error creating listen key: {e}")
                raise

    async def keepalive_listen_key(self):
        """
        Send keep-alive ping for the listen key
        Must be called every 30 minutes to prevent key expiration
        """
        if not self.listen_key:
            logger.warning("No listen key to keep alive")
            return

        endpoint = "/api/v3/userDataStream"
        url = f"{self.base_url}{endpoint}"

        headers = {
            "X-MBX-APIKEY": self.api_key
        }

        params = {
            "listenKey": self.listen_key
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.put(url, headers=headers, params=params)
                response.raise_for_status()

                self.last_keepalive = datetime.now()
                logger.debug(f"Listen key keep-alive successful at {self.last_keepalive}")

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error during keep-alive: {e.response.status_code} - {e.response.text}")
                # Try to create a new listen key if keep-alive fails
                await self.create_listen_key()
            except Exception as e:
                logger.error(f"Error during keep-alive: {e}")
                # Try to create a new listen key if keep-alive fails
                await self.create_listen_key()

    async def close_listen_key(self):
        """
        Close the listen key
        """
        if not self.listen_key:
            return

        endpoint = "/api/v3/userDataStream"
        url = f"{self.base_url}{endpoint}"

        headers = {
            "X-MBX-APIKEY": self.api_key
        }

        params = {
            "listenKey": self.listen_key
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.delete(url, headers=headers, params=params)
                response.raise_for_status()

                logger.info(f"Closed listen key: {self.listen_key[:10]}...")
                self.listen_key = None

            except Exception as e:
                logger.error(f"Error closing listen key: {e}")

    async def _keepalive_loop(self):
        """
        Background task that sends keep-alive every 30 minutes
        """
        # Keep alive interval - 30 minutes (Binance requires 60 min, but we do 30 for safety)
        keepalive_interval = 30 * 60  # 30 minutes in seconds

        while self._running:
            try:
                # Wait for 30 minutes
                await asyncio.sleep(keepalive_interval)

                # Send keep-alive
                if self._running and self.listen_key:
                    await self.keepalive_listen_key()

            except asyncio.CancelledError:
                logger.info("Keep-alive loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in keep-alive loop: {e}")
                # Continue the loop even on error

    def get_websocket_url(self) -> Optional[str]:
        """
        Get the WebSocket URL with the listen key for user data stream
        """
        if not self.listen_key:
            return None

        if self.testnet:
            base_ws = "wss://testnet.binance.vision"
        else:
            # FIX: Remove port :9443 for mainnet
            base_ws = "wss://stream.binance.com"

        # FIX: Nautilus may add /ws internally, so we don't include it
        return f"{base_ws}/{self.listen_key}"

    def get_combined_streams_url(self, streams: list) -> str:
        """
        Get combined WebSocket URL for market data + user data streams

        Args:
            streams: List of market data streams (e.g., ['btcusdt@trade', 'ethusdt@depth'])

        Returns:
            Combined WebSocket URL
        """
        if self.testnet:
            base_ws = "wss://testnet.binance.vision"
        else:
            base_ws = "wss://stream.binance.com:9443"

        # Add listen key to streams if available
        if self.listen_key:
            streams = streams + [self.listen_key]

        # Create combined stream URL
        streams_param = "/".join(streams)
        return f"{base_ws}/stream?streams={streams_param}"


# Singleton instance
_listen_key_manager: Optional[BinanceListenKeyManager] = None


def get_listen_key_manager() -> BinanceListenKeyManager:
    """
    Get or create the global listen key manager instance
    """
    global _listen_key_manager

    if _listen_key_manager is None:
        api_key = os.getenv("BINANCE_API_KEY")
        api_secret = os.getenv("BINANCE_API_SECRET")
        testnet = os.getenv("BINANCE_TESTNET", "true").lower() == "true"

        if not api_key or not api_secret:
            raise ValueError("Binance API credentials not configured")

        _listen_key_manager = BinanceListenKeyManager(
            api_key=api_key,
            api_secret=api_secret,
            testnet=testnet
        )

    return _listen_key_manager
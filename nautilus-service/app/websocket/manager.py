"""
WebSocket Manager for Nautilus Trading Service
실시간 데이터 브로드캐스팅을 위한 WebSocket 관리
"""

from fastapi import WebSocket
from typing import Dict, List, Set, Any
import json
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    WebSocket 연결 관리 및 메시지 브로드캐스팅
    채널별로 구독자를 관리하여 효율적인 메시지 전송
    """

    def __init__(self):
        # 채널별 연결 관리
        # channel_name: Set[WebSocket]
        self._connections: Dict[str, Set[WebSocket]] = {
            "market_data": set(),
            "orders": set(),
            "positions": set(),
            "strategies": set(),
            "system": set()  # 시스템 알림용
        }

        # WebSocket별 채널 매핑 (역방향 조회용)
        self._websocket_channels: Dict[WebSocket, Set[str]] = {}

        # 연결 상태 추적
        self._active_connections = 0

    async def connect(self, websocket: WebSocket, channel: str = "system"):
        """
        WebSocket 연결 수락 및 채널 구독

        Args:
            websocket: WebSocket 연결
            channel: 구독할 채널 이름
        """
        await websocket.accept()

        # 채널 추가
        if channel not in self._connections:
            self._connections[channel] = set()

        self._connections[channel].add(websocket)

        # 역방향 매핑
        if websocket not in self._websocket_channels:
            self._websocket_channels[websocket] = set()
        self._websocket_channels[websocket].add(channel)

        self._active_connections += 1

        logger.info(f"WebSocket connected to channel: {channel}")

        # Welcome 메시지
        await self._send_personal(websocket, {
            "type": "connected",
            "channel": channel,
            "timestamp": datetime.now().isoformat(),
            "message": f"Connected to {channel} channel"
        })

    async def disconnect(self, websocket: WebSocket, channel: str = None):
        """
        WebSocket 연결 해제

        Args:
            websocket: WebSocket 연결
            channel: 특정 채널만 구독 해제 (None이면 모든 채널)
        """
        try:
            if channel:
                # 특정 채널만 구독 해제
                if channel in self._connections:
                    self._connections[channel].discard(websocket)

                if websocket in self._websocket_channels:
                    self._websocket_channels[websocket].discard(channel)
            else:
                # 모든 채널에서 제거
                for ch in self._connections:
                    self._connections[ch].discard(websocket)

                if websocket in self._websocket_channels:
                    del self._websocket_channels[websocket]

                self._active_connections = max(0, self._active_connections - 1)

            logger.info(f"WebSocket disconnected from channel: {channel or 'all'}")

        except Exception as e:
            logger.error(f"Error disconnecting websocket: {e}")

    async def disconnect_all(self):
        """모든 WebSocket 연결 종료"""
        all_websockets = list(self._websocket_channels.keys())

        for websocket in all_websockets:
            try:
                await websocket.close()
            except Exception as e:
                logger.error(f"Error closing websocket: {e}")

        self._connections.clear()
        self._websocket_channels.clear()
        self._active_connections = 0

        logger.info("All WebSocket connections closed")

    async def subscribe(self, websocket: WebSocket, channels: List[str]):
        """
        여러 채널 구독

        Args:
            websocket: WebSocket 연결
            channels: 구독할 채널 목록
        """
        for channel in channels:
            if channel not in self._connections:
                self._connections[channel] = set()

            self._connections[channel].add(websocket)

            if websocket not in self._websocket_channels:
                self._websocket_channels[websocket] = set()
            self._websocket_channels[websocket].add(channel)

        # 구독 확인 메시지
        await self._send_personal(websocket, {
            "type": "subscribed",
            "channels": channels,
            "timestamp": datetime.now().isoformat()
        })

    async def unsubscribe(self, websocket: WebSocket, channels: List[str]):
        """
        채널 구독 해제

        Args:
            websocket: WebSocket 연결
            channels: 구독 해제할 채널 목록
        """
        for channel in channels:
            if channel in self._connections:
                self._connections[channel].discard(websocket)

            if websocket in self._websocket_channels:
                self._websocket_channels[websocket].discard(channel)

        # 구독 해제 확인 메시지
        await self._send_personal(websocket, {
            "type": "unsubscribed",
            "channels": channels,
            "timestamp": datetime.now().isoformat()
        })

    async def broadcast(self, message: Dict[str, Any], channel: str = "system"):
        """
        특정 채널의 모든 구독자에게 메시지 브로드캐스트

        Args:
            message: 전송할 메시지 (dict)
            channel: 대상 채널
        """
        if channel not in self._connections:
            return

        # 메시지에 타임스탬프 추가
        if "timestamp" not in message:
            message["timestamp"] = datetime.now().isoformat()

        # 연결이 끊긴 WebSocket 추적
        disconnected = []

        # 모든 구독자에게 전송
        for websocket in self._connections[channel]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to websocket: {e}")
                disconnected.append(websocket)

        # 끊긴 연결 정리
        for websocket in disconnected:
            await self.disconnect(websocket)

    async def broadcast_to_all(self, message: Dict[str, Any]):
        """
        모든 채널의 모든 구독자에게 메시지 브로드캐스트

        Args:
            message: 전송할 메시지
        """
        for channel in self._connections:
            await self.broadcast(message, channel)

    async def send_to_websocket(self, websocket: WebSocket, message: Dict[str, Any]):
        """
        특정 WebSocket에 메시지 전송

        Args:
            websocket: 대상 WebSocket
            message: 전송할 메시지
        """
        try:
            await self._send_personal(websocket, message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            await self.disconnect(websocket)

    async def _send_personal(self, websocket: WebSocket, message: Dict[str, Any]):
        """개별 WebSocket에 메시지 전송 (내부용)"""
        if "timestamp" not in message:
            message["timestamp"] = datetime.now().isoformat()

        await websocket.send_json(message)

    def get_stats(self) -> Dict[str, Any]:
        """
        WebSocket 연결 통계 반환

        Returns:
            연결 통계 정보
        """
        channel_stats = {}
        for channel, connections in self._connections.items():
            channel_stats[channel] = len(connections)

        return {
            "active_connections": self._active_connections,
            "channels": channel_stats,
            "total_subscriptions": sum(channel_stats.values())
        }

    def get_channels_for_websocket(self, websocket: WebSocket) -> Set[str]:
        """
        특정 WebSocket이 구독 중인 채널 목록 반환

        Args:
            websocket: WebSocket 연결

        Returns:
            구독 중인 채널 목록
        """
        return self._websocket_channels.get(websocket, set())

    async def handle_client_message(self, websocket: WebSocket, message: str):
        """
        클라이언트로부터 받은 메시지 처리

        Args:
            websocket: WebSocket 연결
            message: 받은 메시지 (JSON 문자열)
        """
        try:
            data = json.loads(message)
            msg_type = data.get("type")

            if msg_type == "subscribe":
                channels = data.get("channels", [])
                await self.subscribe(websocket, channels)

            elif msg_type == "unsubscribe":
                channels = data.get("channels", [])
                await self.unsubscribe(websocket, channels)

            elif msg_type == "ping":
                await self._send_personal(websocket, {"type": "pong"})

            else:
                # Echo or custom handling
                logger.debug(f"Received message: {data}")

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON message: {e}")
            await self._send_personal(websocket, {
                "type": "error",
                "error": "Invalid JSON format"
            })
        except Exception as e:
            logger.error(f"Error handling client message: {e}")


# Global instance for easy access
ws_manager = WebSocketManager()
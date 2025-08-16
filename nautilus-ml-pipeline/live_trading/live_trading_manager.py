#!/usr/bin/env python3
"""
실제 자동매매를 위한 라이브 트레이딩 매니저
"""
import asyncio
import os
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional

from nautilus_trader.config import TradingNodeConfig, LiveDataEngineConfig, LiveExecEngineConfig
from nautilus_trader.config import LoggingConfig
from nautilus_trader.live.node import TradingNode
from nautilus_trader.adapters.binance.common.enums import BinanceAccountType
from nautilus_trader.adapters.binance.config import BinanceDataClientConfig, BinanceExecClientConfig
from nautilus_trader.adapters.binance.factories import BinanceLiveDataClientFactory, BinanceLiveExecClientFactory
from nautilus_trader.model.identifiers import TraderId
from nautilus_trader.config import InstrumentProviderConfig

logger = logging.getLogger(__name__)

class LiveTradingManager:
    """실제 거래를 위한 라이브 트레이딩 매니저"""
    
    def __init__(self):
        self.node: Optional[TradingNode] = None
        self.is_running = False
        self.trader_id = "AUTOBOT-001"
        
        # 한글 주석: 바이낸스 API 키 확인
        self.api_key = os.getenv('BINANCE_API_KEY')
        self.api_secret = os.getenv('BINANCE_API_SECRET')
        self.use_testnet = os.getenv('USE_BINANCE_TESTNET', 'true').lower() == 'true'
        
        if not self.api_key or not self.api_secret:
            logger.warning("바이낸스 API 키가 설정되지 않았습니다. 테스트넷 모드로 실행됩니다.")
            self.use_testnet = True

    def create_live_config(self) -> TradingNodeConfig:
        """라이브 트레이딩 노드 설정 생성"""
        
        # 한글 주석: 바이낸스 클라이언트 설정
        binance_venue = "BINANCE"
        
        config = TradingNodeConfig(
            trader_id=TraderId(self.trader_id),
            logging=LoggingConfig(log_level="INFO"),
            
            # 한글 주석: 데이터 클라이언트 설정 (실시간 시세)
            data_clients={
                binance_venue: BinanceDataClientConfig(
                    api_key=self.api_key,
                    api_secret=self.api_secret,
                    account_type=BinanceAccountType.SPOT,  # 현물 거래
                    base_url_http=None,
                    base_url_ws=None,
                    us=False,
                    testnet=self.use_testnet,  # 테스트넷 사용 여부
                    instrument_provider=InstrumentProviderConfig(load_all=True),
                    max_retries=3,
                    retry_delay_initial_ms=1_000,
                    retry_delay_max_ms=10_000,
                )
            },
            
            # 한글 주석: 실행 클라이언트 설정 (실제 주문)
            exec_clients={
                binance_venue: BinanceExecClientConfig(
                    api_key=self.api_key,
                    api_secret=self.api_secret,
                    account_type=BinanceAccountType.SPOT,
                    base_url_http=None,
                    base_url_ws=None,
                    us=False,
                    testnet=self.use_testnet,
                    instrument_provider=InstrumentProviderConfig(load_all=True),
                    max_retries=3,
                    retry_delay_initial_ms=1_000,
                    retry_delay_max_ms=10_000,
                )
            },
            
            # 한글 주석: 엔진 설정
            data_engine=LiveDataEngineConfig(
                time_bars_timestamp_on_close=False,
                validate_data_sequence=True,
            ),
            exec_engine=LiveExecEngineConfig(),
            
            # 한글 주석: 타임아웃 설정
            timeout_connection=30.0,
            timeout_reconciliation=10.0,
            timeout_portfolio=10.0,
            timeout_disconnection=10.0,
            timeout_post_stop=5.0,
        )
        
        return config

    async def start_live_trading(self, strategy_config: dict = None):
        """라이브 트레이딩 시작"""
        if self.is_running:
            logger.warning("라이브 트레이딩이 이미 실행 중입니다")
            return
        
        try:
            logger.info(f"라이브 트레이딩 시작... (테스트넷: {self.use_testnet})")
            
            # 한글 주석: 노드 설정 및 생성
            config = self.create_live_config()
            self.node = TradingNode(config=config)
            
            # 한글 주석: 바이낸스 클라이언트 팩토리 등록
            self.node.add_data_client_factory("BINANCE", BinanceLiveDataClientFactory)
            self.node.add_exec_client_factory("BINANCE", BinanceLiveExecClientFactory)
            
            # 한글 주석: 전략 추가 (나중에 ML 전략으로 교체)
            # strategy = self._create_default_strategy(strategy_config or {})
            # self.node.trader.add_strategy(strategy)
            
            # 한글 주석: 노드 빌드 및 실행
            self.node.build()
            self.is_running = True
            
            logger.info("라이브 트레이딩 노드가 성공적으로 시작되었습니다")
            
        except Exception as e:
            logger.error(f"라이브 트레이딩 시작 실패: {e}")
            self.is_running = False
            raise

    async def stop_live_trading(self):
        """라이브 트레이딩 정지"""
        if not self.is_running or not self.node:
            logger.warning("라이브 트레이딩이 실행 중이 아닙니다")
            return
        
        try:
            logger.info("라이브 트레이딩 정지 중...")
            
            if self.node:
                self.node.stop()
                self.node.dispose()
                self.node = None
            
            self.is_running = False
            logger.info("라이브 트레이딩이 성공적으로 정지되었습니다")
            
        except Exception as e:
            logger.error(f"라이브 트레이딩 정지 실패: {e}")
            raise

    def get_trading_status(self) -> dict:
        """현재 거래 상태 조회"""
        if not self.node or not self.is_running:
            return {
                'status': 'stopped',
                'message': '라이브 트레이딩이 정지된 상태입니다',
                'testnet': self.use_testnet
            }
        
        try:
            # 한글 주석: 포트폴리오 및 포지션 정보 조회
            portfolio = self.node.trader.portfolio
            
            return {
                'status': 'running',
                'trader_id': self.trader_id,
                'testnet': self.use_testnet,
                'account_info': {
                    'base_currency': str(portfolio.base_currency) if portfolio.base_currency else None,
                    'total_balances': len(portfolio.balances_total()),
                    'open_positions': len(portfolio.positions_open()),
                    'open_orders': len(portfolio.orders_open()),
                },
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"거래 상태 조회 실패: {e}")
            return {
                'status': 'error',
                'message': f'상태 조회 오류: {str(e)}',
                'testnet': self.use_testnet
            }

    def get_portfolio_performance(self) -> dict:
        """포트폴리오 성과 조회"""
        if not self.node or not self.is_running:
            return {'error': '라이브 트레이딩이 실행 중이 아닙니다'}
        
        try:
            portfolio = self.node.trader.portfolio
            
            # 한글 주석: 잔고 및 포지션 정보
            balances = portfolio.balances_total()
            positions = portfolio.positions()
            orders = portfolio.orders()
            
            total_value = sum(balance.total.as_double() for balance in balances.values())
            
            return {
                'total_account_value': total_value,
                'balances': {
                    str(currency): {
                        'total': balance.total.as_double(),
                        'free': balance.free.as_double(),
                        'locked': balance.locked.as_double(),
                    }
                    for currency, balance in balances.items()
                },
                'positions_count': len(positions),
                'open_positions_count': len([p for p in positions if p.is_open]),
                'orders_count': len(orders),
                'open_orders_count': len([o for o in orders if o.is_open]),
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"포트폴리오 성과 조회 실패: {e}")
            return {'error': f'성과 조회 오류: {str(e)}'}

    async def execute_ml_signal(self, signal: dict):
        """ML 신호에 따른 주문 실행"""
        if not self.node or not self.is_running:
            logger.warning("라이브 트레이딩이 실행 중이 아니어서 신호를 실행할 수 없습니다")
            return False
        
        try:
            # 한글 주석: ML 신호를 실제 주문으로 변환
            symbol = signal.get('symbol', 'BTCUSDT')
            side = signal.get('side', 'BUY')  # BUY or SELL
            quantity = signal.get('quantity', 0.001)
            confidence = signal.get('confidence', 0.5)
            
            logger.info(f"ML 신호 실행: {symbol} {side} {quantity} (신뢰도: {confidence})")
            
            # 한글 주석: 실제 주문 실행 로직 (나중에 구현)
            # order = MarketOrder(...)
            # self.node.trader.submit_order(order)
            
            return True
            
        except Exception as e:
            logger.error(f"ML 신호 실행 실패: {e}")
            return False

# 전역 라이브 트레이딩 매니저 인스턴스
live_trading_manager = LiveTradingManager()

if __name__ == "__main__":
    # 테스트 실행
    async def test_live_trading():
        try:
            await live_trading_manager.start_live_trading()
            
            # 5초 대기
            await asyncio.sleep(5)
            
            status = live_trading_manager.get_trading_status()
            print("거래 상태:", status)
            
            performance = live_trading_manager.get_portfolio_performance()
            print("포트폴리오 성과:", performance)
            
        finally:
            await live_trading_manager.stop_live_trading()
    
    asyncio.run(test_live_trading())

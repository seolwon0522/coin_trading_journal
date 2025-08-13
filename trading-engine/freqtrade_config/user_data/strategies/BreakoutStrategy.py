"""
Breakout 전략
가격이 특정 레벨을 돌파할 때 매수하는 전략
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from freqtrade.strategy import IStrategy, IntParameter
from freqtrade.strategy.parameters import CategoricalParameter
from pandas import DataFrame
import pandas_ta as ta
import numpy as np

logger = logging.getLogger(__name__)

class BreakoutStrategy(IStrategy):
    """
    Breakout 전략 클래스
    가격이 저항선이나 지지선을 돌파할 때 매수하는 전략
    """
    
    # 전략 파라미터
    INTERFACE_VERSION = 3
    
    # 최소 ROI 테이블
    minimal_roi = {
        "0": 0.05,      # 5분 후 5% 수익 시 매도
        "30": 0.03,     # 30분 후 3% 수익 시 매도
        "60": 0.02,     # 1시간 후 2% 수익 시 매도
        "120": 0.01     # 2시간 후 1% 수익 시 매도
    }
    
    # 손절 설정
    stoploss = -0.10  # 10% 손실 시 손절
    
    # 타임프레임 설정
    timeframe = '5m'
    
    # 전략 파라미터
    lookback_period = IntParameter(10, 50, default=20, space="buy")
    breakout_threshold = IntParameter(1, 5, default=2, space="buy")
    volume_threshold = IntParameter(100, 1000, default=500, space="buy")
    
    # 매수/매도 조건 설정
    use_exit_signal = True
    exit_profit_only = False
    ignore_roi_if_entry_signal = False
    
    # 코인별 설정
    process_only_new_candles = True
    use_exit_signal = True
    can_short = False
    
    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """
        기술적 지표 계산
        """
        # 볼린저 밴드 계산
        bollinger = ta.bbands(dataframe['close'], length=20, std=2)
        dataframe['bb_upperband'] = bollinger['BBU_20_2.0']
        dataframe['bb_middleband'] = bollinger['BBM_20_2.0']
        dataframe['bb_lowerband'] = bollinger['BBL_20_2.0']
        dataframe['bb_percent'] = bollinger['BBP_20_2.0']
        
        # RSI 계산
        dataframe['rsi'] = ta.rsi(dataframe['close'], length=14)
        
        # 이동평균선 계산
        dataframe['sma_20'] = ta.sma(dataframe['close'], length=20)
        dataframe['sma_50'] = ta.sma(dataframe['close'], length=50)
        
        # 거래량 이동평균
        dataframe['volume_sma'] = ta.sma(dataframe['volume'], length=20)
        
        # 고점/저점 계산
        dataframe['high_20'] = dataframe['high'].rolling(window=20).max()
        dataframe['low_20'] = dataframe['low'].rolling(window=20).min()
        
        # 돌파 레벨 계산
        dataframe['breakout_level'] = dataframe['high_20'] * (1 + self.breakout_threshold.value / 100)
        
        return dataframe
    
    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """
        매수 신호 생성
        """
        conditions = []
        
        # 조건 1: 가격이 볼린저 밴드 상단을 돌파
        conditions.append(dataframe['close'] > dataframe['bb_upperband'])
        
        # 조건 2: RSI가 과매수 구간이 아님 (70 미만)
        conditions.append(dataframe['rsi'] < 70)
        
        # 조건 3: 거래량이 평균보다 높음
        conditions.append(dataframe['volume'] > dataframe['volume_sma'] * self.volume_threshold.value / 100)
        
        # 조건 4: 단기 이동평균이 장기 이동평균보다 높음
        conditions.append(dataframe['sma_20'] > dataframe['sma_50'])
        
        # 조건 5: 가격이 최근 고점을 돌파
        conditions.append(dataframe['close'] > dataframe['breakout_level'])
        
        if conditions:
            dataframe.loc[
                reduce(lambda x, y: x & y, conditions),
                'enter_long'] = 1
        
        return dataframe
    
    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        """
        매도 신호 생성
        """
        conditions = []
        
        # 조건 1: RSI가 과매수 구간 (80 이상)
        conditions.append(dataframe['rsi'] > 80)
        
        # 조건 2: 가격이 볼린저 밴드 하단 아래로 떨어짐
        conditions.append(dataframe['close'] < dataframe['bb_lowerband'])
        
        # 조건 3: 단기 이동평균이 장기 이동평균보다 낮아짐
        conditions.append(dataframe['sma_20'] < dataframe['sma_50'])
        
        if conditions:
            dataframe.loc[
                reduce(lambda x, y: x & y, conditions),
                'exit_long'] = 1
        
        return dataframe
    
    def custom_stoploss(self, pair: str, trade: 'Trade', current_time: datetime,
                       current_rate: float, current_profit: float, **kwargs) -> float:
        """
        동적 손절 설정
        """
        # 수익이 5% 이상일 때 손절을 2%로 조정
        if current_profit > 0.05:
            return -0.02
        
        # 수익이 2% 이상일 때 손절을 5%로 조정
        if current_profit > 0.02:
            return -0.05
        
        # 기본 손절 -10%
        return -0.10
    
    def custom_entry_price(self, pair: str, current_time: datetime, proposed_rate: float,
                          entry_tag: Optional[str], side: str, **kwargs) -> float:
        """
        커스텀 진입 가격 설정
        """
        # 현재가보다 0.1% 높은 가격으로 진입
        return proposed_rate * 1.001
    
    def custom_exit(self, pair: str, trade: 'Trade', current_time: datetime, current_rate: float,
                   current_profit: float, **kwargs) -> Optional[str]:
        """
        커스텀 매도 조건
        """
        # 보유 시간이 4시간을 초과하면 매도
        if (current_time - trade.open_date_utc).total_seconds() > 14400:
            return "timeout_exit"
        
        return None 
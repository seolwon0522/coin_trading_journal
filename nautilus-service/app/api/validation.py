"""
전략 파라미터 검증 모듈

Pydantic 모델을 사용하여 각 전략의 파라미터를 검증하고,
한글 에러 메시지를 제공합니다.
"""

from decimal import Decimal
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

# ==================== Common Parameters ====================

class CommonStrategyParams(BaseModel):
    """모든 전략에 공통으로 적용되는 파라미터"""
    
    trade_size: Decimal = Field(
        default=Decimal("0.01"),
        ge=Decimal("0.001"),
        le=Decimal("100.0"),
        description="거래 크기 (최소: 0.001, 최대: 100)"
    )
    
    max_positions: int = Field(
        default=1,
        ge=1,
        le=10,
        description="최대 포지션 개수 (1-10)"
    )
    
    stop_loss_pct: Optional[float] = Field(
        default=0.02,
        ge=0.001,
        le=0.5,
        description="손절매 비율 (0.1% - 50%)"
    )
    
    take_profit_pct: Optional[float] = Field(
        default=0.03,
        ge=0.001,
        le=1.0,
        description="익절 비율 (0.1% - 100%)"
    )

# ==================== EMA Cross Strategy ====================

class EMACrossParams(BaseModel):
    """EMA Cross 전략 파라미터"""
    
    fast_period: int = Field(
        default=10,
        ge=3,
        le=50,
        description="빠른 EMA 기간 (3-50)"
    )
    
    slow_period: int = Field(
        default=20,
        ge=10,
        le=200,
        description="느린 EMA 기간 (10-200)"
    )
    
    trade_size: Decimal = Field(
        default=Decimal("0.01"),
        ge=Decimal("0.001"),
        le=Decimal("100.0"),
        description="거래 크기"
    )
    
    max_positions: int = Field(default=1, ge=1, le=10)
    stop_loss_pct: float = Field(default=0.02, ge=0.001, le=0.5)
    take_profit_pct: float = Field(default=0.03, ge=0.001, le=1.0)
    
    @field_validator('slow_period')
    @classmethod
    def slow_must_be_greater_than_fast(cls, v: int, info) -> int:
        fast = info.data.get('fast_period')
        if fast is not None and v <= fast:
            raise ValueError(
                f'느린 EMA 기간({v})은 빠른 EMA 기간({fast})보다 커야 합니다.'
            )
        return v
    
    @field_validator('take_profit_pct')
    @classmethod
    def take_profit_must_be_greater_than_stop_loss(cls, v: float, info) -> float:
        stop_loss = info.data.get('stop_loss_pct')
        if stop_loss is not None and v <= stop_loss:
            raise ValueError(
                f'익절 비율({v:.1%})은 손절 비율({stop_loss:.1%})보다 커야 합니다.'
            )
        return v

# ==================== Grid Trading Strategy ====================

class GridTradingParams(BaseModel):
    """Grid Trading 전략 파라미터"""
    
    grid_levels: int = Field(
        default=10,
        ge=3,
        le=50,
        description="그리드 레벨 개수 (3-50)"
    )
    
    grid_spacing: float = Field(
        default=0.01,
        ge=0.001,
        le=0.1,
        description="그리드 간격 비율 (0.1% - 10%)"
    )
    
    position_size: Decimal = Field(
        default=Decimal("0.01"),
        ge=Decimal("0.001"),
        le=Decimal("10.0"),
        description="각 그리드별 포지션 크기"
    )
    
    max_positions: int = Field(default=10, ge=1, le=50)
    
    upper_price: Optional[float] = Field(
        default=None,
        gt=0,
        description="그리드 상단 가격 (선택)"
    )
    
    lower_price: Optional[float] = Field(
        default=None,
        gt=0,
        description="그리드 하단 가격 (선택)"
    )
    
    @model_validator(mode='after')
    def validate_price_range(self):
        if self.upper_price and self.lower_price:
            if self.upper_price <= self.lower_price:
                raise ValueError(
                    f'상단 가격({self.upper_price})은 하단 가격({self.lower_price})보다 높아야 합니다.'
                )
        return self

# ==================== RSI Strategy ====================

class RSIParams(BaseModel):
    """RSI 전략 파라미터"""
    
    rsi_period: int = Field(
        default=14,
        ge=5,
        le=50,
        description="RSI 계산 기간 (5-50)"
    )
    
    rsi_overbought: int = Field(
        default=70,
        ge=50,
        le=90,
        description="과매수 기준선 (50-90)"
    )
    
    rsi_oversold: int = Field(
        default=30,
        ge=10,
        le=50,
        description="과매도 기준선 (10-50)"
    )
    
    trade_size: Decimal = Field(default=Decimal("0.01"))
    max_positions: int = Field(default=1, ge=1, le=10)
    
    @field_validator('rsi_overbought')
    @classmethod
    def overbought_must_be_greater_than_oversold(cls, v: int, info) -> int:
        oversold = info.data.get('rsi_oversold')
        if oversold is not None and v <= oversold:
            raise ValueError(
                f'과매수 기준({v})은 과매도 기준({oversold})보다 높아야 합니다.'
            )
        if v - (oversold or 30) < 10:
            raise ValueError(
                f'과매수와 과매도 기준 차이는 최소 10 이상이어야 합니다.'
            )
        return v

# ==================== Bollinger Bands Strategy ====================

class BollingerBandsParams(BaseModel):
    """Bollinger Bands 전략 파라미터"""
    
    bb_period: int = Field(
        default=20,
        ge=5,
        le=100,
        description="볼린저 밴드 기간 (5-100)"
    )
    
    bb_std: float = Field(
        default=2.0,
        ge=1.0,
        le=4.0,
        description="표준편차 배수 (1.0-4.0)"
    )
    
    trade_size: Decimal = Field(default=Decimal("0.01"))
    max_positions: int = Field(default=1, ge=1, le=10)

# ==================== Momentum Strategy ====================

class MomentumParams(BaseModel):
    """Momentum 전략 파라미터"""
    
    lookback_period: int = Field(
        default=20,
        ge=5,
        le=100,
        description="모멘텀 계산 기간 (5-100)"
    )
    
    momentum_threshold: float = Field(
        default=0.02,
        ge=0.001,
        le=0.2,
        description="모멘텀 임계값 (0.1% - 20%)"
    )
    
    trade_size: Decimal = Field(default=Decimal("0.01"))
    max_positions: int = Field(default=1, ge=1, le=10)

# ==================== Orderbook Imbalance Strategy ====================

class OrderbookImbalanceParams(BaseModel):
    """Orderbook Imbalance 전략 파라미터"""
    
    imbalance_threshold: float = Field(
        default=0.3,
        ge=0.1,
        le=0.9,
        description="호가 불균형 임계값 (10% - 90%)"
    )
    
    order_levels: int = Field(
        default=5,
        ge=1,
        le=20,
        description="주문 레벨 개수 (1-20)"
    )
    
    spread_multiplier: float = Field(
        default=1.5,
        ge=1.0,
        le=5.0,
        description="스프레드 배수 (1.0-5.0)"
    )
    
    position_size: Decimal = Field(
        default=Decimal("0.01"),
        ge=Decimal("0.001"),
        le=Decimal("10.0")
    )
    
    max_positions: int = Field(default=5, ge=1, le=20)
    min_spread_bps: int = Field(
        default=10,
        ge=1,
        le=100,
        description="최소 스프레드 (basis points)"
    )

# ==================== Validator Registry ====================

STRATEGY_VALIDATORS: Dict[str, type[BaseModel]] = {
    "ema_cross": EMACrossParams,
    "grid": GridTradingParams,
    "rsi": RSIParams,
    "bollinger_bands": BollingerBandsParams,
    "momentum": MomentumParams,
    "orderbook_imbalance": OrderbookImbalanceParams,
}

# ==================== Validation Function ====================

def validate_strategy_params(strategy_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    전략 파라미터를 검증하고 정제된 파라미터를 반환합니다.
    
    Args:
        strategy_type: 전략 타입 (ema_cross, grid, rsi 등)
        params: 검증할 파라미터 딕셔너리
    
    Returns:
        검증 및 정제된 파라미터 딕셔너리
    
    Raises:
        ValueError: 전략 타입이 유효하지 않을 때
        ValidationError: 파라미터 검증 실패 시
    """
    if strategy_type not in STRATEGY_VALIDATORS:
        raise ValueError(
            f"지원하지 않는 전략 타입입니다: {strategy_type}\n"
            f"사용 가능한 전략: {', '.join(STRATEGY_VALIDATORS.keys())}"
        )
    
    validator_class = STRATEGY_VALIDATORS[strategy_type]
    
    # Pydantic 검증
    validated = validator_class(**params)
    
    # Dict로 변환 (Decimal은 str로 변환)
    result = validated.model_dump()
    
    # Decimal 값을 문자열로 변환 (JSON 직렬화를 위해)
    for key, value in result.items():
        if isinstance(value, Decimal):
            result[key] = str(value)
    
    return result


def get_strategy_schema(strategy_type: str) -> Dict[str, Any]:
    """
    전략의 JSON Schema를 반환합니다.
    Frontend에서 동적 폼 생성에 사용할 수 있습니다.
    
    Args:
        strategy_type: 전략 타입
    
    Returns:
        JSON Schema 딕셔너리
    """
    if strategy_type not in STRATEGY_VALIDATORS:
        raise ValueError(f"지원하지 않는 전략 타입: {strategy_type}")
    
    validator_class = STRATEGY_VALIDATORS[strategy_type]
    schema = validator_class.model_json_schema()
    
    # 한글 설명 추가
    _add_korean_descriptions(strategy_type, schema)
    
    return schema


def _add_korean_descriptions(strategy_type: str, schema: Dict[str, Any]) -> None:
    """JSON Schema에 한글 설명 추가"""
    
    descriptions_kr = {
        "ema_cross": {
            "fast_period": "빠른 EMA 기간 (작을수록 민감)",
            "slow_period": "느린 EMA 기간 (클수록 안정적)",
            "trade_size": "한 번에 거래할 수량",
            "stop_loss_pct": "손절매 비율 (2% = 0.02)",
            "take_profit_pct": "익절 비율 (3% = 0.03)",
        },
        "grid": {
            "grid_levels": "그리드 레벨 개수 (많을수록 촘촘)",
            "grid_spacing": "그리드 간격 (1% = 0.01)",
            "position_size": "각 그리드별 주문 크기",
            "upper_price": "그리드 상단 가격 (없으면 자동)",
            "lower_price": "그리드 하단 가격 (없으면 자동)",
        },
        "rsi": {
            "rsi_period": "RSI 계산 기간 (14가 표준)",
            "rsi_overbought": "과매수 기준 (70 이상)",
            "rsi_oversold": "과매도 기준 (30 이하)",
        },
        "bollinger_bands": {
            "bb_period": "볼린저 밴드 기간",
            "bb_std": "표준편차 배수 (2.0이 표준)",
        },
        "momentum": {
            "lookback_period": "모멘텀 계산 기간",
            "momentum_threshold": "모멘텀 임계값",
        },
        "orderbook_imbalance": {
            "imbalance_threshold": "호가 불균형 임계값 (30% = 0.3)",
            "order_levels": "동시 주문 레벨 개수",
            "spread_multiplier": "스프레드 배수",
            "position_size": "주문 크기",
            "min_spread_bps": "최소 스프레드 (10 bps = 0.1%)",
        },
    }
    
    if strategy_type in descriptions_kr:
        props = schema.get("properties", {})
        for key, desc_kr in descriptions_kr[strategy_type].items():
            if key in props:
                props[key]["description_kr"] = desc_kr


# ==================== Error Message Translator ====================

def translate_validation_error(error: Exception) -> str:
    """
    Pydantic ValidationError를 한글 메시지로 변환
    
    Args:
        error: Pydantic ValidationError
    
    Returns:
        한글 에러 메시지
    """
    from pydantic import ValidationError
    
    if not isinstance(error, ValidationError):
        return str(error)
    
    errors = error.errors()
    messages = []
    
    for err in errors:
        field = err['loc'][0] if err['loc'] else '알 수 없는 필드'
        msg_type = err['type']
        
        # 필드명 한글화
        field_names_kr = {
            'fast_period': '빠른 EMA 기간',
            'slow_period': '느린 EMA 기간',
            'trade_size': '거래 크기',
            'max_positions': '최대 포지션',
            'stop_loss_pct': '손절매 비율',
            'take_profit_pct': '익절 비율',
            'grid_levels': '그리드 레벨',
            'grid_spacing': '그리드 간격',
            'position_size': '포지션 크기',
            'rsi_period': 'RSI 기간',
            'rsi_overbought': '과매수 기준',
            'rsi_oversold': '과매도 기준',
            'bb_period': '볼린저 밴드 기간',
            'bb_std': '표준편차 배수',
            'lookback_period': '모멘텀 기간',
            'momentum_threshold': '모멘텀 임계값',
            'imbalance_threshold': '불균형 임계값',
            'order_levels': '주문 레벨',
            'spread_multiplier': '스프레드 배수',
            'min_spread_bps': '최소 스프레드',
        }
        
        field_kr = field_names_kr.get(field, field)
        
        # 에러 타입별 메시지
        if msg_type == 'greater_than_equal':
            min_val = err['ctx'].get('ge', '?')
            messages.append(f"[{field_kr}] {min_val} 이상이어야 합니다.")
        
        elif msg_type == 'less_than_equal':
            max_val = err['ctx'].get('le', '?')
            messages.append(f"[{field_kr}] {max_val} 이하여야 합니다.")
        
        elif msg_type == 'greater_than':
            min_val = err['ctx'].get('gt', '?')
            messages.append(f"[{field_kr}] {min_val}보다 커야 합니다.")
        
        elif msg_type == 'less_than':
            max_val = err['ctx'].get('lt', '?')
            messages.append(f"[{field_kr}] {max_val}보다 작아야 합니다.")
        
        elif msg_type == 'value_error':
            messages.append(f"[{field_kr}] {err['msg']}")
        
        elif msg_type == 'missing':
            messages.append(f"[{field_kr}] 필수 파라미터입니다.")
        
        elif msg_type in ['int_parsing', 'float_parsing', 'decimal_parsing']:
            messages.append(f"[{field_kr}] 올바른 숫자 형식이 아닙니다.")
        
        else:
            messages.append(f"[{field_kr}] {err['msg']}")
    
    return '\n'.join(messages)


# ==================== Validation Examples ====================

def get_validation_examples() -> Dict[str, Dict[str, Any]]:
    """각 전략별 검증 예시 파라미터"""
    return {
        "ema_cross": {
            "valid": {
                "fast_period": 10,
                "slow_period": 20,
                "trade_size": "0.01",
                "stop_loss_pct": 0.02,
                "take_profit_pct": 0.03,
            },
            "invalid": [
                {
                    "params": {"fast_period": 20, "slow_period": 10},
                    "error": "느린 EMA 기간(10)은 빠른 EMA 기간(20)보다 커야 합니다."
                },
                {
                    "params": {"fast_period": 2, "slow_period": 20},
                    "error": "[빠른 EMA 기간] 3 이상이어야 합니다."
                },
                {
                    "params": {"take_profit_pct": 0.01, "stop_loss_pct": 0.02},
                    "error": "익절 비율(1.0%)은 손절 비율(2.0%)보다 커야 합니다."
                },
            ]
        },
        "grid": {
            "valid": {
                "grid_levels": 10,
                "grid_spacing": 0.01,
                "position_size": "0.01",
            },
            "invalid": [
                {
                    "params": {"grid_levels": 2},
                    "error": "[그리드 레벨] 3 이상이어야 합니다."
                },
                {
                    "params": {"grid_spacing": 0.15},
                    "error": "[그리드 간격] 0.1 이하여야 합니다."
                },
            ]
        },
        "rsi": {
            "valid": {
                "rsi_period": 14,
                "rsi_overbought": 70,
                "rsi_oversold": 30,
            },
            "invalid": [
                {
                    "params": {"rsi_overbought": 40, "rsi_oversold": 30},
                    "error": "과매수와 과매도 기준 차이는 최소 10 이상이어야 합니다."
                },
            ]
        },
    }

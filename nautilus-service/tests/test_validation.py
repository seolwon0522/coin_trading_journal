"""
전략 파라미터 검증 테스트
"""

import pytest
from pydantic import ValidationError

from app.api.validation import (
    validate_strategy_params,
    translate_validation_error,
    get_strategy_schema,
    EMACrossParams,
    GridTradingParams,
    RSIParams,
)


class TestEMACrossValidation:
    """EMA Cross 전략 검증 테스트"""
    
    def test_valid_params(self):
        """정상 파라미터 검증"""
        params = {
            "fast_period": 10,
            "slow_period": 20,
            "trade_size": "0.01",
            "stop_loss_pct": 0.02,
            "take_profit_pct": 0.03,
        }
        
        result = validate_strategy_params("ema_cross", params)
        
        assert result["fast_period"] == 10
        assert result["slow_period"] == 20
        assert result["trade_size"] == "0.01"
    
    def test_slow_period_must_be_greater_than_fast(self):
        """느린 EMA가 빠른 EMA보다 커야 함"""
        params = {
            "fast_period": 20,
            "slow_period": 10,  # 잘못됨
        }
        
        with pytest.raises(ValidationError) as exc_info:
            EMACrossParams(**params)
        
        error_msg = str(exc_info.value)
        assert "느린 EMA 기간" in error_msg or "slow_period" in error_msg
    
    def test_take_profit_must_be_greater_than_stop_loss(self):
        """익절이 손절보다 커야 함"""
        params = {
            "fast_period": 10,
            "slow_period": 20,
            "stop_loss_pct": 0.03,
            "take_profit_pct": 0.02,  # 잘못됨
        }
        
        with pytest.raises(ValidationError):
            EMACrossParams(**params)
    
    def test_fast_period_out_of_range(self):
        """빠른 EMA 기간 범위 초과"""
        params = {
            "fast_period": 2,  # 최소 3
            "slow_period": 20,
        }
        
        with pytest.raises(ValidationError) as exc_info:
            EMACrossParams(**params)
        
        errors = exc_info.value.errors()
        assert any(e["loc"][0] == "fast_period" for e in errors)
    
    def test_default_values(self):
        """기본값 적용"""
        params = {}
        result = EMACrossParams(**params)
        
        assert result.fast_period == 10
        assert result.slow_period == 20
        assert result.trade_size == 0.01


class TestGridTradingValidation:
    """Grid Trading 전략 검증 테스트"""
    
    def test_valid_params(self):
        """정상 파라미터 검증"""
        params = {
            "grid_levels": 10,
            "grid_spacing": 0.01,
            "position_size": "0.01",
        }
        
        result = validate_strategy_params("grid", params)
        
        assert result["grid_levels"] == 10
        assert result["grid_spacing"] == 0.01
    
    def test_price_range_validation(self):
        """가격 범위 검증"""
        params = {
            "grid_levels": 10,
            "grid_spacing": 0.01,
            "upper_price": 40000.0,
            "lower_price": 50000.0,  # 잘못됨 (하단이 상단보다 높음)
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GridTradingParams(**params)
        
        error_msg = str(exc_info.value)
        assert "상단" in error_msg or "lower" in error_msg


class TestRSIValidation:
    """RSI 전략 검증 테스트"""
    
    def test_valid_params(self):
        """정상 파라미터 검증"""
        params = {
            "rsi_period": 14,
            "rsi_overbought": 70,
            "rsi_oversold": 30,
        }
        
        result = validate_strategy_params("rsi", params)
        
        assert result["rsi_period"] == 14
        assert result["rsi_overbought"] == 70
    
    def test_overbought_oversold_validation(self):
        """과매수/과매도 검증"""
        params = {
            "rsi_period": 14,
            "rsi_overbought": 40,  # 잘못됨 (과매도보다 작음)
            "rsi_oversold": 30,
        }
        
        with pytest.raises(ValidationError):
            RSIParams(**params)
    
    def test_minimum_difference(self):
        """과매수/과매도 최소 차이"""
        params = {
            "rsi_period": 14,
            "rsi_overbought": 35,  # 차이 5 (최소 10 필요)
            "rsi_oversold": 30,
        }
        
        with pytest.raises(ValidationError) as exc_info:
            RSIParams(**params)
        
        error_msg = str(exc_info.value)
        assert "10" in error_msg


class TestValidationHelpers:
    """헬퍼 함수 테스트"""
    
    def test_get_strategy_schema(self):
        """스키마 조회"""
        schema = get_strategy_schema("ema_cross")
        
        assert "properties" in schema
        assert "fast_period" in schema["properties"]
        assert "slow_period" in schema["properties"]
    
    def test_translate_validation_error(self):
        """에러 메시지 번역"""
        try:
            EMACrossParams(fast_period=2, slow_period=20)
        except ValidationError as e:
            msg = translate_validation_error(e)
            assert "빠른 EMA 기간" in msg or "이상" in msg
    
    def test_unsupported_strategy_type(self):
        """지원하지 않는 전략 타입"""
        with pytest.raises(ValueError) as exc_info:
            validate_strategy_params("unknown_strategy", {})
        
        error_msg = str(exc_info.value)
        assert "지원하지 않는" in error_msg


class TestIntegration:
    """통합 테스트"""
    
    def test_full_validation_flow(self):
        """전체 검증 플로우"""
        # 1. 유효한 파라미터
        valid_params = {
            "fast_period": 12,
            "slow_period": 26,
            "trade_size": "0.05",
            "stop_loss_pct": 0.015,
            "take_profit_pct": 0.04,
        }
        
        result = validate_strategy_params("ema_cross", valid_params)
        
        assert result["fast_period"] == 12
        assert result["slow_period"] == 26
        assert float(result["trade_size"]) == 0.05
    
    def test_partial_params_with_defaults(self):
        """일부 파라미터만 제공 (나머지는 기본값)"""
        params = {
            "fast_period": 15,
            "slow_period": 30,
        }
        
        result = validate_strategy_params("ema_cross", params)
        
        assert result["fast_period"] == 15
        assert result["slow_period"] == 30
        # 기본값 확인
        assert float(result["trade_size"]) == 0.01
        assert result["max_positions"] == 1
    
    def test_all_strategy_types(self):
        """모든 전략 타입 검증"""
        test_cases = [
            ("ema_cross", {"fast_period": 10, "slow_period": 20}),
            ("grid", {"grid_levels": 10, "grid_spacing": 0.01}),
            ("rsi", {"rsi_period": 14, "rsi_overbought": 70, "rsi_oversold": 30}),
            ("bollinger_bands", {"bb_period": 20, "bb_std": 2.0}),
            ("momentum", {"lookback_period": 20, "momentum_threshold": 0.02}),
            ("orderbook_imbalance", {"imbalance_threshold": 0.3, "order_levels": 5}),
        ]
        
        for strategy_type, params in test_cases:
            result = validate_strategy_params(strategy_type, params)
            assert result is not None
            print(f"✓ {strategy_type} validation passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

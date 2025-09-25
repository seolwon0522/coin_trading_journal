"""
Custom Exceptions for Nautilus Trading Service
"""
from typing import Optional, Dict, Any


class NautilusServiceError(Exception):
    """Base exception for Nautilus Service"""
    def __init__(self, message: str, code: str = "NAUTILUS_ERROR", details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)


class StrategyError(NautilusServiceError):
    """Strategy related errors"""
    def __init__(self, message: str, strategy_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, code="STRATEGY_ERROR", details=details)
        self.strategy_id = strategy_id


class StrategyNotFoundError(StrategyError):
    """Strategy not found error"""
    def __init__(self, strategy_id: str):
        super().__init__(
            message=f"Strategy {strategy_id} not found",
            strategy_id=strategy_id
        )
        self.code = "STRATEGY_NOT_FOUND"


class StrategyAlreadyExistsError(StrategyError):
    """Strategy already exists error"""
    def __init__(self, strategy_id: str):
        super().__init__(
            message=f"Strategy {strategy_id} already exists",
            strategy_id=strategy_id
        )
        self.code = "STRATEGY_ALREADY_EXISTS"


class StrategyNotRunningError(StrategyError):
    """Strategy not running error"""
    def __init__(self, strategy_id: str):
        super().__init__(
            message=f"Strategy {strategy_id} is not running",
            strategy_id=strategy_id
        )
        self.code = "STRATEGY_NOT_RUNNING"


class MaxStrategiesReachedError(StrategyError):
    """Maximum strategies reached error"""
    def __init__(self, max_strategies: int):
        super().__init__(
            message=f"Maximum number of strategies ({max_strategies}) reached",
            details={"max_strategies": max_strategies}
        )
        self.code = "MAX_STRATEGIES_REACHED"


class InvalidParametersError(NautilusServiceError):
    """Invalid parameters error"""
    def __init__(self, message: str, parameters: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="INVALID_PARAMETERS",
            details={"invalid_parameters": parameters} if parameters else {}
        )


class BinanceConnectionError(NautilusServiceError):
    """Binance connection error"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="BINANCE_CONNECTION_ERROR",
            details=details
        )


class InsufficientBalanceError(NautilusServiceError):
    """Insufficient balance error"""
    def __init__(self, required: float, available: float):
        super().__init__(
            message=f"Insufficient balance. Required: {required}, Available: {available}",
            code="INSUFFICIENT_BALANCE",
            details={"required": required, "available": available}
        )


class RiskLimitExceededError(NautilusServiceError):
    """Risk limit exceeded error"""
    def __init__(self, message: str, current_exposure: float, max_exposure: float):
        super().__init__(
            message=message,
            code="RISK_LIMIT_EXCEEDED",
            details={
                "current_exposure": current_exposure,
                "max_exposure": max_exposure
            }
        )


class BacktestError(NautilusServiceError):
    """Backtest related error"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="BACKTEST_ERROR",
            details=details
        )


class DataFeedError(NautilusServiceError):
    """Data feed error"""
    def __init__(self, message: str, symbol: Optional[str] = None):
        super().__init__(
            message=message,
            code="DATA_FEED_ERROR",
            details={"symbol": symbol} if symbol else {}
        )
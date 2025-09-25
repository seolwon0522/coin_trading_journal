"""
Main FastAPI Application for Nautilus Trading Service
"""
from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
from datetime import datetime
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config.settings import settings
from app.core.strategy_manager import StrategyManager
from app.core.exceptions import NautilusServiceError
from app.api.v1 import strategies
from app.models.strategy import HealthCheckResponse

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle
    """
    # Startup
    logger.info("Starting Nautilus Trading Service...")

    # Initialize strategy manager
    app.state.strategy_manager = StrategyManager()
    await app.state.strategy_manager.initialize()

    # Store start time for uptime calculation
    app.state.start_time = time.time()

    logger.info("Nautilus Trading Service started successfully")

    yield

    # Shutdown
    logger.info("Shutting down Nautilus Trading Service...")

    # Stop all strategies
    if hasattr(app.state, 'strategy_manager'):
        await app.state.strategy_manager.emergency_stop_all()

    logger.info("Nautilus Trading Service stopped")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure as needed
)


# Exception handlers
@app.exception_handler(NautilusServiceError)
async def nautilus_error_handler(request: Request, exc: NautilusServiceError):
    """
    Handle custom Nautilus service errors
    """
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.code,
            "message": exc.message,
            "details": exc.details
        }
    )


@app.exception_handler(Exception)
async def general_error_handler(request: Request, exc: Exception):
    """
    Handle general exceptions
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred",
            "details": {"error": str(exc)} if settings.debug else {}
        }
    )


# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Log all requests
    """
    start_time = time.time()

    # Log request
    logger.info(f"Request: {request.method} {request.url.path}")

    # Process request
    response = await call_next(request)

    # Calculate duration
    duration = time.time() - start_time

    # Log response
    logger.info(f"Response: {request.method} {request.url.path} - {response.status_code} - {duration:.3f}s")

    # Add custom headers
    response.headers["X-Response-Time"] = f"{duration:.3f}"

    return response


# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }


# Health check endpoint
@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Health check endpoint
    """
    # Calculate uptime
    uptime = time.time() - app.state.start_time if hasattr(app.state, 'start_time') else 0

    # Get strategy manager status
    strategy_manager = getattr(app.state, 'strategy_manager', None)
    active_strategies = 0
    total_positions = 0

    if strategy_manager:
        strategies = await strategy_manager.list_strategies()
        active_strategies = len([s for s in strategies if s.status == "running"])

        # Count positions
        for strategy in strategies:
            try:
                positions = await strategy_manager.get_strategy_positions(strategy.id)
                total_positions += len(positions)
            except:
                pass

    return HealthCheckResponse(
        status="healthy",
        version=settings.app_version,
        uptime=uptime,
        active_strategies=active_strategies,
        total_positions=total_positions,
        trading_node_active=True,  # Would check actual status
        binance_connected=settings.has_credentials,
        database_connected=True,  # Would check actual connection
        redis_connected=True,  # Would check actual connection
        timestamp=datetime.utcnow()
    )


# Include API routers
app.include_router(strategies.router, prefix=settings.api_prefix)

# WebSocket endpoint
from app.api.websocket import websocket_endpoint

@app.websocket("/ws/{client_id}")
async def websocket_route(websocket: WebSocket, client_id: str):
    await websocket_endpoint(websocket, client_id)

# Additional API endpoints can be added here
@app.get(f"{settings.api_prefix}/config")
async def get_config():
    """
    Get service configuration (non-sensitive)
    """
    return {
        "testnet": settings.is_testnet,
        "max_strategies": settings.max_strategies,
        "default_capital": settings.default_capital,
        "default_leverage": settings.default_leverage,
        "risk_check_enabled": settings.risk_check_enabled,
        "max_position_size": settings.max_position_size
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower()
    )
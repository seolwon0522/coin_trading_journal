#!/bin/bash

# Nautilus Trading Service - Local Development Runner
# This script starts the service locally for development and testing

echo "🚀 Starting Nautilus Trading Service..."
echo "=================================="

# Check Python version
python_version=$(python3 --version 2>&1 | grep -Po '(?<=Python )\d+\.\d+')
echo "✓ Python version: $python_version"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate || . venv/Scripts/activate 2>/dev/null

# Install dependencies
echo "📚 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Check environment variables
if [ -f "../.env" ]; then
    echo "✓ Loading environment variables from .env"
    export $(cat ../.env | grep -v '^#' | xargs)
else
    echo "⚠️ No .env file found. Using defaults."
    echo "   Create .env file from .env.example for API keys"
fi

# Set default environment variables if not set
export BINANCE_TESTNET=${BINANCE_TESTNET:-true}
export LOG_LEVEL=${LOG_LEVEL:-INFO}
export MAX_STRATEGIES=${MAX_STRATEGIES:-10}
export DEFAULT_CAPITAL=${DEFAULT_CAPITAL:-10000}

# Display configuration
echo ""
echo "📋 Configuration:"
echo "  - Port: 8002"
echo "  - Testnet: $BINANCE_TESTNET"
echo "  - Log Level: $LOG_LEVEL"
echo "  - Max Strategies: $MAX_STRATEGIES"
echo ""

# Start the service
echo "🚀 Starting FastAPI server..."
echo "=================================="
echo "📍 API Docs: http://localhost:8002/docs"
echo "📍 Health: http://localhost:8002/health"
echo "📍 WebSocket: ws://localhost:8002/ws/{client_id}"
echo "=================================="
echo ""

# Run with auto-reload for development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002 --log-level ${LOG_LEVEL,,}
# 🚀 Nautilus Trading Service

A high-performance, microservice-based trading engine built with FastAPI and Nautilus Trader.

## 📋 Features

- **Strategy Management**: Create, start, stop, and monitor multiple trading strategies
- **Real-time WebSocket**: Live market data and position updates
- **RESTful API**: Standard HTTP endpoints for all operations
- **Risk Management**: Built-in risk checks and exposure monitoring
- **Performance Metrics**: Comprehensive strategy performance tracking
- **Docker Ready**: Fully containerized for easy deployment
- **Testnet Support**: Safe testing with Binance Testnet

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│         FastAPI Application         │
│            (Port 8002)               │
├─────────────────────────────────────┤
│         Strategy Manager             │
│   - Strategy Lifecycle Management    │
│   - Position Tracking                │
│   - Risk Monitoring                  │
├─────────────────────────────────────┤
│        Nautilus Trader Core         │
│   - Trading Engine                   │
│   - Market Data Processing           │
│   - Order Execution                  │
├─────────────────────────────────────┤
│        Binance Integration           │
│   - WebSocket Streams                │
│   - REST API Client                  │
│   - Testnet/Production Support       │
└─────────────────────────────────────┘
```

## 🔧 Installation

### Prerequisites
- Python 3.11+
- Docker (optional)
- Binance API keys (testnet or production)

### Local Development Setup

1. **Clone the repository**
```bash
cd nautilus-service
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
cp ../.env.example ../.env
# Edit .env with your Binance API keys
```

5. **Run the service**
```bash
# Linux/Mac
./run.sh

# Windows
run.bat

# Or directly with uvicorn
uvicorn app.main:app --reload --port 8002
```

### Docker Setup

```bash
# Build image
docker build -t nautilus-service .

# Run container
docker run -d \
  -p 8002:8002 \
  -e BINANCE_API_KEY=your_key \
  -e BINANCE_API_SECRET=your_secret \
  --name nautilus-service \
  nautilus-service
```

## 📡 API Documentation

### Interactive Documentation
- **Swagger UI**: http://localhost:8002/docs
- **ReDoc**: http://localhost:8002/redoc
- **OpenAPI Schema**: http://localhost:8002/openapi.json

### Quick API Reference

#### Health Check
```bash
GET /health
```

#### Strategy Management
```bash
# List strategies
GET /api/v1/strategies

# Create strategy
POST /api/v1/strategies
{
  "name": "My Strategy",
  "strategy_type": "ema_cross",
  "symbol": "BTCUSDT",
  "parameters": {...},
  "capital": 10000,
  "leverage": 1
}

# Start strategy
POST /api/v1/strategies/{id}/start

# Stop strategy
POST /api/v1/strategies/{id}/stop

# Get performance
GET /api/v1/strategies/{id}/performance
```

#### Risk Management
```bash
# Get risk exposure
GET /api/v1/strategies/risk/exposure

# Emergency stop all
POST /api/v1/strategies/emergency-stop
```

### WebSocket API

Connect to `ws://localhost:8002/ws/{client_id}`

#### Subscribe to channels
```javascript
// Ticker updates
{
  "type": "subscribe",
  "channel": "ticker",
  "params": {"symbol": "BTCUSDT"}
}

// Position updates
{
  "type": "subscribe",
  "channel": "positions",
  "params": {"strategy_id": "uuid"}
}
```

## 🎮 Strategy Types

### 1. EMA Cross
- **Description**: Trades based on exponential moving average crossovers
- **Parameters**:
  - `fast_ema_period`: Fast EMA period (default: 10)
  - `slow_ema_period`: Slow EMA period (default: 20)
  - `trade_size`: Size per trade (default: 0.001)

### 2. Market Maker
- **Description**: Provides liquidity by placing limit orders on both sides
- **Parameters**:
  - `atr_period`: ATR calculation period (default: 20)
  - `atr_multiple`: Spread multiplier (default: 6.0)
  - `max_inventory`: Maximum position size (default: 0.1)

### 3. Orderbook Imbalance
- **Description**: Trades based on order book imbalances
- **Parameters**:
  - `book_depth`: Depth levels to analyze (default: 10)
  - `imbalance_threshold`: Trigger threshold (default: 0.6)
  - `trade_size`: Size per trade (default: 0.001)

## 🧪 Testing

### Run Tests
```bash
# Unit tests
pytest tests/

# Integration tests
pytest tests/integration/

# Test API endpoints
python test_api.py
```

### Test Coverage
```bash
pytest --cov=app --cov-report=html
# Open htmlcov/index.html
```

## 📊 Monitoring

### Logs
- Location: `logs/` directory
- Format: JSON structured logging
- Levels: DEBUG, INFO, WARNING, ERROR

### Metrics
- Prometheus endpoint: `/metrics`
- Grafana dashboards available
- Key metrics:
  - Strategy count
  - Position count
  - Total PnL
  - API latency

### Health Monitoring
```bash
# Check service health
curl http://localhost:8002/health

# Response
{
  "status": "healthy",
  "version": "1.0.0",
  "active_strategies": 2,
  "total_positions": 5,
  "uptime": 3600.5
}
```

## 🔐 Security

### API Authentication
- JWT tokens for production
- API key validation
- Rate limiting enabled

### Best Practices
- Never commit API keys
- Use environment variables
- Enable HTTPS in production
- Implement IP whitelisting
- Regular security audits

## 🚀 Deployment

### Production Checklist
- [ ] Set `BINANCE_TESTNET=false`
- [ ] Configure production API keys
- [ ] Enable HTTPS/WSS
- [ ] Set up monitoring alerts
- [ ] Configure backup strategy
- [ ] Implement rate limiting
- [ ] Set resource limits
- [ ] Enable auto-restart

### Environment Variables
```bash
# Required
BINANCE_API_KEY=your_production_key
BINANCE_API_SECRET=your_production_secret

# Optional
BINANCE_TESTNET=false
LOG_LEVEL=WARNING
MAX_STRATEGIES=20
DEFAULT_CAPITAL=50000
RISK_CHECK_ENABLED=true
```

### Scaling
```yaml
# docker-compose.yml
services:
  nautilus-service:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

## 🐛 Troubleshooting

### Common Issues

#### Service won't start
```bash
# Check Python version
python --version  # Should be 3.11+

# Check dependencies
pip install --upgrade -r requirements.txt

# Check port availability
lsof -i :8002
```

#### WebSocket disconnects
- Check firewall settings
- Verify WebSocket URL
- Enable CORS for your domain

#### Strategy not executing trades
- Verify API keys are correct
- Check account balance
- Review strategy parameters
- Check Binance API status

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Nautilus Trader Docs](https://nautilustrader.io/)
- [Binance API](https://binance-docs.github.io/apidocs/)
- [WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📝 License

MIT License - See LICENSE file

## 🆘 Support

- GitHub Issues: Report bugs
- Discord: Community support
- Email: support@example.com

---

Built with ❤️ using FastAPI and Nautilus Trader
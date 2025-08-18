# Trades Feature Development Guide

## 📋 Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [API Design Specification](#api-design-specification)
3. [Database Schema Design](#database-schema-design)
4. [Development Phases and Tasks](#development-phases-and-tasks)
5. [Technical Implementation Guidelines](#technical-implementation-guidelines)
6. [Testing Strategy](#testing-strategy)
7. [Performance Requirements](#performance-requirements)
8. [Security Considerations](#security-considerations)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │    │   (Spring Boot) │    │   Services      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Trade Forms   │◄──►│ • Trade API     │◄──►│ • Binance API   │
│ • Trade List    │    │ • Auth Service  │    │ • ML Scoring    │
│ • Analytics     │    │ • Validation    │    │ • Redis Cache   │
│ • Real-time UI  │    │ • Data Sync     │    │ • PostgreSQL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.2 Clean Architecture Layers

**Domain Layer (Core Business Logic)**
- Trade Entity
- Strategy Scoring Value Objects
- Business Rules & Validations
- Domain Services

**Application Layer (Use Cases)**
- CreateTradeUseCase
- UpdateTradeUseCase
- SyncBinanceTradesUseCase
- CalculateTradeAnalyticsUseCase

**Infrastructure Layer (External Concerns)**
- JPA Repositories
- Binance API Client
- Redis Cache
- Database Migrations

**Presentation Layer (Controllers & DTOs)**
- REST Controllers
- Request/Response DTOs
- Input Validation
- Error Handling

### 1.3 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Frontend** | Next.js | 14.x | React-based UI framework |
| **Backend** | Spring Boot | 3.5.4 | Java REST API server |
| **Database** | PostgreSQL | 15+ | Primary data storage |
| **Cache** | Redis | 7.0 | Session & data caching |
| **ML Engine** | Python FastAPI | 3.11+ | Strategy scoring service |
| **External API** | Binance API | v3 | Market data & trade sync |

---

## 2. API Design Specification

### 2.1 Core Trade Endpoints

#### 2.1.1 Create Trade
```http
POST /api/v1/trades
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "symbol": "BTCUSDT",
  "type": "buy",
  "tradingType": "breakout",
  "quantity": 0.001,
  "entryPrice": 65000.50,
  "exitPrice": 67000.00,
  "entryTime": "2025-01-15T10:30:00Z",
  "exitTime": "2025-01-15T14:20:00Z",
  "memo": "Strong breakout above resistance",
  "stopLoss": 63000.00,
  "indicators": {
    "volume": 1500000,
    "averageVolume": 1200000,
    "riskReward": 2.5,
    "htfTrend": "up"
  }
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "trade_12345",
    "symbol": "BTCUSDT",
    "type": "buy",
    "tradingType": "breakout",
    "quantity": 0.001,
    "entryPrice": 65000.50,
    "exitPrice": 67000.00,
    "entryTime": "2025-01-15T10:30:00Z",
    "exitTime": "2025-01-15T14:20:00Z",
    "memo": "Strong breakout above resistance",
    "pnl": 2000.00,
    "status": "closed",
    "stopLoss": 63000.00,
    "strategyScore": {
      "strategy": "breakout",
      "totalScore": 85,
      "criteria": [...]
    },
    "forbiddenPenalty": 0,
    "finalScore": 85,
    "forbiddenViolations": [],
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T14:20:00Z"
  }
}
```

#### 2.1.2 Get Trades (with filtering)
```http
GET /api/v1/trades?symbol=BTCUSDT&status=closed&dateFrom=2025-01-01&dateTo=2025-01-31&sortBy=entryTime&sortOrder=desc&limit=50&offset=0
Authorization: Bearer {jwt_token}
```

#### 2.1.3 Update Trade
```http
PUT /api/v1/trades/{tradeId}
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "exitPrice": 67500.00,
  "exitTime": "2025-01-15T15:00:00Z",
  "memo": "Updated exit price - better than expected"
}
```

#### 2.1.4 Delete Trade
```http
DELETE /api/v1/trades/{tradeId}
Authorization: Bearer {jwt_token}
```

### 2.2 Binance Integration Endpoints

#### 2.2.1 Sync Binance Trades
```http
POST /api/v1/trades/sync/binance
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "symbol": "BTCUSDT",
  "startTime": "2025-01-01T00:00:00Z",
  "endTime": "2025-01-31T23:59:59Z"
}
```

#### 2.2.2 Get Binance Account Info
```http
GET /api/v1/trades/binance/account
Authorization: Bearer {jwt_token}
```

### 2.3 Analytics Endpoints

#### 2.3.1 Trade Statistics
```http
GET /api/v1/trades/analytics/stats?period=30d&symbol=BTCUSDT
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTrades": 45,
    "winRate": 67.5,
    "totalPnl": 15420.50,
    "avgPnlPerTrade": 342.68,
    "bestTrade": 2500.00,
    "worstTrade": -800.00,
    "avgHoldingTime": "4h 30m",
    "strategyBreakdown": {
      "breakout": { "count": 20, "winRate": 70.0, "pnl": 8500.00 },
      "trend": { "count": 15, "winRate": 66.7, "pnl": 4200.00 },
      "counter_trend": { "count": 10, "winRate": 60.0, "pnl": 2720.50 }
    }
  }
}
```

### 2.4 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid trade data",
    "details": {
      "entryPrice": ["Entry price must be positive"],
      "symbol": ["Symbol is required"]
    }
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

## 3. Database Schema Design

### 3.1 Core Tables

#### 3.1.1 trades Table
```sql
CREATE TABLE trades (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
    trading_type VARCHAR(20) NOT NULL CHECK (trading_type IN ('breakout', 'trend', 'counter_trend')),
    quantity DECIMAL(18,8) NOT NULL CHECK (quantity > 0),
    entry_price DECIMAL(18,8) NOT NULL CHECK (entry_price > 0),
    exit_price DECIMAL(18,8) CHECK (exit_price > 0),
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_time TIMESTAMP WITH TIME ZONE,
    memo TEXT,
    pnl DECIMAL(18,8),
    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    stop_loss DECIMAL(18,8) CHECK (stop_loss > 0),
    
    -- Strategy Scoring
    strategy_score_total INTEGER,
    forbidden_penalty INTEGER DEFAULT 0,
    final_score INTEGER,
    
    -- Metadata
    binance_order_id VARCHAR(50), -- For synced trades
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_trades_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_entry_time ON trades(entry_time DESC);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_user_symbol_time ON trades(user_id, symbol, entry_time DESC);
```

#### 3.1.2 trade_indicators Table
```sql
CREATE TABLE trade_indicators (
    id BIGSERIAL PRIMARY KEY,
    trade_id VARCHAR(50) NOT NULL,
    volume DECIMAL(18,2),
    average_volume DECIMAL(18,2),
    prev_range_high DECIMAL(18,8),
    trendline_high DECIMAL(18,8),
    atr DECIMAL(18,8),
    stop_loss_within_limit BOOLEAN,
    htf_trend VARCHAR(10) CHECK (htf_trend IN ('up', 'down', 'sideways')),
    htf_trend2 VARCHAR(10) CHECK (htf_trend2 IN ('up', 'down', 'sideways')),
    pullback_ok BOOLEAN,
    trail_stop_correct BOOLEAN,
    zscore DECIMAL(10,4),
    reversal_signal BOOLEAN,
    risk_reward DECIMAL(10,2),
    entry_candle_upper_wick_ratio DECIMAL(6,4),
    entry_candle_lower_wick_ratio DECIMAL(6,4),
    bollinger_percent DECIMAL(6,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_trade_indicators_trade FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
);

CREATE INDEX idx_trade_indicators_trade_id ON trade_indicators(trade_id);
```

#### 3.1.3 strategy_scores Table
```sql
CREATE TABLE strategy_scores (
    id BIGSERIAL PRIMARY KEY,
    trade_id VARCHAR(50) NOT NULL,
    strategy VARCHAR(20) NOT NULL,
    total_score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_strategy_scores_trade FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
);
```

#### 3.1.4 strategy_criteria_scores Table
```sql
CREATE TABLE strategy_criteria_scores (
    id BIGSERIAL PRIMARY KEY,
    strategy_score_id BIGINT NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    ratio DECIMAL(5,2) NOT NULL,
    score INTEGER NOT NULL,
    max_points INTEGER NOT NULL,
    
    CONSTRAINT fk_criteria_scores_strategy FOREIGN KEY (strategy_score_id) REFERENCES strategy_scores(id) ON DELETE CASCADE
);
```

#### 3.1.5 forbidden_violations Table
```sql
CREATE TABLE forbidden_violations (
    id BIGSERIAL PRIMARY KEY,
    trade_id VARCHAR(50) NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
    score_penalty INTEGER NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    details JSONB,
    
    CONSTRAINT fk_forbidden_violations_trade FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
);

CREATE INDEX idx_forbidden_violations_trade_id ON forbidden_violations(trade_id);
```

### 3.2 Data Migration Scripts

#### 3.2.1 Initial Schema Migration (V001)
```sql
-- V001__create_trades_tables.sql
-- (Include all CREATE TABLE statements from above)
```

#### 3.2.2 Sample Data Migration (V002)
```sql
-- V002__insert_sample_data.sql
INSERT INTO trades (id, user_id, symbol, type, trading_type, quantity, entry_price, entry_time, status)
VALUES 
  ('trade_001', 'user_123', 'BTCUSDT', 'buy', 'breakout', 0.001, 65000.50, '2025-01-15 10:30:00+00', 'open'),
  ('trade_002', 'user_123', 'ETHUSDT', 'sell', 'trend', 0.1, 3500.00, '2025-01-15 11:00:00+00', 'open');
```

---

## 4. Development Phases and Tasks

### 4.1 Phase 1: Core Backend Implementation (Week 1-2)

#### 4.1.1 Database Layer
- [ ] Create database migration scripts
- [ ] Implement JPA entities (Trade, TradeIndicators, etc.)
- [ ] Create repository interfaces with custom queries
- [ ] Set up database connection and configuration

#### 4.1.2 Domain Layer
- [ ] Implement Trade domain entity with business logic
- [ ] Create value objects (TradingType, TradeStatus, etc.)
- [ ] Implement business rules and validations
- [ ] Create domain services for PnL calculations

#### 4.1.3 Application Layer
- [ ] Implement trade use cases (CreateTrade, UpdateTrade, etc.)
- [ ] Create trade service with business logic
- [ ] Implement strategy scoring integration
- [ ] Add audit logging

**Deliverables:**
- Database schema and migrations
- Core domain models
- Basic CRUD operations
- Unit tests for domain logic

### 4.2 Phase 2: REST API Development (Week 3-4)

#### 4.2.1 Controllers and DTOs
- [ ] Create TradeController with all CRUD endpoints
- [ ] Implement request/response DTOs
- [ ] Add input validation with @Valid annotations
- [ ] Implement error handling

#### 4.2.2 Integration Services
- [ ] Create BinanceApiClient for external API calls
- [ ] Implement trade synchronization service
- [ ] Add Redis caching for frequently accessed data
- [ ] Create async processing for heavy operations

#### 4.2.3 Security and Authentication
- [ ] Integrate with existing JWT authentication
- [ ] Implement user-specific trade access
- [ ] Add rate limiting for API endpoints
- [ ] Implement audit logging

**Deliverables:**
- Complete REST API endpoints
- Binance API integration
- Authentication and authorization
- Integration tests

### 4.3 Phase 3: Frontend Implementation (Week 5-6)

#### 4.3.1 Trade Management UI
- [ ] Create trade creation form with validation
- [ ] Implement trade list with filtering and sorting
- [ ] Add trade editing and deletion functionality
- [ ] Create responsive design for mobile

#### 4.3.2 Data Integration
- [ ] Implement React Query for API calls
- [ ] Create custom hooks for trade operations
- [ ] Add optimistic updates for better UX
- [ ] Implement real-time updates with WebSocket

#### 4.3.3 Analytics Dashboard
- [ ] Create trade statistics components
- [ ] Implement charts with Chart.js
- [ ] Add performance metrics visualization
- [ ] Create export functionality

**Deliverables:**
- Complete trade management UI
- Real-time data updates
- Analytics dashboard
- Mobile-responsive design

### 4.4 Phase 4: Advanced Features (Week 7-8)

#### 4.4.1 ML Integration
- [ ] Integrate with Python ML scoring service
- [ ] Implement strategy scoring display
- [ ] Add forbidden rule violation detection
- [ ] Create learning feedback loop

#### 4.4.2 Advanced Analytics
- [ ] Implement trade pattern analysis
- [ ] Create performance comparison tools
- [ ] Add predictive analytics
- [ ] Implement risk management metrics

#### 4.4.3 Automation Features
- [ ] Create automated trade sync scheduler
- [ ] Implement trade alerts and notifications
- [ ] Add batch operations for bulk updates
- [ ] Create data export/import functionality

**Deliverables:**
- ML-powered trade scoring
- Advanced analytics features
- Automated trade management
- Complete feature set

---

## 5. Technical Implementation Guidelines

### 5.1 Backend Implementation (Spring Boot)

#### 5.1.1 Project Structure
```
src/main/java/com/example/trading_bot/
├── trade/
│   ├── controller/
│   │   └── TradeController.java
│   ├── service/
│   │   ├── TradeService.java
│   │   ├── BinanceIntegrationService.java
│   │   └── TradeAnalyticsService.java
│   ├── repository/
│   │   ├── TradeRepository.java
│   │   └── TradeIndicatorsRepository.java
│   ├── entity/
│   │   ├── Trade.java
│   │   ├── TradeIndicators.java
│   │   └── StrategyScore.java
│   ├── dto/
│   │   ├── CreateTradeRequest.java
│   │   ├── TradeResponse.java
│   │   └── TradeAnalyticsResponse.java
│   └── config/
│       └── BinanceConfig.java
```

#### 5.1.2 Key Implementation Examples

**Trade Entity:**
```java
@Entity
@Table(name = "trades")
@EntityListeners(AuditingEntityListener.class)
public class Trade extends BaseTimeEntity {
    
    @Id
    private String id;
    
    @Column(name = "user_id", nullable = false)
    private String userId;
    
    @Column(nullable = false, length = 20)
    private String symbol;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TradeType type;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "trading_type", nullable = false)
    private TradingType tradingType;
    
    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal quantity;
    
    @Column(name = "entry_price", nullable = false, precision = 18, scale = 8)
    private BigDecimal entryPrice;
    
    // ... other fields
    
    @OneToOne(mappedBy = "trade", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private TradeIndicators indicators;
    
    @OneToMany(mappedBy = "trade", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ForbiddenViolation> forbiddenViolations = new ArrayList<>();
    
    // Business logic methods
    public BigDecimal calculatePnl() {
        if (exitPrice == null) return BigDecimal.ZERO;
        
        BigDecimal priceDiff = type == TradeType.BUY 
            ? exitPrice.subtract(entryPrice)
            : entryPrice.subtract(exitPrice);
            
        return priceDiff.multiply(quantity);
    }
    
    public boolean isprofitable() {
        return calculatePnl().compareTo(BigDecimal.ZERO) > 0;
    }
}
```

**Trade Service:**
```java
@Service
@Transactional
@RequiredArgsConstructor
public class TradeService {
    
    private final TradeRepository tradeRepository;
    private final TradeMapper tradeMapper;
    private final StrategyScoreService strategyScoreService;
    
    public TradeResponse createTrade(String userId, CreateTradeRequest request) {
        // Validate request
        validateTradeRequest(request);
        
        // Create trade entity
        Trade trade = Trade.builder()
            .id(generateTradeId())
            .userId(userId)
            .symbol(request.getSymbol())
            .type(request.getType())
            .tradingType(request.getTradingType())
            .quantity(request.getQuantity())
            .entryPrice(request.getEntryPrice())
            .exitPrice(request.getExitPrice())
            .entryTime(request.getEntryTime())
            .exitTime(request.getExitTime())
            .memo(request.getMemo())
            .stopLoss(request.getStopLoss())
            .status(determineTradeStatus(request))
            .build();
        
        // Add indicators if provided
        if (request.getIndicators() != null) {
            TradeIndicators indicators = tradeMapper.toIndicatorsEntity(request.getIndicators());
            trade.setIndicators(indicators);
        }
        
        // Save trade
        Trade savedTrade = tradeRepository.save(trade);
        
        // Calculate strategy score asynchronously
        CompletableFuture.runAsync(() -> 
            strategyScoreService.calculateAndSaveScore(savedTrade.getId())
        );
        
        return tradeMapper.toResponse(savedTrade);
    }
    
    public Page<TradeResponse> getTrades(String userId, TradeFilters filters, Pageable pageable) {
        Specification<Trade> spec = TradeSpecifications.byUserIdAndFilters(userId, filters);
        Page<Trade> trades = tradeRepository.findAll(spec, pageable);
        return trades.map(tradeMapper::toResponse);
    }
    
    private void validateTradeRequest(CreateTradeRequest request) {
        if (request.getExitTime() != null && request.getExitTime().isBefore(request.getEntryTime())) {
            throw new BusinessException("Exit time cannot be before entry time");
        }
        
        if (request.getExitPrice() != null && request.getStopLoss() != null) {
            if (request.getType() == TradeType.BUY && request.getExitPrice().compareTo(request.getStopLoss()) < 0) {
                throw new BusinessException("Exit price cannot be below stop loss for buy trades");
            }
        }
    }
}
```

**Trade Controller:**
```java
@RestController
@RequestMapping("/api/v1/trades")
@RequiredArgsConstructor
@Validated
public class TradeController {
    
    private final TradeService tradeService;
    
    @PostMapping
    public ResponseEntity<ApiResponse<TradeResponse>> createTrade(
            @Valid @RequestBody CreateTradeRequest request,
            Authentication auth) {
        
        String userId = ((UserPrincipal) auth.getPrincipal()).getId();
        TradeResponse trade = tradeService.createTrade(userId, request);
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(trade));
    }
    
    @GetMapping
    public ResponseEntity<ApiResponse<TradesResponse>> getTrades(
            @Valid TradeFilters filters,
            @PageableDefault(size = 50, sort = "entryTime", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication auth) {
        
        String userId = ((UserPrincipal) auth.getPrincipal()).getId();
        Page<TradeResponse> trades = tradeService.getTrades(userId, filters, pageable);
        
        TradesResponse response = TradesResponse.builder()
            .trades(trades.getContent())
            .total(trades.getTotalElements())
            .page(trades.getNumber())
            .limit(trades.getSize())
            .build();
            
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
```

### 5.2 Frontend Implementation (Next.js + TypeScript)

#### 5.2.1 Project Structure
```
src/
├── app/
│   ├── trades/
│   │   ├── page.tsx              # Trade list page
│   │   ├── create/
│   │   │   └── page.tsx          # Create trade page
│   │   └── [id]/
│   │       └── page.tsx          # Trade detail page
│   └── analytics/
│       └── page.tsx              # Analytics dashboard
├── components/
│   ├── trades/
│   │   ├── TradeForm.tsx         # Trade creation/edit form
│   │   ├── TradeList.tsx         # Trade list with filters
│   │   ├── TradeCard.tsx         # Individual trade card
│   │   └── TradeFilters.tsx      # Filter controls
│   └── analytics/
│       ├── TradeStats.tsx        # Statistics overview
│       └── PerformanceChart.tsx  # Performance visualization
├── hooks/
│   ├── use-trades.ts             # Trade management hooks
│   ├── use-trade-analytics.ts    # Analytics hooks
│   └── use-binance-sync.ts       # Binance sync hooks
└── lib/
    ├── api/
    │   └── trades.ts             # Trade API functions
    └── validations/
        └── trade.ts              # Form validation schemas
```

#### 5.2.2 Key Implementation Examples

**Trade Creation Form:**
```typescript
// components/trades/TradeForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTradeSchema, type CreateTradeFormData } from '@/schemas/trade';
import { useTrades } from '@/hooks/use-trades';

export default function TradeForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createTrade } = useTrades();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CreateTradeFormData>({
    resolver: zodResolver(createTradeSchema),
    defaultValues: {
      type: 'buy',
      tradingType: 'breakout',
      status: 'open'
    }
  });
  
  const watchedType = watch('type');
  const watchedEntryPrice = watch('entryPrice');
  const watchedExitPrice = watch('exitPrice');
  const watchedQuantity = watch('quantity');
  
  // Calculate PnL in real-time
  const calculatedPnl = useMemo(() => {
    if (!watchedEntryPrice || !watchedExitPrice || !watchedQuantity) return 0;
    
    const priceDiff = watchedType === 'buy' 
      ? watchedExitPrice - watchedEntryPrice
      : watchedEntryPrice - watchedExitPrice;
      
    return priceDiff * watchedQuantity;
  }, [watchedType, watchedEntryPrice, watchedExitPrice, watchedQuantity]);
  
  const onSubmit = async (data: CreateTradeFormData) => {
    setIsSubmitting(true);
    try {
      await createTrade.mutateAsync(data);
      reset();
      onSuccess?.();
      toast.success('Trade created successfully');
    } catch (error) {
      toast.error('Failed to create trade');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Trade Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Symbol</label>
            <input
              {...register('symbol')}
              className="w-full p-3 border rounded-md"
              placeholder="BTCUSDT"
            />
            {errors.symbol && (
              <p className="text-red-500 text-sm mt-1">{errors.symbol.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select {...register('type')} className="w-full p-3 border rounded-md">
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Trading Type</label>
              <select {...register('tradingType')} className="w-full p-3 border rounded-md">
                <option value="breakout">Breakout</option>
                <option value="trend">Trend</option>
                <option value="counter_trend">Counter Trend</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Price and Quantity */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <input
                {...register('quantity', { valueAsNumber: true })}
                type="number"
                step="0.00000001"
                className="w-full p-3 border rounded-md"
              />
              {errors.quantity && (
                <p className="text-red-500 text-sm mt-1">{errors.quantity.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Entry Price</label>
              <input
                {...register('entryPrice', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="w-full p-3 border rounded-md"
              />
              {errors.entryPrice && (
                <p className="text-red-500 text-sm mt-1">{errors.entryPrice.message}</p>
              )}
            </div>
          </div>
          
          {/* PnL Display */}
          {calculatedPnl !== 0 && (
            <div className={`p-3 rounded-md ${calculatedPnl > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className="text-sm font-medium">
                Calculated PnL: 
                <span className={calculatedPnl > 0 ? 'text-green-600' : 'text-red-600'}>
                  ${calculatedPnl.toFixed(2)}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => reset()}
          className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Trade'}
        </button>
      </div>
    </form>
  );
}
```

**Trade Management Hook:**
```typescript
// hooks/use-trades.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tradesApi } from '@/lib/api/trades';
import type { CreateTradeRequest, TradeFilters, Trade } from '@/types/trade';

export function useTrades(filters?: TradeFilters) {
  const queryClient = useQueryClient();
  
  // Get trades with filters
  const tradesQuery = useQuery({
    queryKey: ['trades', filters],
    queryFn: () => tradesApi.getTrades(filters),
    staleTime: 30000, // 30 seconds
  });
  
  // Create trade mutation
  const createTrade = useMutation({
    mutationFn: tradesApi.createTrade,
    onSuccess: () => {
      // Invalidate and refetch trades
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['trade-analytics'] });
    },
  });
  
  // Update trade mutation
  const updateTrade = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Trade> }) =>
      tradesApi.updateTrade(id, data),
    onSuccess: (updatedTrade) => {
      // Update specific trade in cache
      queryClient.setQueryData(['trades'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          trades: oldData.trades.map((trade: Trade) =>
            trade.id === updatedTrade.id ? updatedTrade : trade
          ),
        };
      });
    },
  });
  
  // Delete trade mutation
  const deleteTrade = useMutation({
    mutationFn: tradesApi.deleteTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
  
  // Binance sync mutation
  const syncBinanceTrades = useMutation({
    mutationFn: tradesApi.syncBinanceTrades,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
  
  return {
    // Queries
    trades: tradesQuery.data?.trades || [],
    isLoading: tradesQuery.isLoading,
    error: tradesQuery.error,
    
    // Mutations
    createTrade,
    updateTrade,
    deleteTrade,
    syncBinanceTrades,
    
    // Helper functions
    refetch: tradesQuery.refetch,
  };
}
```

### 5.3 Integration Patterns

#### 5.3.1 Binance API Integration
```java
@Service
@RequiredArgsConstructor
public class BinanceIntegrationService {
    
    private final BinanceApiClient binanceApiClient;
    private final TradeService tradeService;
    private final UserService userService;
    
    @Async
    public CompletableFuture<SyncResult> syncUserTrades(String userId, SyncRequest request) {
        try {
            // Get user's Binance API credentials
            BinanceCredentials credentials = userService.getBinanceCredentials(userId);
            
            // Fetch trades from Binance
            List<BinanceTrade> binanceTrades = binanceApiClient.getUserTrades(
                credentials, request.getSymbol(), request.getStartTime(), request.getEndTime()
            );
            
            // Convert and save trades
            int syncedCount = 0;
            int skippedCount = 0;
            
            for (BinanceTrade binanceTrade : binanceTrades) {
                try {
                    if (!tradeService.existsByBinanceOrderId(binanceTrade.getOrderId())) {
                        CreateTradeRequest tradeRequest = convertBinanceTradeToRequest(binanceTrade);
                        tradeService.createTrade(userId, tradeRequest);
                        syncedCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (Exception e) {
                    log.warn("Failed to sync trade {}: {}", binanceTrade.getOrderId(), e.getMessage());
                }
            }
            
            return CompletableFuture.completedFuture(
                SyncResult.builder()
                    .syncedCount(syncedCount)
                    .skippedCount(skippedCount)
                    .status("completed")
                    .build()
            );
            
        } catch (Exception e) {
            log.error("Failed to sync trades for user {}: {}", userId, e.getMessage());
            throw new BusinessException("Trade sync failed", e);
        }
    }
}
```

#### 5.3.2 Strategy Scoring Integration
```java
@Service
@RequiredArgsConstructor
public class StrategyScoreService {
    
    private final RestTemplate restTemplate;
    private final StrategyScoreRepository strategyScoreRepository;
    
    @Value("${ml.scoring.url}")
    private String mlScoringUrl;
    
    @Async
    public CompletableFuture<Void> calculateAndSaveScore(String tradeId) {
        try {
            Trade trade = tradeRepository.findById(tradeId)
                .orElseThrow(() -> new EntityNotFoundException("Trade not found"));
            
            if (trade.getIndicators() == null) {
                log.debug("No indicators provided for trade {}, skipping scoring", tradeId);
                return CompletableFuture.completedFuture(null);
            }
            
            // Prepare request for ML service
            ScoreRequest scoreRequest = ScoreRequest.builder()
                .tradingType(trade.getTradingType().name())
                .indicators(convertToMLIndicators(trade.getIndicators()))
                .build();
            
            // Call ML scoring service
            ResponseEntity<ScoreResponse> response = restTemplate.postForEntity(
                mlScoringUrl + "/score",
                scoreRequest,
                ScoreResponse.class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                StrategyScoreResult scoreResult = response.getBody().getStrategyScore();
                
                // Save strategy score
                StrategyScore strategyScore = StrategyScore.builder()
                    .tradeId(tradeId)
                    .strategy(scoreResult.getStrategy())
                    .totalScore(scoreResult.getTotalScore())
                    .build();
                
                StrategyScore savedScore = strategyScoreRepository.save(strategyScore);
                
                // Save criteria scores
                scoreResult.getCriteria().forEach(criterion -> {
                    StrategyCriteriaScore criteriaScore = StrategyCriteriaScore.builder()
                        .strategyScoreId(savedScore.getId())
                        .code(criterion.getCode())
                        .description(criterion.getDescription())
                        .weight(criterion.getWeight())
                        .ratio(criterion.getRatio())
                        .score(criterion.getScore())
                        .maxPoints(criterion.getMaxPoints())
                        .build();
                    
                    strategyCriteriaScoreRepository.save(criteriaScore);
                });
                
                // Update trade with final score
                trade.setStrategyScoreTotal(scoreResult.getTotalScore());
                trade.setFinalScore(scoreResult.getTotalScore() - trade.getForbiddenPenalty());
                tradeRepository.save(trade);
            }
            
            return CompletableFuture.completedFuture(null);
            
        } catch (Exception e) {
            log.error("Failed to calculate strategy score for trade {}: {}", tradeId, e.getMessage());
            throw new BusinessException("Strategy scoring failed", e);
        }
    }
}
```

---

## 6. Testing Strategy

### 6.1 Backend Testing

#### 6.1.1 Unit Tests
```java
@ExtendWith(MockitoExtension.class)
class TradeServiceTest {
    
    @Mock
    private TradeRepository tradeRepository;
    
    @Mock
    private StrategyScoreService strategyScoreService;
    
    @InjectMocks
    private TradeService tradeService;
    
    @Test
    void createTrade_ValidRequest_ShouldCreateTrade() {
        // Given
        String userId = "user123";
        CreateTradeRequest request = CreateTradeRequest.builder()
            .symbol("BTCUSDT")
            .type(TradeType.BUY)
            .tradingType(TradingType.BREAKOUT)
            .quantity(new BigDecimal("0.001"))
            .entryPrice(new BigDecimal("65000"))
            .entryTime(LocalDateTime.now())
            .build();
        
        Trade savedTrade = Trade.builder()
            .id("trade123")
            .userId(userId)
            .symbol("BTCUSDT")
            .build();
        
        when(tradeRepository.save(any(Trade.class))).thenReturn(savedTrade);
        
        // When
        TradeResponse result = tradeService.createTrade(userId, request);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.getSymbol()).isEqualTo("BTCUSDT");
        verify(tradeRepository).save(any(Trade.class));
        verify(strategyScoreService).calculateAndSaveScore(eq("trade123"));
    }
    
    @Test
    void createTrade_InvalidExitTime_ShouldThrowException() {
        // Given
        String userId = "user123";
        CreateTradeRequest request = CreateTradeRequest.builder()
            .entryTime(LocalDateTime.now())
            .exitTime(LocalDateTime.now().minusHours(1)) // Invalid: before entry
            .build();
        
        // When & Then
        assertThatThrownBy(() -> tradeService.createTrade(userId, request))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Exit time cannot be before entry time");
    }
}
```

#### 6.1.2 Integration Tests
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {"spring.profiles.active=test"})
@Transactional
class TradeControllerIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private TradeRepository tradeRepository;
    
    @Test
    void createTrade_ValidRequest_ShouldReturn201() {
        // Given
        CreateTradeRequest request = CreateTradeRequest.builder()
            .symbol("BTCUSDT")
            .type(TradeType.BUY)
            .tradingType(TradingType.BREAKOUT)
            .quantity(new BigDecimal("0.001"))
            .entryPrice(new BigDecimal("65000"))
            .entryTime(LocalDateTime.now())
            .build();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(generateValidJwtToken());
        HttpEntity<CreateTradeRequest> entity = new HttpEntity<>(request, headers);
        
        // When
        ResponseEntity<ApiResponse> response = restTemplate.postForEntity(
            "/api/v1/trades", entity, ApiResponse.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().isSuccess()).isTrue();
        
        // Verify database
        List<Trade> savedTrades = tradeRepository.findAll();
        assertThat(savedTrades).hasSize(1);
        assertThat(savedTrades.get(0).getSymbol()).isEqualTo("BTCUSDT");
    }
}
```

### 6.2 Frontend Testing

#### 6.2.1 Component Tests
```typescript
// __tests__/components/TradeForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TradeForm } from '@/components/trades/TradeForm';

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('TradeForm', () => {
  it('should render all required fields', () => {
    renderWithQueryClient(<TradeForm />);
    
    expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trading type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/entry price/i)).toBeInTheDocument();
  });
  
  it('should validate required fields', async () => {
    renderWithQueryClient(<TradeForm />);
    
    const submitButton = screen.getByRole('button', { name: /create trade/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/symbol.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/quantity.*required/i)).toBeInTheDocument();
    });
  });
  
  it('should calculate PnL correctly', async () => {
    renderWithQueryClient(<TradeForm />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '0.001' } });
    fireEvent.change(screen.getByLabelText(/entry price/i), { target: { value: '65000' } });
    fireEvent.change(screen.getByLabelText(/exit price/i), { target: { value: '67000' } });
    
    await waitFor(() => {
      expect(screen.getByText(/calculated pnl.*\$2\.00/i)).toBeInTheDocument();
    });
  });
});
```

#### 6.2.2 Hook Tests
```typescript
// __tests__/hooks/use-trades.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTrades } from '@/hooks/use-trades';
import { tradesApi } from '@/lib/api/trades';

jest.mock('@/lib/api/trades');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useTrades', () => {
  it('should fetch trades successfully', async () => {
    const mockTrades = [
      { id: '1', symbol: 'BTCUSDT', type: 'buy' },
      { id: '2', symbol: 'ETHUSDT', type: 'sell' }
    ];
    
    (tradesApi.getTrades as jest.Mock).mockResolvedValue({
      trades: mockTrades,
      total: 2
    });
    
    const { result } = renderHook(() => useTrades(), {
      wrapper: createWrapper()
    });
    
    await waitFor(() => {
      expect(result.current.trades).toEqual(mockTrades);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
```

### 6.3 E2E Testing

#### 6.3.1 Playwright Tests
```typescript
// e2e/trades.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Trade Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  
  test('should create a new trade', async ({ page }) => {
    // Navigate to trades page
    await page.goto('/trades');
    await page.click('button:has-text("Create Trade")');
    
    // Fill trade form
    await page.fill('[name="symbol"]', 'BTCUSDT');
    await page.selectOption('[name="type"]', 'buy');
    await page.selectOption('[name="tradingType"]', 'breakout');
    await page.fill('[name="quantity"]', '0.001');
    await page.fill('[name="entryPrice"]', '65000');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator('.toast')).toContainText('Trade created successfully');
    await expect(page.locator('[data-testid="trade-list"]')).toContainText('BTCUSDT');
  });
  
  test('should filter trades by symbol', async ({ page }) => {
    await page.goto('/trades');
    
    // Apply filter
    await page.fill('[name="symbol"]', 'BTC');
    await page.click('button:has-text("Apply Filters")');
    
    // Verify filtered results
    const tradeCards = page.locator('[data-testid="trade-card"]');
    const count = await tradeCards.count();
    
    for (let i = 0; i < count; i++) {
      await expect(tradeCards.nth(i)).toContainText('BTC');
    }
  });
});
```

---

## 7. Performance Requirements

### 7.1 Backend Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time | < 200ms (95th percentile) | Average response time for CRUD operations |
| Database Query Time | < 50ms | Most frequent queries with proper indexing |
| Throughput | 1000 requests/minute | Concurrent user operations |
| Memory Usage | < 512MB | JVM heap usage under normal load |
| CPU Usage | < 70% | Average CPU utilization |

### 7.2 Frontend Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Page Load | < 2 seconds | Time to first contentful paint |
| Trade List Rendering | < 500ms | Time to render 100 trades |
| Form Submission | < 300ms | Time from submit to success feedback |
| Bundle Size | < 500KB (gzipped) | JavaScript bundle size |
| Core Web Vitals | All "Good" | LCP, FID, CLS metrics |

### 7.3 Performance Optimization Strategies

#### 7.3.1 Backend Optimizations
```java
// Database query optimization
@Repository
public interface TradeRepository extends JpaRepository<Trade, String> {
    
    @Query("""
        SELECT t FROM Trade t 
        LEFT JOIN FETCH t.indicators 
        WHERE t.userId = :userId 
        AND (:symbol IS NULL OR t.symbol LIKE %:symbol%)
        AND (:status IS NULL OR t.status = :status)
        AND t.entryTime BETWEEN :startDate AND :endDate
        ORDER BY t.entryTime DESC
        """)
    Page<Trade> findTradesWithIndicators(
        @Param("userId") String userId,
        @Param("symbol") String symbol,
        @Param("status") TradeStatus status,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable
    );
    
    // Efficient aggregation queries
    @Query("""
        SELECT new com.example.dto.TradeStatsDto(
            COUNT(t),
            SUM(CASE WHEN t.pnl > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(t),
            SUM(t.pnl),
            AVG(t.pnl)
        )
        FROM Trade t 
        WHERE t.userId = :userId 
        AND t.entryTime BETWEEN :startDate AND :endDate
        """)
    TradeStatsDto getTradeStatistics(
        @Param("userId") String userId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
}
```

#### 7.3.2 Caching Strategy
```java
@Service
@RequiredArgsConstructor
public class TradeAnalyticsService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    private final TradeRepository tradeRepository;
    
    @Cacheable(value = "trade-stats", key = "#userId + ':' + #period")
    public TradeStatsResponse getTradeStatistics(String userId, String period) {
        LocalDateTime startDate = calculateStartDate(period);
        LocalDateTime endDate = LocalDateTime.now();
        
        TradeStatsDto stats = tradeRepository.getTradeStatistics(userId, startDate, endDate);
        
        return TradeStatsResponse.builder()
            .totalTrades(stats.getTotalTrades())
            .winRate(stats.getWinRate())
            .totalPnl(stats.getTotalPnl())
            .avgPnlPerTrade(stats.getAvgPnlPerTrade())
            .build();
    }
    
    @CacheEvict(value = "trade-stats", key = "#userId + ':*'")
    public void invalidateUserStats(String userId) {
        // Cache will be invalidated automatically
    }
}
```

#### 7.3.3 Frontend Optimizations
```typescript
// Virtual scrolling for large trade lists
import { FixedSizeList as List } from 'react-window';

function TradeList({ trades }: { trades: Trade[] }) {
  const renderTradeItem = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TradeCard trade={trades[index]} />
    </div>
  );
  
  return (
    <List
      height={600}
      itemCount={trades.length}
      itemSize={120}
      className="trade-list"
    >
      {renderTradeItem}
    </List>
  );
}

// Optimized trade analytics with useMemo
function TradeAnalytics({ trades }: { trades: Trade[] }) {
  const analytics = useMemo(() => {
    const totalTrades = trades.length;
    const closedTrades = trades.filter(t => t.status === 'closed');
    const profitableTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    
    return {
      totalTrades,
      winRate: closedTrades.length > 0 ? (profitableTrades.length / closedTrades.length) * 100 : 0,
      totalPnl: closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0),
      avgPnlPerTrade: closedTrades.length > 0 
        ? closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / closedTrades.length 
        : 0
    };
  }, [trades]);
  
  return (
    <div className="analytics-grid">
      <StatCard title="Total Trades" value={analytics.totalTrades} />
      <StatCard title="Win Rate" value={`${analytics.winRate.toFixed(1)}%`} />
      <StatCard title="Total PnL" value={`$${analytics.totalPnl.toFixed(2)}`} />
      <StatCard title="Avg PnL/Trade" value={`$${analytics.avgPnlPerTrade.toFixed(2)}`} />
    </div>
  );
}
```

---

## 8. Security Considerations

### 8.1 Authentication & Authorization

#### 8.1.1 JWT Token Security
```java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        String token = extractTokenFromRequest(request);
        
        if (token != null && jwtTokenProvider.validateToken(token)) {
            String userId = jwtTokenProvider.getUserIdFromToken(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(userId);
            
            UsernamePasswordAuthenticationToken authentication = 
                new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

#### 8.1.2 User-specific Data Access
```java
@RestController
@PreAuthorize("hasRole('USER')")
public class TradeController {
    
    @GetMapping("/api/v1/trades/{tradeId}")
    @PreAuthorize("@tradeSecurityService.isTradeOwner(#tradeId, authentication.principal.id)")
    public ResponseEntity<TradeResponse> getTrade(@PathVariable String tradeId) {
        // Implementation
    }
}

@Service
public class TradeSecurityService {
    
    public boolean isTradeOwner(String tradeId, String userId) {
        return tradeRepository.existsByIdAndUserId(tradeId, userId);
    }
}
```

### 8.2 Input Validation & Sanitization

#### 8.2.1 Backend Validation
```java
@RestController
@Validated
public class TradeController {
    
    @PostMapping("/api/v1/trades")
    public ResponseEntity<TradeResponse> createTrade(
            @Valid @RequestBody CreateTradeRequest request,
            Authentication auth) {
        
        // Additional business validation
        validateTradeBusinessRules(request);
        
        String userId = ((UserPrincipal) auth.getPrincipal()).getId();
        TradeResponse trade = tradeService.createTrade(userId, request);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(trade);
    }
    
    private void validateTradeBusinessRules(CreateTradeRequest request) {
        // Price validation
        if (request.getEntryPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Entry price must be positive");
        }
        
        // Symbol format validation
        if (!request.getSymbol().matches("^[A-Z]{6,12}$")) {
            throw new ValidationException("Invalid symbol format");
        }
        
        // Date validation
        if (request.getExitTime() != null && 
            request.getExitTime().isBefore(request.getEntryTime())) {
            throw new ValidationException("Exit time cannot be before entry time");
        }
    }
}
```

#### 8.2.2 Frontend Validation
```typescript
// Comprehensive validation schema
export const createTradeSchema = z.object({
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(12, 'Symbol too long')
    .regex(/^[A-Z]+$/, 'Symbol must contain only uppercase letters'),
    
  type: z.enum(['buy', 'sell']),
  
  tradingType: z.enum(['breakout', 'trend', 'counter_trend']),
  
  quantity: z.number()
    .positive('Quantity must be positive')
    .max(1000000, 'Quantity too large')
    .refine(value => {
      // Check for reasonable decimal places
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      return decimalPlaces <= 8;
    }, 'Too many decimal places'),
    
  entryPrice: z.number()
    .positive('Entry price must be positive')
    .max(10000000, 'Price too high'),
    
  exitPrice: z.number()
    .positive('Exit price must be positive')
    .optional()
    .refine((value, ctx) => {
      if (value && ctx.parent.type === 'buy' && ctx.parent.stopLoss) {
        return value >= ctx.parent.stopLoss;
      }
      return true;
    }, 'Exit price cannot be below stop loss for buy trades'),
    
  memo: z.string()
    .max(500, 'Memo too long')
    .optional()
    .refine(value => {
      // Basic XSS prevention
      if (value) {
        const dangerousPatterns = ['<script', 'javascript:', 'onload=', 'onerror='];
        return !dangerousPatterns.some(pattern => 
          value.toLowerCase().includes(pattern.toLowerCase())
        );
      }
      return true;
    }, 'Invalid characters in memo')
});
```

### 8.3 API Security

#### 8.3.1 Rate Limiting
```java
@Component
public class RateLimitingFilter implements Filter {
    
    private final RedisTemplate<String, String> redisTemplate;
    private final Map<String, Integer> rateLimits = Map.of(
        "/api/v1/trades", 100,  // 100 requests per minute
        "/api/v1/trades/sync", 10   // 10 sync requests per minute
    );
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String clientId = getClientId(httpRequest);
        String endpoint = httpRequest.getRequestURI();
        String key = "rate_limit:" + clientId + ":" + endpoint;
        
        Integer limit = rateLimits.get(endpoint);
        if (limit != null) {
            String countStr = redisTemplate.opsForValue().get(key);
            int count = countStr != null ? Integer.parseInt(countStr) : 0;
            
            if (count >= limit) {
                httpResponse.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                httpResponse.getWriter().write("Rate limit exceeded");
                return;
            }
            
            redisTemplate.opsForValue().increment(key);
            redisTemplate.expire(key, Duration.ofMinutes(1));
        }
        
        chain.doFilter(request, response);
    }
}
```

#### 8.3.2 API Key Management (Binance)
```java
@Service
public class BinanceCredentialsService {
    
    private final AESUtil aesUtil;
    private final UserRepository userRepository;
    
    public void saveBinanceCredentials(String userId, String apiKey, String secretKey) {
        // Encrypt sensitive data
        String encryptedApiKey = aesUtil.encrypt(apiKey);
        String encryptedSecretKey = aesUtil.encrypt(secretKey);
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));
        
        user.setBinanceApiKey(encryptedApiKey);
        user.setBinanceSecretKey(encryptedSecretKey);
        userRepository.save(user);
        
        // Audit log
        auditService.logSensitiveOperation(userId, "BINANCE_CREDENTIALS_UPDATED");
    }
    
    public BinanceCredentials getBinanceCredentials(String userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));
        
        if (user.getBinanceApiKey() == null) {
            throw new BusinessException("Binance credentials not configured");
        }
        
        return BinanceCredentials.builder()
            .apiKey(aesUtil.decrypt(user.getBinanceApiKey()))
            .secretKey(aesUtil.decrypt(user.getBinanceSecretKey()))
            .build();
    }
}
```

---

## 9. Deployment and DevOps

### 9.1 Environment Configuration

#### 9.1.1 Application Properties
```yaml
# application-prod.yml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:cryptodb}
    username: ${DB_USERNAME:cryptouser}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
  
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}
    password: ${REDIS_PASSWORD:}
    timeout: 2000ms
    lettuce:
      pool:
        max-active: 20
        max-idle: 8
        min-idle: 2
  
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        format_sql: false
        jdbc:
          batch_size: 20
        order_inserts: true
        order_updates: true

jwt:
  secret: ${JWT_SECRET}
  expiration: 86400000  # 24 hours

binance:
  api:
    base-url: https://api.binance.com
    timeout: 5000

ml:
  scoring:
    url: ${ML_SERVICE_URL:http://localhost:8001}

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always

logging:
  level:
    com.example.trading_bot: INFO
    org.springframework.security: WARN
  pattern:
    file: "%d{ISO8601} [%thread] %-5level %logger{36} - %msg%n"
  file:
    name: logs/trading-bot.log
    max-size: 100MB
    max-history: 30
```

### 9.2 Docker Configuration

#### 9.2.1 Backend Dockerfile
```dockerfile
# backend/Dockerfile
FROM openjdk:17-jdk-slim

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy gradle files
COPY gradle/ gradle/
COPY gradlew build.gradle settings.gradle ./
RUN chmod +x gradlew

# Download dependencies (cache layer)
COPY src/main/resources/application.yml src/main/resources/
RUN ./gradlew dependencies --no-daemon

# Copy source code
COPY src/ src/

# Build application
RUN ./gradlew build --no-daemon -x test

# Create non-root user
RUN addgroup --system --gid 1001 spring && \
    adduser --system --uid 1001 --gid 1001 spring

# Copy built JAR
COPY --chown=spring:spring build/libs/*.jar app.jar

USER spring

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### 9.2.2 Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 9.3 Docker Compose

#### 9.3.1 Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: cryptodb
      POSTGRES_USER: cryptouser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database_setup.sql:/docker-entrypoint-initdb.d/database_setup.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cryptouser -d cryptodb"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DB_HOST: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      ML_SERVICE_URL: http://ml-scoring:8001
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8080
    ports:
      - "3000:3000"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

  ml-scoring:
    build:
      context: ./ml_scoring
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://cryptouser:${DB_PASSWORD}@postgres:5432/cryptodb
    ports:
      - "8001:8001"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: crypto-trading-network
```

### 9.4 CI/CD Pipeline

#### 9.4.1 GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  DOCKER_REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Cache Gradle packages
      uses: actions/cache@v3
      with:
        path: |
          ~/.gradle/caches
          ~/.gradle/wrapper
        key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
        restore-keys: |
          ${{ runner.os }}-gradle-
    
    - name: Run backend tests
      working-directory: ./backend
      run: |
        chmod +x gradlew
        ./gradlew test
      env:
        DB_URL: jdbc:postgresql://localhost:5432/testdb
        DB_USERNAME: testuser
        DB_PASSWORD: testpass
    
    - name: Run frontend tests
      working-directory: ./frontend
      run: |
        npm ci
        npm run test
        npm run build
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: |
          backend/build/test-results/
          frontend/coverage/

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.DOCKER_REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push Docker images
      run: |
        docker build -t ${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}/backend:latest ./backend
        docker build -t ${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:latest ./frontend
        docker build -t ${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}/ml-scoring:latest ./ml_scoring
        
        docker push ${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}/backend:latest
        docker push ${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:latest
        docker push ${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}/ml-scoring:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to production
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/crypto-trading-journal
          git pull origin main
          docker-compose -f docker-compose.prod.yml pull
          docker-compose -f docker-compose.prod.yml up -d
          docker system prune -f
```

---

## 10. Monitoring and Observability

### 10.1 Health Checks

#### 10.1.1 Custom Health Indicators
```java
@Component
public class BinanceApiHealthIndicator implements HealthIndicator {
    
    private final BinanceApiClient binanceApiClient;
    
    @Override
    public Health health() {
        try {
            // Test Binance API connectivity
            binanceApiClient.getServerTime();
            return Health.up()
                .withDetail("binance_api", "Available")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("binance_api", "Unavailable")
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}

@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    
    private final TradeRepository tradeRepository;
    
    @Override
    public Health health() {
        try {
            long count = tradeRepository.count();
            return Health.up()
                .withDetail("database", "Available")
                .withDetail("trade_count", count)
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("database", "Unavailable")
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

### 10.2 Metrics Collection

#### 10.2.1 Custom Metrics
```java
@Component
@RequiredArgsConstructor
public class TradeMetrics {
    
    private final MeterRegistry meterRegistry;
    
    private final Counter tradeCreatedCounter;
    private final Timer tradeProcessingTimer;
    private final Gauge activeTradesGauge;
    
    @PostConstruct
    public void initMetrics() {
        this.tradeCreatedCounter = Counter.builder("trades.created")
            .description("Number of trades created")
            .tag("type", "all")
            .register(meterRegistry);
            
        this.tradeProcessingTimer = Timer.builder("trades.processing.time")
            .description("Time taken to process trades")
            .register(meterRegistry);
            
        this.activeTradesGauge = Gauge.builder("trades.active")
            .description("Number of active trades")
            .register(meterRegistry, this, TradeMetrics::getActiveTradeCount);
    }
    
    public void recordTradeCreated(String tradeType) {
        tradeCreatedCounter.increment(Tags.of("type", tradeType));
    }
    
    public Timer.Sample startTradeProcessing() {
        return Timer.start(meterRegistry);
    }
    
    public void recordTradeProcessingTime(Timer.Sample sample) {
        sample.stop(tradeProcessingTimer);
    }
    
    private double getActiveTradeCount() {
        // Implementation to get active trade count
        return tradeRepository.countByStatus(TradeStatus.OPEN);
    }
}
```

### 10.3 Logging Strategy

#### 10.3.1 Structured Logging
```java
@Slf4j
@Component
public class TradeAuditLogger {
    
    public void logTradeCreated(String userId, String tradeId, CreateTradeRequest request) {
        MDC.put("userId", userId);
        MDC.put("tradeId", tradeId);
        MDC.put("operation", "CREATE_TRADE");
        
        log.info("Trade created - Symbol: {}, Type: {}, Quantity: {}, EntryPrice: {}", 
            request.getSymbol(), 
            request.getType(), 
            request.getQuantity(), 
            request.getEntryPrice());
        
        MDC.clear();
    }
    
    public void logTradeUpdated(String userId, String tradeId, String field, Object oldValue, Object newValue) {
        MDC.put("userId", userId);
        MDC.put("tradeId", tradeId);
        MDC.put("operation", "UPDATE_TRADE");
        MDC.put("field", field);
        
        log.info("Trade updated - Field: {}, OldValue: {}, NewValue: {}", 
            field, oldValue, newValue);
        
        MDC.clear();
    }
    
    public void logBinanceSync(String userId, int syncedCount, int skippedCount) {
        MDC.put("userId", userId);
        MDC.put("operation", "BINANCE_SYNC");
        
        log.info("Binance sync completed - Synced: {}, Skipped: {}", 
            syncedCount, skippedCount);
        
        MDC.clear();
    }
}
```

---

## Conclusion

This comprehensive development guide provides a solid foundation for implementing the trades feature in your crypto trading journal application. The guide covers all aspects from system architecture to deployment, ensuring that the implementation follows clean architecture principles, maintains high code quality, and provides excellent user experience.

Key benefits of this approach:
- **Scalable Architecture**: Clean separation of concerns and domain-driven design
- **Security First**: Comprehensive security measures at all layers
- **Performance Optimized**: Caching, indexing, and efficient queries
- **Well Tested**: Comprehensive testing strategy across all layers
- **Production Ready**: Complete CI/CD pipeline and monitoring setup

Follow the phases sequentially for systematic development, and refer to the technical guidelines for implementation details. The provided code examples serve as templates that can be adapted to your specific requirements.
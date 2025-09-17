// 데모 데이터 생성 유틸리티

export const generatePriceData = (basePrice: number, volatility: number = 0.02) => {
  const change = (Math.random() - 0.5) * 2 * volatility;
  return basePrice * (1 + change);
};

export const generateTrade = () => {
  const symbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA'];
  const types = ['BUY', 'SELL'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const price = Math.random() * 10000 + 1000;
  const amount = Math.random() * 2;

  return {
    id: Math.random().toString(36).substr(2, 9),
    symbol,
    type,
    price: price.toFixed(2),
    amount: amount.toFixed(4),
    time: new Date().toLocaleTimeString(),
    profit: (Math.random() - 0.5) * 100,
  };
};

export const generateOrderBookData = () => {
  const generateOrders = (count: number, basePrice: number, isBid: boolean) => {
    return Array.from({ length: count }, (_, i) => {
      const priceOffset = (i + 1) * 0.01 * basePrice * (isBid ? -1 : 1);
      return {
        price: (basePrice + priceOffset).toFixed(2),
        amount: (Math.random() * 5).toFixed(4),
        total: ((basePrice + priceOffset) * Math.random() * 5).toFixed(2),
      };
    });
  };

  const basePrice = 42000;
  return {
    bids: generateOrders(5, basePrice, true),
    asks: generateOrders(5, basePrice, false),
  };
};

export const generatePortfolioData = () => {
  const assets = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA'];
  return assets.map(symbol => ({
    symbol,
    balance: (Math.random() * 10).toFixed(4),
    value: (Math.random() * 10000).toFixed(2),
    change24h: (Math.random() - 0.5) * 20,
    allocation: Math.random() * 100,
  }));
};

export const generateMLScore = () => {
  return {
    confidence: Math.random() * 100,
    prediction: Math.random() > 0.5 ? 'BULLISH' : 'BEARISH',
    riskLevel: Math.random() * 5,
    expectedReturn: (Math.random() - 0.5) * 50,
  };
};
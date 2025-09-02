/**
 * 포트폴리오 관련 타입 정의
 */

export interface PortfolioBalance {
  totalValueUsdt: number;
  totalValueBtc: number;
  balances: AssetBalance[];
  timestamp: string;
}

export interface AssetBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  priceUsdt: number;
  valueUsdt: number;
  allocation: number;
}

export interface Portfolio {
  id: number;
  symbol: string;          // BTCUSDT, ETHUSDT 등
  asset: string;           // BTC, ETH 등
  quantity: number;        // 보유 수량
  free: number;            // 사용 가능 수량
  locked: number;          // 잠긴 수량
  avgBuyPrice?: number;    // 평균 매수가
  totalInvested?: number;  // 총 투자 금액
  currentPrice?: number;   // 현재가
  currentValue?: number;   // 현재 평가 금액
  unrealizedPnl?: number;  // 미실현 손익
  unrealizedPnlPercent?: number;  // 미실현 손익률 (%)
  firstBuyDate?: string;   // 최초 매수일
  lastBuyDate?: string;    // 최근 매수일
  lastPriceUpdate?: string;    // 마지막 가격 업데이트
  lastBalanceUpdate?: string;  // 마지막 잔고 업데이트
  notes?: string;          // 메모
  isManualEntry?: boolean; // 수동 입력 여부
}

export interface PortfolioSummary {
  totalValue: number;       // 총 평가 금액
  totalInvested: number;    // 총 투자 금액
  totalPnl: number;         // 총 손익
  totalPnlPercent: number;  // 총 손익률
  assetCount: number;       // 보유 자산 수
  lastUpdate: string;       // 마지막 업데이트
}

export interface UpdateBuyPriceRequest {
  symbol: string;           // 심볼
  avgBuyPrice: number;      // 평균 매수가
  firstBuyDate?: string;    // 최초 매수일
  notes?: string;           // 메모
}

export interface PortfolioSyncResult {
  success: boolean;
  created: number;
  updated: number;
  totalAssets: number;
  message: string;
}

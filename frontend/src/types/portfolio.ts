/**
 * 포트폴리오 관련 타입 정의
 */

/**
 * 개별 자산 정보
 */
export interface AssetBalance {
  asset: string;          // 코인 심볼 (BTC, ETH 등)
  free: number;           // 사용 가능 잔고
  locked: number;         // 잠긴 잔고
  total: number;          // 총 잔고
  priceUsdt: number;      // 현재 USDT 가격
  valueUsdt: number;      // USDT 환산 가치
  allocation: number;     // 포트폴리오 내 비중 (%)
}

/**
 * 포트폴리오 잔고 응답
 */
export interface PortfolioBalance {
  totalValueUsdt: number;  // 총 자산 가치 (USDT)
  totalValueBtc: number;   // 총 자산 가치 (BTC)
  balances: AssetBalance[]; // 개별 자산 목록
  timestamp: string;       // 조회 시간
}
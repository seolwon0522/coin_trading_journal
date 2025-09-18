import { NextRequest, NextResponse } from 'next/server';
import { CoinRanking } from '@/types/market';

// 코인 검색 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.toLowerCase();
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    // Binance API에서 24시간 티커 데이터 가져오기
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 }, // 30초 캐시
    });

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    // 검색 쿼리에 맞는 코인 필터링 및 변환
    const searchResults: CoinRanking[] = data
      .filter((ticker: any) => {
        const symbol = ticker.symbol.toLowerCase();
        // 심볼이 검색어로 시작하거나 포함하는 경우
        return symbol.includes(query) || symbol.startsWith(query);
      })
      .map((ticker: any, index: number) => {
        // 심볼에서 base와 quote 자산 분리
        let baseAsset = '';
        let quoteAsset = '';

        if (ticker.symbol.endsWith('USDT')) {
          baseAsset = ticker.symbol.slice(0, -4);
          quoteAsset = 'USDT';
        } else if (ticker.symbol.endsWith('BTC')) {
          baseAsset = ticker.symbol.slice(0, -3);
          quoteAsset = 'BTC';
        } else if (ticker.symbol.endsWith('BUSD')) {
          baseAsset = ticker.symbol.slice(0, -4);
          quoteAsset = 'BUSD';
        } else if (ticker.symbol.endsWith('ETH')) {
          baseAsset = ticker.symbol.slice(0, -3);
          quoteAsset = 'ETH';
        } else {
          // 다른 경우 처리
          baseAsset = ticker.symbol;
          quoteAsset = 'UNKNOWN';
        }

        return {
          symbol: ticker.symbol,
          baseAsset,
          quoteAsset,
          rank: index + 1,
          volume24h: parseFloat(ticker.volume) || 0,
          quoteVolume24h: parseFloat(ticker.quoteVolume) || 0,
          priceChangePercent24h: parseFloat(ticker.priceChangePercent) || 0,
          lastPrice: parseFloat(ticker.lastPrice) || 0,
          bidPrice: parseFloat(ticker.bidPrice) || 0,
          askPrice: parseFloat(ticker.askPrice) || 0,
          highPrice24h: parseFloat(ticker.highPrice) || 0,
          lowPrice24h: parseFloat(ticker.lowPrice) || 0,
          openPrice24h: parseFloat(ticker.openPrice) || 0,
          prevClosePrice: parseFloat(ticker.prevClosePrice) || 0,
          weightedAvgPrice: parseFloat(ticker.weightedAvgPrice) || 0,
          count24h: parseInt(ticker.count) || 0,
          tier: 2,
          isActive: true,
          lastUpdateTime: new Date().toISOString(),
        };
      })
      // 거래량 기준으로 정렬
      .sort((a: CoinRanking, b: CoinRanking) => b.quoteVolume24h - a.quoteVolume24h)
      // 지정된 개수만 반환
      .slice(0, limit);

    return NextResponse.json(searchResults);
  } catch (error) {
    console.error('Error searching market data:', error);
    return NextResponse.json(
      { error: 'Failed to search market data' },
      { status: 500 }
    );
  }
}
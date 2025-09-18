import { NextRequest, NextResponse } from 'next/server';
import { CoinRanking } from '@/types/market';

// 추가 데이터 로드 API (페이지네이션)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const quoteAsset = searchParams.get('quoteAsset');

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

    // CoinRanking 형식으로 변환
    let coins: CoinRanking[] = data
      .filter((ticker: any) => {
        // quoteAsset 필터링
        if (quoteAsset) {
          return ticker.symbol.endsWith(quoteAsset.toUpperCase());
        }
        // 기본적으로 USDT, BTC, BUSD, ETH 마켓만 포함
        return ticker.symbol.endsWith('USDT') ||
               ticker.symbol.endsWith('BTC') ||
               ticker.symbol.endsWith('BUSD') ||
               ticker.symbol.endsWith('ETH');
      })
      .map((ticker: any, index: number) => {
        // 심볼에서 base와 quote 자산 분리
        let baseAsset = '';
        let quoteAssetLocal = '';

        if (ticker.symbol.endsWith('USDT')) {
          baseAsset = ticker.symbol.slice(0, -4);
          quoteAssetLocal = 'USDT';
        } else if (ticker.symbol.endsWith('BTC')) {
          baseAsset = ticker.symbol.slice(0, -3);
          quoteAssetLocal = 'BTC';
        } else if (ticker.symbol.endsWith('BUSD')) {
          baseAsset = ticker.symbol.slice(0, -4);
          quoteAssetLocal = 'BUSD';
        } else if (ticker.symbol.endsWith('ETH')) {
          baseAsset = ticker.symbol.slice(0, -3);
          quoteAssetLocal = 'ETH';
        } else {
          baseAsset = ticker.symbol;
          quoteAssetLocal = 'UNKNOWN';
        }

        return {
          symbol: ticker.symbol,
          baseAsset,
          quoteAsset: quoteAssetLocal,
          rank: 0,
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
          tier: 3,
          isActive: true,
          lastUpdateTime: new Date().toISOString(),
        };
      })
      // 거래량 기준으로 정렬
      .sort((a: CoinRanking, b: CoinRanking) => b.quoteVolume24h - a.quoteVolume24h)
      // 랭킹 설정
      .map((coin: CoinRanking, index: number) => ({
        ...coin,
        rank: index + 1,
      }));

    // 페이지네이션 적용
    const paginatedCoins = coins.slice(offset, offset + limit);

    return NextResponse.json(paginatedCoins);
  } catch (error) {
    console.error('Error loading more market data:', error);
    return NextResponse.json(
      { error: 'Failed to load more market data' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { TieredMarketData, CoinRanking } from '@/types/market';

// Binance API로부터 시장 데이터를 가져와서 계층화
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quoteAsset = searchParams.get('quoteAsset');

    // Binance API에서 24시간 티커 데이터 가져오기
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 10 }, // 10초 캐시
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
        }

        return {
          symbol: ticker.symbol,
          baseAsset,
          quoteAsset: quoteAssetLocal,
          rank: 0, // 나중에 정렬 후 설정
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
          tier: 3, // 기본 tier
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
        tier: index < 20 ? 1 : index < 100 ? 2 : 3, // tier 설정
      }));

    // 계층화된 데이터 구성
    const tieredData: TieredMarketData = {
      premium: coins.filter(c => c.tier === 1).slice(0, 20),
      standard: coins.filter(c => c.tier === 2).slice(0, 80),
      extended: coins.filter(c => c.tier === 3).slice(0, 100),
      totalCount: coins.length,
      lastUpdate: new Date().toISOString(),
      quoteAsset,
      loadTime: 100, // 예시 로드 시간
      cacheStatus: 'MISS', // 실제로는 캐시 로직 구현 필요
    };

    return NextResponse.json(tieredData);
  } catch (error) {
    console.error('Error fetching tiered market data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
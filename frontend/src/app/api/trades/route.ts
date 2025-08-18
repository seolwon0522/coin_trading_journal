import { NextRequest, NextResponse } from 'next/server';
import { createTradeSchema } from '@/schemas/trade';
import { z } from 'zod';
import type { Trade } from '@/types/trade';
import {
  computeStrategyScore,
  computeForbiddenPoints,
  TOTAL_FORBIDDEN_POINTS,
} from '@/lib/strategy-scoring';
import { trades, calculatePnL } from './data';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL; // e.g. http://localhost:8000

// GET /api/trades - 거래 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Backend proxy (preferred). 실패(404/오류) 시 로컬 fallback으로 전환
    if (BACKEND_BASE_URL) {
      try {
        const qs = searchParams.toString();
        // 한글 주석: 스프링 백엔드 매핑은 `/api/trades` 이므로 해당 경로로 프록시
        const url = `${BACKEND_BASE_URL.replace(/\/$/, '')}/api/trades${qs ? `?${qs}` : ''}`;
        const authHeader = request.headers.get('authorization');
        const resp = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
        });

        if (resp.ok) {
          const data = await resp.json();
          return NextResponse.json(data, { status: resp.status });
        }

        console.warn(
          `BACKEND proxy GET /trades failed with status ${resp.status}. Falling back to local.`
        );
      } catch (err) {
        console.warn('BACKEND proxy GET /trades error. Falling back to local.', err);
      }
    }

    // Fallback: local in-memory list
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type') as 'buy' | 'sell' | null;
    const status = searchParams.get('status') as 'open' | 'closed' | null;

    let filteredTrades = trades;
    if (symbol)
      filteredTrades = filteredTrades.filter((t) =>
        t.symbol.toLowerCase().includes(symbol.toLowerCase())
      );
    if (type) filteredTrades = filteredTrades.filter((t) => t.type === type);
    if (status) filteredTrades = filteredTrades.filter((t) => t.status === status);

    filteredTrades.sort(
      (a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()
    );
    const paginatedTrades = filteredTrades.slice(offset, offset + limit);

    return NextResponse.json({
      trades: paginatedTrades,
      total: filteredTrades.length,
      page: Math.floor(offset / limit) + 1,
      limit,
    });
  } catch (error) {
    console.error('거래 조회 에러:', error);
    return NextResponse.json({ error: '거래 목록을 불러오는데 실패했습니다' }, { status: 500 });
  }
}

// POST /api/trades - 새 거래 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 입력 검증 (프론트 API에서는 최소 검증만 수행)
    const validatedData = createTradeSchema.parse(body);

    // Backend proxy (preferred). 실패(404/오류) 시 로컬 fallback으로 전환
    if (BACKEND_BASE_URL) {
      try {
        // 한글 주석: 스프링 백엔드 매핑은 `/api/trades`
        const url = `${BACKEND_BASE_URL.replace(/\/$/, '')}/api/trades`;
        const authHeader = request.headers.get('authorization');
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          body: JSON.stringify(validatedData),
        });

        if (resp.ok) {
          const data = await resp.json();
          return NextResponse.json(data, { status: resp.status });
        }

        console.warn(
          `BACKEND proxy POST /trades failed with status ${resp.status}. Falling back to local.`
        );
      } catch (err) {
        console.warn('BACKEND proxy POST /trades error. Falling back to local.', err);
      }
    }

    // Fallback: local compute + in-memory store
    const newTrade: Trade = {
      id: Date.now().toString(), // 실제로는 UUID 사용 권장
      symbol: validatedData.symbol,
      type: validatedData.type,
      tradingType: validatedData.tradingType,
      quantity: validatedData.quantity,
      entryPrice: validatedData.entryPrice,
      exitPrice: validatedData.exitPrice,
      entryTime: new Date(validatedData.entryTime),
      exitTime: validatedData.exitTime ? new Date(validatedData.exitTime) : undefined,
      memo: validatedData.memo,
      stopLoss: validatedData.stopLoss,
      indicators: validatedData.indicators,
      status: validatedData.exitPrice ? 'closed' : 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    newTrade.pnl = calculatePnL(newTrade);

    const strategyScore = computeStrategyScore(newTrade, validatedData.indicators);
    if (strategyScore) newTrade.strategyScore = strategyScore;

    const forbiddenPoints = computeForbiddenPoints(newTrade, trades, 100000);
    newTrade.forbiddenPenalty = TOTAL_FORBIDDEN_POINTS - forbiddenPoints;

    const base = strategyScore?.totalScore ?? 0;
    newTrade.finalScore = base + forbiddenPoints;

    trades.unshift(newTrade);

    return NextResponse.json(newTrade, { status: 201 });
  } catch (error) {
    console.error('거래 등록 에러:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: '거래 등록에 실패했습니다' }, { status: 500 });
  }
}

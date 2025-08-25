import { NextRequest, NextResponse } from 'next/server';
import { trades, calculatePnL } from '../data';
import { createTradeSchema } from '@/schemas/trade';
import { z } from 'zod';
import {
  computeStrategyScore,
  computeForbiddenPoints,
  TOTAL_FORBIDDEN_POINTS,
} from '@/lib/strategy-scoring';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;

// 개별 거래 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const validatedData = createTradeSchema.partial().parse(body);

    if (BACKEND_BASE_URL) {
      try {
        const url = `${BACKEND_BASE_URL.replace(/\/$/, '')}/trades/${id}`;
        const resp = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validatedData),
        });
        if (resp.ok) {
          const data = await resp.json();
          return NextResponse.json(data, { status: resp.status });
        }
        console.warn(
          `BACKEND proxy PUT /trades/${id} failed with status ${resp.status}. Falling back to local.`
        );
      } catch (err) {
        console.warn('BACKEND proxy PUT /trades error. Falling back to local.', err);
      }
    }

    const index = trades.findIndex((t) => t.id === id);
    if (index === -1)
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });

    const existing = trades[index];
    const updated = {
      ...existing,
      ...validatedData,
      entryTime: validatedData.entryTime
        ? new Date(validatedData.entryTime)
        : existing.entryTime,
      exitTime: validatedData.exitTime
        ? new Date(validatedData.exitTime)
        : existing.exitTime,
      updatedAt: new Date(),
    };

    updated.pnl = calculatePnL(updated);
    updated.status = updated.exitPrice ? 'closed' : existing.status;

    const strategyScore = computeStrategyScore(updated, updated.indicators);
    if (strategyScore) updated.strategyScore = strategyScore;
    const forbiddenPoints = computeForbiddenPoints(updated, trades, 100000);
    updated.forbiddenPenalty = TOTAL_FORBIDDEN_POINTS - forbiddenPoints;
    const base = strategyScore?.totalScore ?? 0;
    updated.finalScore = base + forbiddenPoints;

    trades[index] = updated;
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: '거래 수정에 실패했습니다' },
      { status: 500 }
    );
  }
}

// 개별 거래 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (BACKEND_BASE_URL) {
      try {
        const url = `${BACKEND_BASE_URL.replace(/\/$/, '')}/trades/${id}`;
        const resp = await fetch(url, { method: 'DELETE' });
        if (resp.ok) {
          return NextResponse.json(null, { status: resp.status });
        }
        console.warn(
          `BACKEND proxy DELETE /trades/${id} failed with status ${resp.status}. Falling back to local.`
        );
      } catch (err) {
        console.warn('BACKEND proxy DELETE /trades error. Falling back to local.', err);
      }
    }

    const index = trades.findIndex((t) => t.id === id);
    if (index === -1)
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });

    trades.splice(index, 1);
    return NextResponse.json(null);
  } catch {
    return NextResponse.json(
      { error: '거래 삭제에 실패했습니다' },
      { status: 500 }
    );
  }
}

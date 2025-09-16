import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching exchange info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange info' },
      { status: 500 }
    );
  }
}
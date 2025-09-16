'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TradingPage() {
  const router = useRouter();

  useEffect(() => {
    // Default to BTCUSDT
    router.replace('/trading/BTCUSDT');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse">Loading...</div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';

interface ExchangeRate {
  usdToKrw: number;
  lastUpdate: string;
}

// 환율 API - 무료 서비스 사용 (exchangerate-api.com)
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

// 대체 API - 한국수출입은행 (CORS 문제가 있을 수 있음)
const BACKUP_API = 'https://api.exchangerate.host/latest?base=USD&symbols=KRW';

// 기본 환율 (API 실패 시 사용)
const DEFAULT_RATE = 1320;

export function useExchangeRate() {
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>({
    usdToKrw: DEFAULT_RATE,
    lastUpdate: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        setLoading(true);
        setError(null);

        // 먼저 로컬 스토리지에서 캐시된 환율 확인
        const cached = localStorage.getItem('exchangeRate');
        if (cached) {
          const parsed = JSON.parse(cached);
          const cacheTime = new Date(parsed.lastUpdate).getTime();
          const now = new Date().getTime();
          
          // 1시간 이내의 캐시는 그대로 사용
          if (now - cacheTime < 3600000) {
            setExchangeRate(parsed);
            setLoading(false);
            return;
          }
        }

        // Primary API 시도
        let response = await fetch(EXCHANGE_RATE_API);
        
        if (!response.ok) {
          // Backup API 시도
          response = await fetch(BACKUP_API);
        }

        if (response.ok) {
          const data = await response.json();
          const rate = data.rates?.KRW || data.KRW || DEFAULT_RATE;
          
          const newRate = {
            usdToKrw: rate,
            lastUpdate: new Date().toISOString(),
          };

          setExchangeRate(newRate);
          
          // 로컬 스토리지에 캐시
          localStorage.setItem('exchangeRate', JSON.stringify(newRate));
        } else {
          throw new Error('환율 정보를 가져올 수 없습니다');
        }
      } catch (err) {
        console.error('Exchange rate fetch error:', err);
        setError('환율 정보를 가져오는데 실패했습니다. 기본 환율을 사용합니다.');
        
        // 기본 환율 사용
        const defaultRate = {
          usdToKrw: DEFAULT_RATE,
          lastUpdate: new Date().toISOString(),
        };
        setExchangeRate(defaultRate);
      } finally {
        setLoading(false);
      }
    };

    fetchExchangeRate();
    
    // 30분마다 환율 업데이트
    const interval = setInterval(fetchExchangeRate, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 환율 변환 함수들
  const usdToKrw = (usd: number): number => {
    return usd * exchangeRate.usdToKrw;
  };

  const krwToUsd = (krw: number): number => {
    return krw / exchangeRate.usdToKrw;
  };

  // 포맷팅 함수들
  const formatUSD = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 1 ? 8 : 2,
    }).format(value);
  };

  const formatKRW = (value: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // 수동 환율 업데이트 함수
  const updateRate = (newRate: number) => {
    const updated = {
      usdToKrw: newRate,
      lastUpdate: new Date().toISOString(),
    };
    setExchangeRate(updated);
    localStorage.setItem('exchangeRate', JSON.stringify(updated));
  };

  return {
    exchangeRate: exchangeRate.usdToKrw,
    lastUpdate: exchangeRate.lastUpdate,
    loading,
    error,
    usdToKrw,
    krwToUsd,
    formatUSD,
    formatKRW,
    updateRate,
  };
}

// 간단한 환율 표시 컴포넌트용 함수
export function formatCurrency(value: number, currency: 'USD' | 'KRW'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 1 ? 8 : 2,
    }).format(value);
  } else {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
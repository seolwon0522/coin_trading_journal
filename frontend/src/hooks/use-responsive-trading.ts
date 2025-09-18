'use client';

import { useState, useEffect } from 'react';

export function useResponsiveTrading() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [mobileActiveTab, setMobileActiveTab] = useState<'chart' | 'orderbook' | 'orderform' | 'market'>('chart');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    mobileActiveTab,
    setMobileActiveTab,
  };
}
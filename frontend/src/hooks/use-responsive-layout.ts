'use client';

import { useState, useEffect } from 'react';

// 브레이크포인트 상수 정의
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1280,
  laptop: 1920,
} as const;

// 레이아웃 설정 타입
interface LayoutConfig {
  showMarketList: boolean;
  showOrderBook: boolean;
  showOrderForm: boolean;
  isCompactMode: boolean;
}

// 디바이스 타입
type DeviceType = 'mobile' | 'tablet' | 'laptop' | 'desktop';

// 디바이스 타입 감지
function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  if (width < BREAKPOINTS.laptop) return 'laptop';
  return 'desktop';
}

// 디바이스별 레이아웃 설정
const LAYOUT_CONFIGS: Record<DeviceType, LayoutConfig> = {
  mobile: {
    showMarketList: false,
    showOrderBook: false,
    showOrderForm: false,
    isCompactMode: true,
  },
  tablet: {
    showMarketList: false,
    showOrderBook: true,
    showOrderForm: false,
    isCompactMode: true,
  },
  laptop: {
    showMarketList: true,
    showOrderBook: true,
    showOrderForm: true,
    isCompactMode: true,
  },
  desktop: {
    showMarketList: true,
    showOrderBook: true,
    showOrderForm: true,
    isCompactMode: false,
  },
};

export function useResponsiveLayout() {
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(
    LAYOUT_CONFIGS.desktop
  );
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const newDeviceType = getDeviceType(width);
      setDeviceType(newDeviceType);
      setLayoutConfig(LAYOUT_CONFIGS[newDeviceType]);
    };

    // 초기 설정
    updateLayout();

    // 리사이즈 이벤트 리스너
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  // 개별 레이아웃 토글 함수들
  const toggleMarketList = () => {
    setLayoutConfig(prev => ({
      ...prev,
      showMarketList: !prev.showMarketList,
    }));
  };

  const toggleOrderBook = () => {
    setLayoutConfig(prev => ({
      ...prev,
      showOrderBook: !prev.showOrderBook,
      // 태블릿에서 호가창 켜면 주문폼 끄기
      showOrderForm: prev.showOrderBook ? prev.showOrderForm : false,
    }));
  };

  const toggleOrderForm = () => {
    setLayoutConfig(prev => ({
      ...prev,
      showOrderForm: !prev.showOrderForm,
      // 태블릿에서 주문폼 켜면 호가창 끄기
      showOrderBook: prev.showOrderForm ? prev.showOrderBook : false,
    }));
  };

  return {
    ...layoutConfig,
    deviceType,
    toggleMarketList,
    toggleOrderBook,
    toggleOrderForm,
  };
}
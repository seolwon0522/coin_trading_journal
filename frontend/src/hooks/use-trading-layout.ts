'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LayoutPreset {
  id: string;
  name: string;
  icon: string;
  config: {
    marketListSize?: number;
    orderBookSize?: number;
    orderFormSize?: number;
    bottomPanelSize?: number;
    showMarketList: boolean;
    showOrderBook: boolean;
    showOrderForm: boolean;
    showBottomPanel: boolean;
  };
}

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'default',
    name: '기본',
    icon: '⚡',
    config: {
      marketListSize: 20,
      orderBookSize: 20,
      orderFormSize: 20,
      bottomPanelSize: 20,
      showMarketList: true,
      showOrderBook: true,
      showOrderForm: true,
      showBottomPanel: true,
    },
  },
  {
    id: 'chart-focus',
    name: '차트 중심',
    icon: '📊',
    config: {
      marketListSize: 0,
      orderBookSize: 15,
      orderFormSize: 15,
      bottomPanelSize: 15,
      showMarketList: false,
      showOrderBook: true,
      showOrderForm: true,
      showBottomPanel: true,
    },
  },
  {
    id: 'trading',
    name: '트레이딩',
    icon: '💹',
    config: {
      marketListSize: 20,
      orderBookSize: 25,
      orderFormSize: 25,
      bottomPanelSize: 20,
      showMarketList: true,
      showOrderBook: true,
      showOrderForm: true,
      showBottomPanel: true,
    },
  },
  {
    id: 'analysis',
    name: '분석',
    icon: '🔍',
    config: {
      marketListSize: 15,
      orderBookSize: 0,
      orderFormSize: 0,
      bottomPanelSize: 30,
      showMarketList: true,
      showOrderBook: false,
      showOrderForm: false,
      showBottomPanel: true,
    },
  },
  {
    id: 'minimal',
    name: '미니멀',
    icon: '✨',
    config: {
      marketListSize: 0,
      orderBookSize: 0,
      orderFormSize: 0,
      bottomPanelSize: 0,
      showMarketList: false,
      showOrderBook: false,
      showOrderForm: false,
      showBottomPanel: false,
    },
  },
];

const STORAGE_KEY = 'trading-layout-config';

export function useTradingLayout() {
  const [currentPreset, setCurrentPreset] = useState<string>('default');
  const [customConfig, setCustomConfig] = useState<LayoutPreset['config'] | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load saved layout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.preset) {
          setCurrentPreset(parsed.preset);
        }
        if (parsed.custom) {
          setCustomConfig(parsed.custom);
        }
      } catch (error) {
        console.error('Failed to load layout config:', error);
      }
    }
  }, []);

  // Save layout to localStorage
  const saveLayout = useCallback((preset: string, custom?: LayoutPreset['config']) => {
    const data = {
      preset,
      custom: custom || customConfig,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [customConfig]);

  // Apply preset
  const applyPreset = useCallback((presetId: string) => {
    setCurrentPreset(presetId);
    setCustomConfig(null);
    saveLayout(presetId, undefined);
  }, [saveLayout]);

  // Save custom layout
  const saveCustomLayout = useCallback((config: LayoutPreset['config']) => {
    setCustomConfig(config);
    setCurrentPreset('custom');
    saveLayout('custom', config);
  }, [saveLayout]);

  // Get current layout config
  const getCurrentConfig = useCallback(() => {
    if (currentPreset === 'custom' && customConfig) {
      return customConfig;
    }
    const preset = LAYOUT_PRESETS.find(p => p.id === currentPreset);
    return preset?.config || LAYOUT_PRESETS[0].config;
  }, [currentPreset, customConfig]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error('Failed to exit fullscreen:', err);
      });
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // F11 for fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
      // Ctrl/Cmd + number for presets
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
        const index = parseInt(e.key) - 1;
        if (LAYOUT_PRESETS[index]) {
          applyPreset(LAYOUT_PRESETS[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [toggleFullscreen, applyPreset]);

  return {
    presets: LAYOUT_PRESETS,
    currentPreset,
    currentConfig: getCurrentConfig(),
    isFullscreen,
    applyPreset,
    saveCustomLayout,
    toggleFullscreen,
  };
}
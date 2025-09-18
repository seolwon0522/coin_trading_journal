// Binance 공식 디자인 시스템
export const binanceTheme = {
  // 색상 시스템
  colors: {
    background: {
      primary: '#0b0e11',      // 메인 배경색
      secondary: '#161a1e',    // 카드/섹션 배경색
      tertiary: '#1e2024',     // 호버/액티브 배경색
      quaternary: '#252930',   // 선택된 항목 배경색
      overlay: 'rgba(0, 0, 0, 0.9)', // 오버레이 배경
    },
    border: {
      default: '#2b3139',      // 기본 테두리
      hover: '#474d57',        // 호버 시 테두리
      active: '#5e6673',       // 액티브 상태 테두리
    },
    text: {
      primary: '#eaecef',      // 주요 텍스트
      secondary: '#848e9c',    // 보조 텍스트
      tertiary: '#5e6673',     // 희미한 텍스트
      quaternary: '#474d57',   // 비활성 텍스트
    },
    market: {
      up: '#0ecb81',           // 상승/매수/긍정
      down: '#f6465d',         // 하락/매도/부정
      upLight: 'rgba(14, 203, 129, 0.1)',     // 상승 배경
      downLight: 'rgba(246, 70, 93, 0.1)',    // 하락 배경
    },
    accent: {
      yellow: '#fcd535',       // 프리미엄/강조
      yellowLight: 'rgba(252, 213, 53, 0.1)', // 노란색 배경
      blue: '#1e60d8',         // 정보
      purple: '#8b5cf6',       // 특별
    },
    status: {
      success: '#0ecb81',      // 성공
      error: '#f6465d',        // 오류
      warning: '#fcd535',      // 경고
      info: '#1e60d8',         // 정보
    },
  },

  // 타이포그래피 시스템
  typography: {
    fontSize: {
      xs: '10px',     // 가장 작은 라벨
      sm: '12px',     // 기본 텍스트
      base: '14px',   // 중요 정보
      lg: '16px',     // 헤더
      xl: '20px',     // 가격 표시
      '2xl': '24px',  // 메인 가격
      '3xl': '32px',  // 대형 숫자
    },
    fontWeight: {
      normal: 400,    // 일반
      medium: 500,    // 중간
      semibold: 600,  // 약간 굵게
      bold: 700,      // 굵게
    },
    lineHeight: {
      tight: 1.2,     // 좁게
      normal: 1.5,    // 보통
      relaxed: 1.75,  // 넓게
    },
  },

  // 간격 시스템 (4px 기본 단위)
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },

  // 모서리 둥글기
  borderRadius: {
    none: '0',
    sm: '2px',
    base: '4px',
    md: '6px',
    lg: '8px',
    full: '9999px',
  },

  // 그림자
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    base: '0 2px 4px rgba(0, 0, 0, 0.4)',
    md: '0 4px 6px rgba(0, 0, 0, 0.5)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.6)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.7)',
  },

  // 트랜지션
  transitions: {
    fast: '150ms ease',
    base: '250ms ease',
    slow: '350ms ease',
    colors: 'colors 150ms ease',
  },

  // Z-인덱스 레이어
  zIndex: {
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
    notification: 80,
  },

  // 반응형 브레이크포인트
  breakpoints: {
    xs: '480px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1440px',
  },

  // 컴포넌트별 스타일
  components: {
    button: {
      height: {
        sm: '28px',
        md: '32px',
        lg: '40px',
      },
      padding: {
        sm: '0 12px',
        md: '0 16px',
        lg: '0 20px',
      },
    },
    input: {
      height: {
        sm: '28px',
        md: '32px',
        lg: '40px',
      },
    },
    card: {
      padding: {
        sm: '12px',
        md: '16px',
        lg: '20px',
      },
    },
    table: {
      rowHeight: {
        compact: '20px',
        default: '32px',
        comfortable: '40px',
      },
    },
  },
} as const;

// CSS 변수 생성 유틸리티 함수
export function getCSSVariables() {
  const { colors } = binanceTheme;
  return `
    :root {
      /* 배경색 */
      --bg-primary: ${colors.background.primary};
      --bg-secondary: ${colors.background.secondary};
      --bg-tertiary: ${colors.background.tertiary};
      --bg-quaternary: ${colors.background.quaternary};
      --bg-overlay: ${colors.background.overlay};

      /* 테두리색 */
      --border-default: ${colors.border.default};
      --border-hover: ${colors.border.hover};
      --border-active: ${colors.border.active};

      /* 텍스트색 */
      --text-primary: ${colors.text.primary};
      --text-secondary: ${colors.text.secondary};
      --text-tertiary: ${colors.text.tertiary};
      --text-quaternary: ${colors.text.quaternary};

      /* 시장 색상 */
      --market-up: ${colors.market.up};
      --market-down: ${colors.market.down};
      --market-up-light: ${colors.market.upLight};
      --market-down-light: ${colors.market.downLight};

      /* 강조 색상 */
      --accent-yellow: ${colors.accent.yellow};
      --accent-yellow-light: ${colors.accent.yellowLight};
      --accent-blue: ${colors.accent.blue};
      --accent-purple: ${colors.accent.purple};
    }
  `;
}

// 타입 내보내기
export type BinanceTheme = typeof binanceTheme;
export type BinanceColors = typeof binanceTheme.colors;
export type BinanceTypography = typeof binanceTheme.typography;
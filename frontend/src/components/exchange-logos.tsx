import React from 'react';

interface LogoProps {
  className?: string;
}

export const BinanceLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#F3BA2F" rx="20"/>
    <path d="M38.4 38.4L50 26.8L61.6 38.4L67.4 32.6L50 15.2L32.6 32.6L38.4 38.4Z" fill="#FFFFFF"/>
    <path d="M26.8 38.4L32.6 32.6L38.4 38.4L32.6 44.2L26.8 38.4Z" fill="#FFFFFF"/>
    <path d="M44.2 44.2L50 38.4L55.8 44.2L50 50L44.2 44.2Z" fill="#FFFFFF"/>
    <path d="M61.6 38.4L67.4 32.6L73.2 38.4L67.4 44.2L61.6 38.4Z" fill="#FFFFFF"/>
    <path d="M38.4 61.6L50 73.2L61.6 61.6L67.4 67.4L50 84.8L32.6 67.4L38.4 61.6Z" fill="#FFFFFF"/>
  </svg>
);

export const CoinbaseLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#0052FF" rx="50"/>
    <path d="M50 72C62.1503 72 72 62.1503 72 50C72 37.8497 62.1503 28 50 28C37.8497 28 28 37.8497 28 50C28 62.1503 37.8497 72 50 72Z" fill="white"/>
    <path d="M50 65C58.2843 65 65 58.2843 65 50C65 41.7157 58.2843 35 50 35C41.7157 35 35 41.7157 35 50C35 58.2843 41.7157 65 50 65Z" fill="#0052FF"/>
  </svg>
);

export const KrakenLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#5741D9" rx="20"/>
    <path d="M50 20C50 20 35 35 35 50C35 60 40 65 50 65C60 65 65 60 65 50C65 35 50 20 50 20Z" fill="white"/>
    <path d="M50 35L45 45L50 50L55 45L50 35Z" fill="#5741D9"/>
    <path d="M40 40L35 50L40 55L45 50L40 40Z" fill="white" fillOpacity="0.8"/>
    <path d="M60 40L65 50L60 55L55 50L60 40Z" fill="white" fillOpacity="0.8"/>
  </svg>
);

export const OKXLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#000000" rx="20"/>
    <rect x="20" y="20" width="18" height="18" fill="white"/>
    <rect x="41" y="41" width="18" height="18" fill="white"/>
    <rect x="62" y="62" width="18" height="18" fill="white"/>
    <rect x="62" y="20" width="18" height="18" fill="white"/>
    <rect x="20" y="62" width="18" height="18" fill="white"/>
  </svg>
);

export const BybitLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#000000" rx="20"/>
    <path d="M25 30L50 50L25 70V30Z" fill="#F7A600"/>
    <path d="M55 30L75 50L55 70V30Z" fill="#F7A600" fillOpacity="0.6"/>
  </svg>
);

export const KuCoinLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#23AF91" rx="20"/>
    <path d="M50 35L60 45L50 55L40 45L50 35Z" fill="white"/>
    <path d="M35 50L45 40V60L35 50Z" fill="white"/>
    <path d="M65 50L55 40V60L65 50Z" fill="white"/>
    <circle cx="50" cy="25" r="4" fill="white"/>
    <circle cx="50" cy="75" r="4" fill="white"/>
  </svg>
);

export const GateIOLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#17B897" rx="20"/>
    <path d="M50 25C50 25 30 25 30 50C30 65 40 75 55 75C55 75 55 65 55 50H70C70 50 70 35 50 35V25Z" fill="white"/>
    <rect x="45" y="45" width="10" height="10" fill="#17B897"/>
  </svg>
);

// HTX (formerly Huobi)
export const HTXLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#00D4D4" rx="20"/>
    <path d="M30 40H40V60H30V40Z" fill="white"/>
    <path d="M45 40H55V60H45V40Z" fill="white"/>
    <path d="M30 45H70V55H30V45Z" fill="white"/>
    <path d="M60 30L70 40V60L60 70V30Z" fill="white" fillOpacity="0.8"/>
  </svg>
);

export const BitfinexLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#5CC26C" rx="20"/>
    <path d="M70 30C70 30 70 35 65 40L50 55L35 70C30 75 25 70 25 70C25 70 30 65 35 60L50 45L65 30C70 25 70 30 70 30Z" fill="white"/>
    <path d="M50 50L65 35C70 30 75 35 75 35L60 50L45 65C40 70 35 65 35 65L50 50Z" fill="white" fillOpacity="0.6"/>
  </svg>
);

export const UpbitLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#093687" rx="20"/>
    <path d="M35 65V40C35 30 40 25 50 25C60 25 65 30 65 40V65C65 70 62 73 57 73H43C38 73 35 70 35 65Z" fill="white"/>
    <path d="M42 20L50 12L58 20" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="45" y="35" width="10" height="25" fill="#093687"/>
  </svg>
);

// Bithumb logo 추가
export const BithumbLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#F37021" rx="20"/>
    <path d="M30 60V30H50C60 30 65 35 65 45C65 50 63 54 58 56C65 58 70 63 70 70C70 78 64 85 50 85H30V60Z" fill="white"/>
    <rect x="40" y="40" width="15" height="10" fill="#F37021"/>
    <rect x="40" y="60" width="20" height="10" fill="#F37021"/>
  </svg>
);

// 로고 매핑 객체
export const exchangeLogos = {
  Binance: BinanceLogo,
  Coinbase: CoinbaseLogo,
  Kraken: KrakenLogo,
  OKX: OKXLogo,
  Bybit: BybitLogo,
  KuCoin: KuCoinLogo,
  'Gate.io': GateIOLogo,
  HTX: HTXLogo,
  Bitfinex: BitfinexLogo,
  Upbit: UpbitLogo,
  Bithumb: BithumbLogo,
};
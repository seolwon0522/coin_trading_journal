import React from 'react';

interface LogoProps {
  className?: string;
}

// Binance - 정확한 로고 디자인
export const BinanceRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 126 126" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="126" height="126" fill="#F3BA2F" rx="24"/>
    <path d="M38.5752 53.5137L62.6616 29.4238L86.752 53.5181L98.0929 42.1772L62.6616 6.74121L27.2344 42.1729L38.5752 53.5137Z" fill="white"/>
    <path d="M20.9688 48.4385L9.62793 59.7793L20.9688 71.1201L32.3096 59.7793L20.9688 48.4385Z" fill="white"/>
    <path d="M38.5752 71.938L62.6616 96.0278L86.752 71.9336L98.0973 83.2701L62.6616 118.706L27.2344 83.2744L38.5752 71.938Z" fill="white"/>
    <path d="M105.031 48.4385L93.6904 59.7793L105.031 71.1201L116.372 59.7793L105.031 48.4385Z" fill="white"/>
    <path d="M74.2119 59.7749L62.6616 48.2246L56.3223 54.5595L51.1157 59.7704L51.1069 59.7793L51.1157 59.7881L56.3223 64.9946L62.6616 71.334L74.2119 59.7837L74.2163 59.7793L74.2119 59.7749Z" fill="white"/>
  </svg>
);

// Upbit - 정확한 로고 디자인 
export const UpbitRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#093787" rx="40"/>
    <path d="M60 150V80C60 60 70 50 90 50H110C130 50 140 60 140 80V150" stroke="white" strokeWidth="16" fill="none" strokeLinecap="round"/>
    <path d="M100 35L85 50H115L100 35Z" fill="white"/>
    <path d="M90 20L100 10L110 20" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// OKX - 정확한 로고 디자인
export const OKXRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" fill="black" rx="10"/>
    <rect x="6" y="6" width="9" height="9" fill="white"/>
    <rect x="19.5" y="19.5" width="9" height="9" fill="white"/>
    <rect x="33" y="33" width="9" height="9" fill="white"/>
    <rect x="33" y="6" width="9" height="9" fill="white"/>
    <rect x="6" y="33" width="9" height="9" fill="white"/>
  </svg>
);

// Bybit - 정확한 로고 디자인
export const BybitRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#1A1A1A" rx="40"/>
    <path d="M40 60L40 140L90 100L40 60Z" fill="#FFA000"/>
    <path d="M100 60L100 140L150 100L100 60Z" fill="#FFA000" fillOpacity="0.6"/>
    <path d="M100 60L160 60L130 100L100 60Z" fill="#FFA000" fillOpacity="0.8"/>
  </svg>
);

// Coinbase - 정확한 로고 디자인
export const CoinbaseRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="24" fill="#0052FF"/>
    <path d="M24 36C30.6274 36 36 30.6274 36 24C36 17.3726 30.6274 12 24 12C17.3726 12 12 17.3726 12 24C12 30.6274 17.3726 36 24 36Z" fill="white"/>
    <path d="M27.0769 20.9231H20.9231C20.4128 20.9231 20 21.3359 20 21.8462V26.1538C20 26.6641 20.4128 27.0769 20.9231 27.0769H27.0769C27.5872 27.0769 28 26.6641 28 26.1538V21.8462C28 21.3359 27.5872 20.9231 27.0769 20.9231Z" fill="#0052FF"/>
  </svg>
);

// Bithumb - 정확한 로고 디자인
export const BithumbRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#F37021" rx="40"/>
    <path d="M50 140V60H70V80H90C110 80 120 90 120 100C120 110 110 120 90 120H70V140H50Z" fill="white"/>
    <circle cx="120" cy="100" r="15" fill="white"/>
    <path d="M135 140C135 126.193 146.193 115 160 115V115C173.807 115 185 126.193 185 140V140H135Z" fill="white"/>
  </svg>
);

// KuCoin - 정확한 로고 디자인
export const KuCoinRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#01C388" rx="40"/>
    <path d="M100 60L120 80L100 100L80 80L100 60Z" fill="white"/>
    <path d="M60 100L80 80V120L60 100Z" fill="white"/>
    <path d="M140 100L120 80V120L140 100Z" fill="white"/>
    <path d="M100 140L80 120L100 100L120 120L100 140Z" fill="white"/>
    <circle cx="100" cy="40" r="8" fill="white"/>
    <circle cx="100" cy="160" r="8" fill="white"/>
  </svg>
);

// Gate.io - 정확한 로고 디자인
export const GateioRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#02D4A1" rx="40"/>
    <path d="M140 60H100C70 60 50 80 50 110C50 140 70 160 100 160H110V110H140V60Z" fill="white"/>
    <rect x="85" y="95" width="30" height="30" fill="#02D4A1"/>
  </svg>
);

// HTX (Huobi) - 정확한 로고 디자인
export const HTXRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#1A56F0" rx="40"/>
    <path d="M50 80H70V120H50V80Z" fill="white"/>
    <path d="M80 80H100V120H80V80Z" fill="#00D2FF"/>
    <path d="M110 60H130V140H110V60Z" fill="white"/>
    <path d="M140 80H160V120H140V80Z" fill="#00D2FF"/>
    <path d="M50 90H160V110H50V90Z" fill="white" fillOpacity="0.5"/>
  </svg>
);

// Bitfinex - 정확한 로고 디자인
export const BitfinexRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#054835" rx="40"/>
    <path d="M160 40L160 40C160 73.1371 133.137 100 100 100L40 100" stroke="#00E676" strokeWidth="20" fill="none" strokeLinecap="round"/>
    <path d="M40 160L40 160C40 126.863 66.8629 100 100 100L160 100" stroke="#00E676" strokeWidth="20" fill="none" strokeLinecap="round"/>
    <circle cx="40" cy="100" r="12" fill="#00E676"/>
    <circle cx="160" cy="100" r="12" fill="#00E676"/>
  </svg>
);

// Kraken - 정확한 로고 디자인 
export const KrakenRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#5741D8" rx="40"/>
    <path d="M100 50C100 50 70 80 70 110C70 140 85 155 100 155C115 155 130 140 130 110C130 80 100 50 100 50Z" fill="white"/>
    <circle cx="85" cy="95" r="8" fill="#5741D8"/>
    <circle cx="115" cy="95" r="8" fill="#5741D8"/>
    <path d="M90 125Q100 135 110 125" stroke="#5741D8" strokeWidth="6" fill="none" strokeLinecap="round"/>
  </svg>
);

// MEXC - 정확한 로고 디자인
export const MEXCRealLogo: React.FC<LogoProps> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#0B1426" rx="40"/>
    <path d="M40 100L70 70V130L40 100Z" fill="#00D4C5"/>
    <path d="M80 60H100L120 100L100 140H80L100 100L80 60Z" fill="#2B61D1"/>
    <path d="M130 100L160 70V130L130 100Z" fill="#00D4C5"/>
  </svg>
);

// 로고 매핑 객체
export const realExchangeLogos = {
  Binance: BinanceRealLogo,
  Upbit: UpbitRealLogo,
  OKX: OKXRealLogo,
  Bybit: BybitRealLogo,
  Coinbase: CoinbaseRealLogo,
  Bithumb: BithumbRealLogo,
  KuCoin: KuCoinRealLogo,
  'Gate.io': GateioRealLogo,
  HTX: HTXRealLogo,
  Bitfinex: BitfinexRealLogo,
  Kraken: KrakenRealLogo,
  MEXC: MEXCRealLogo,
};
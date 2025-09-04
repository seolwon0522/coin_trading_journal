'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

// 파트너/거래소 데이터
const partners = [
  { 
    id: 1, 
    name: 'Binance', 
    logo: '/images/exchanges/binance.png',
    bgColor: 'from-yellow-400/30 to-yellow-600/30',
    shadowColor: 'shadow-yellow-500/20',
    description: '세계 1위 거래량',
    url: 'https://www.binance.com'
  },
  { 
    id: 2, 
    name: 'Upbit', 
    logo: '/images/exchanges/upbit.png',
    bgColor: 'from-blue-500/30 to-indigo-600/30',
    shadowColor: 'shadow-blue-500/20',
    description: '국내 최대 거래소',
    url: 'https://upbit.com'
  },
  { 
    id: 3, 
    name: 'OKX', 
    logo: '/images/exchanges/okx.png',
    bgColor: 'from-black/30 to-gray-800/30',
    shadowColor: 'shadow-gray-500/20',
    description: '혁신적인 파생상품',
    url: 'https://www.okx.com'
  },
  { 
    id: 4, 
    name: 'Bybit', 
    logo: '/images/exchanges/bybit.png',
    bgColor: 'from-orange-400/30 to-orange-600/30',
    shadowColor: 'shadow-orange-500/20',
    description: '선물거래 전문',
    url: 'https://www.bybit.com'
  },
  { 
    id: 5, 
    name: 'Coinbase', 
    logo: '/images/exchanges/coinbase.png',
    bgColor: 'from-blue-400/30 to-blue-600/30',
    shadowColor: 'shadow-blue-500/20',
    description: '미국 최대 거래소',
    url: 'https://www.coinbase.com'
  },
  { 
    id: 6, 
    name: 'Bithumb', 
    logo: '/images/exchanges/bithumb.png',
    bgColor: 'from-orange-500/30 to-red-600/30',
    shadowColor: 'shadow-orange-500/20',
    description: '프리미엄 거래 플랫폼',
    url: 'https://www.bithumb.com'
  },
  { 
    id: 7, 
    name: 'KuCoin', 
    logo: '/images/exchanges/kucoin.png',
    bgColor: 'from-green-400/30 to-green-600/30',
    shadowColor: 'shadow-green-500/20',
    description: '다양한 알트코인',
    url: 'https://www.kucoin.com'
  },
  { 
    id: 8, 
    name: 'Gate.io', 
    logo: '/images/exchanges/gateio.png',
    bgColor: 'from-teal-400/30 to-teal-600/30',
    shadowColor: 'shadow-teal-500/20',
    description: '신규 코인 상장 1위',
    url: 'https://www.gate.io'
  },
  { 
    id: 9, 
    name: 'Kraken', 
    logo: '/images/exchanges/kraken.png',
    bgColor: 'from-purple-500/30 to-purple-700/30',
    shadowColor: 'shadow-purple-500/20',
    description: '보안 최우선 거래소',
    url: 'https://www.kraken.com'
  },
  { 
    id: 10, 
    name: 'Bitfinex', 
    logo: '/images/exchanges/bitfinex.png',
    bgColor: 'from-green-600/30 to-emerald-700/30',
    shadowColor: 'shadow-green-500/20',
    description: '전문 트레이더 선호',
    url: 'https://www.bitfinex.com'
  },
];

interface PartnerCarousel3DProps {
  className?: string;
  autoRotate?: boolean;
  rotationSpeed?: number;
}

export function PartnerCarousel3D({ 
  className = '',
  autoRotate = true,
  rotationSpeed = 20 // 회전 속도 (초)
}: PartnerCarousel3DProps) {
  const [rotation, setRotation] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const itemCount = partners.length;
  const anglePerItem = 360 / itemCount;
  const [radius, setRadius] = useState(400); // 캐러셀 반지름 (더 넓게 조정)

  // 모바일 감지 및 반응형 조정
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      // 화면 크기에 따른 반지름 조정 (더 넓은 간격으로 변경)
      if (width < 640) {
        setRadius(200); // 모바일 (150 -> 200)
      } else if (width < 1024) {
        setRadius(300); // 태블릿 (200 -> 300)
      } else if (width < 1440) {
        setRadius(400); // 작은 데스크탑 (280 -> 400)
      } else {
        setRadius(500); // 큰 데스크탑 (추가)
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 자동 회전 애니메이션
  useEffect(() => {
    if (!autoRotate || isPaused || isDragging) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    let lastTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      setRotation(prev => (prev + (360 / (rotationSpeed * 1000)) * delta) % 360);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [autoRotate, isPaused, isDragging, rotationSpeed]);

  // 마우스 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setCurrentX(rotation);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const newRotation = currentX - (deltaX * 0.5); // 드래그 민감도 조정
    setRotation(newRotation % 360);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setIsPaused(false);
  };

  // 터치 이벤트 핸들러 (모바일)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(rotation);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.touches[0].clientX - startX;
    const newRotation = currentX - (deltaX * 0.5);
    setRotation(newRotation % 360);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setRotation(prev => (prev - anglePerItem) % 360);
      } else if (e.key === 'ArrowRight') {
        setRotation(prev => (prev + anglePerItem) % 360);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [anglePerItem]);

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* 섹션 헤더 */}
        <div className="text-center mb-20">
          <h2 className="text-4xl font-bold mb-4">
            글로벌 <span className="text-primary">파트너십</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            세계 최고의 거래소들과 함께합니다
          </p>
        </div>

        {/* 3D 캐러셀 컨테이너 */}
        <div 
          ref={containerRef}
          className={`relative flex items-center justify-center perspective-[1500px] ${
            isMobile ? 'h-[350px]' : 'h-[500px]'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={() => setIsPaused(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'pan-y' // 모바일에서 스크롤과 충돌 방지
          }}
        >
          {/* 3D 캐러셀 */}
          <div 
            className={`absolute w-full transform-style-3d transition-transform ${
              isDragging ? 'duration-0' : 'duration-100'
            } ${isMobile ? 'h-[200px]' : 'h-[280px]'}`}
            style={{
              transform: `rotateY(${-rotation}deg)`,
              willChange: 'transform',
            }}
          >
            {partners.map((partner, index) => {
              const angle = anglePerItem * index;
              const translateZ = radius;
              const cardWidth = isMobile ? 160 : 220; // 카드 크기 조금 증가
              const cardHeight = isMobile ? 200 : 280; // 카드 높이 조금 증가
              
              return (
                <div
                  key={partner.id}
                  className={`absolute left-1/2 top-1/2 transform-style-3d backface-hidden`}
                  style={{
                    width: `${cardWidth}px`,
                    height: `${cardHeight}px`,
                    marginLeft: `-${cardWidth / 2}px`,
                    marginTop: `-${cardHeight / 2}px`,
                    transform: `rotateY(${angle}deg) translateZ(${translateZ}px)`,
                  }}
                >
                  <div 
                    className={cn(
                      "w-full h-full rounded-2xl bg-gradient-to-br backdrop-blur-sm",
                      "border border-white/20 shadow-2xl",
                      "flex flex-col items-center justify-center",
                      isMobile ? "p-4" : "p-6",
                      "transition-all duration-300 hover:scale-110",
                      "group cursor-pointer",
                      partner.bgColor,
                      partner.shadowColor
                    )}
                    onClick={() => window.open(partner.url, '_blank')}
                  >
                    {/* 실제 로고 렌더링 */}
                    <div className={`${
                      isMobile ? 'mb-2' : 'mb-4'
                    } flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      {partner.logo ? (
                        <div className={`relative ${isMobile ? 'w-16 h-16' : 'w-24 h-24'} bg-white rounded-xl p-2 shadow-lg overflow-hidden`}>
                          <Image 
                            src={partner.logo}
                            alt={partner.name}
                            width={isMobile ? 64 : 96}
                            height={isMobile ? 64 : 96}
                            className="object-contain"
                            priority={index < 3}
                            quality={100}
                            onError={() => {
                              // 로드 실패 시 파트너 데이터를 업데이트하여 플레이스홀더 표시
                              const updatedPartners = [...partners];
                              updatedPartners[index].logo = null;
                            }}
                          />
                        </div>
                      ) : (
                        // 로고가 없는 경우 플레이스홀더
                        <div className={`${
                          isMobile ? 'w-16 h-16' : 'w-24 h-24'
                        } rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center`}>
                          <span className={`${
                            isMobile ? 'text-2xl' : 'text-3xl'
                          } font-bold text-white/80`}>
                            {partner.name.substring(0, 2)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* 파트너 이름 */}
                    <h3 className={`${
                      isMobile ? 'text-base' : 'text-xl'
                    } font-bold text-white mb-2`}>
                      {partner.name}
                    </h3>
                    
                    {/* 설명 */}
                    <p className={`${
                      isMobile ? 'text-xs' : 'text-sm'
                    } text-white/70 text-center`}>
                      {partner.description}
                    </p>

                    {/* 링크 아이콘 - 호버 시 표시 */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ExternalLink className="w-4 h-4 text-white/80" />
                    </div>

                    {/* 호버 효과 */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 그림자 효과 */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[100px] bg-gradient-to-t from-background via-background/50 to-transparent blur-3xl" />
          
          {/* 인디케이터 도트 */}
          <div className="absolute bottom-[-50px] left-1/2 -translate-x-1/2 flex gap-2">
            {partners.map((_, index) => {
              const isActive = Math.round(rotation / anglePerItem) % itemCount === index;
              return (
                <button
                  key={index}
                  onClick={() => setRotation(anglePerItem * index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    isActive ? "bg-primary w-8" : "bg-white/30 hover:bg-white/50"
                  )}
                  aria-label={`Go to ${partners[index].name}`}
                />
              );
            })}
          </div>
        </div>

        {/* 컨트롤 힌트 */}
        <div className="text-center mt-16">
          <p className="text-sm text-muted-foreground">
            <span className="hidden sm:inline">마우스로 드래그하여 회전 • </span>
            <span className="sm:hidden">스와이프로 회전 • </span>
            키보드 화살표 키로 탐색
          </p>
        </div>

        {/* 배경 장식 요소 */}
        <div className="absolute top-1/2 left-10 -translate-y-1/2 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
    </div>
  );
}
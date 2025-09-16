import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Spring Boot 백엔드로 API 요청 프록시 설정
  async rewrites() {
    return [
      {
        source: '/api/portfolio/:path*',
        destination: 'http://localhost:8080/api/portfolio/:path*',
      },
      {
        source: '/api/orders/:path*',
        destination: 'http://localhost:8080/api/orders/:path*',
      },
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:8080/api/auth/:path*',
      },
      {
        source: '/api/trades/:path*',
        destination: 'http://localhost:8080/api/trades/:path*',
      },
    ];
  },
  // FedCM(Global Site Identity) 비활성화: GSI가 브라우저에서 개입하지 않도록 전역 헤더 추가
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // identity-credentials-get 권한을 비워 FedCM 기능 차단
          { key: 'Permissions-Policy', value: 'identity-credentials-get=()' },
        ],
      },
    ];
  },
};

export default nextConfig;

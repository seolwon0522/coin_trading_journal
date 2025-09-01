import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
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

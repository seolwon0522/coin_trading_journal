import axios from 'axios';

// Axios 인스턴스 생성 및 기본 설정
export const apiClient = axios.create({
  // 기본 API 베이스 URL 우선순위: NEXT_PUBLIC_API_BASE_URL > NEXT_PUBLIC_API_URL > ''(동일 오리진)
  baseURL:
    (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ||
    (process.env.NEXT_PUBLIC_API_URL as string | undefined) ||
    '',
  timeout: 10000, // 10초 타임아웃 설정
  headers: {
    'Content-Type': 'application/json',
    // API 키는 환경변수에서 가져오기 (사용자의 보안 선호도 반영)
    ...(process.env.NEXT_PUBLIC_API_KEY && {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
    }),
  },
});

// 한글 주석: 인터셉터는 인증 흐름과 함께 `AuthProvider`에서 일원화하여 설정합니다.

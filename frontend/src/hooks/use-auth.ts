// Re-export useAuth from auth-provider
export { useAuth } from '@/components/providers/auth-provider';

// Type exports for convenience
export type { AuthUser, LoginRequest, LoginResponse } from '@/lib/api/auth-api';
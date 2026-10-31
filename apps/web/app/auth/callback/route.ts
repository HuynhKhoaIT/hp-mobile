// OAuth callback (Google). Nằm ngoài [locale]; proxy.ts bỏ qua đường dẫn này. Logic ở features/auth.
import type { NextRequest } from 'next/server';
import { handleOAuthCallback } from '@/features/auth/oauth-callback';

export function GET(request: NextRequest) {
  return handleOAuthCallback(request);
}

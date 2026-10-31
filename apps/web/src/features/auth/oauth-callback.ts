// Google OAuth quay về /auth/callback?code=…&next=…: đổi code lấy phiên (ghi cookie), rồi về /dang-nhap.
// Trang đăng nhập tự nhận ra đã có phiên → onboarding nếu cần, xong thì tới `next`.
import 'server-only';
import { exchangeCodeForSession } from '@hp/core';
import { type NextRequest, NextResponse } from 'next/server';
import { safeNext, splitLocale, withLocale } from '@/i18n/paths';
import { createServerClient } from '@/lib/supabase/server';

export async function handleOAuthCallback(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get('next'));
  const { locale } = splitLocale(next);
  const login = new URL(withLocale('/dang-nhap', locale), url.origin);
  login.searchParams.set('next', next);

  const code = url.searchParams.get('code');
  if (!code) {
    login.searchParams.set('error', 'unknown');
    return NextResponse.redirect(login);
  }
  const supabase = await createServerClient();
  const result = await exchangeCodeForSession(supabase, code);
  if (result.error) login.searchParams.set('error', result.error.code);
  return NextResponse.redirect(login);
}

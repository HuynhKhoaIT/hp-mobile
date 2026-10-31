// Proxy (Next 16 đổi tên từ middleware). Thứ tự (.claude/rules/web-routing-rsc.md):
// 1. next-intl chọn locale   2. làm mới phiên Supabase   3. chặn khu (auth)   4. chặn /admin (staff + MFA, noindex).
// Vai trò đọc từ JWT claims (app_metadata.role) — không query DB ở đây.
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/proxy';

const intl = createIntlMiddleware(routing);

/** Route cần đăng nhập (khu (auth)). */
const AUTH_ONLY = ['/dang-tin', '/tao-nhom', '/tin-nhan', '/thong-bao', '/toi'];
const STAFF = new Set(['moderator', 'admin']);
const NOINDEX = 'noindex, nofollow';

const isUnder = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

/** Tách locale khỏi đường dẫn: `/en/toi` → { prefix: '/en', path: '/toi' }; tiếng Việt không có tiền tố. */
function splitLocale(pathname: string) {
  const first = pathname.split('/')[1] ?? '';
  const isPrefixed = (routing.locales as readonly string[]).includes(first) && first !== routing.defaultLocale;
  return isPrefixed
    ? { prefix: `/${first}`, path: pathname.slice(first.length + 1) || '/' }
    : { prefix: '', path: pathname };
}

/** Chuyển hướng nhưng giữ cookie phiên vừa làm mới. */
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const res = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) res.cookies.set(cookie);
  return res;
}

export async function proxy(request: NextRequest) {
  const response = intl(request);
  // next-intl đang chuyển hướng (vd /vi/... → /...): trả luôn.
  if (response.headers.has('location')) return response;

  const session = await updateSession(request, response);
  const { pathname, search } = request.nextUrl;
  const { prefix, path } = splitLocale(pathname);

  if (isUnder(path, '/admin')) {
    response.headers.set('X-Robots-Tag', NOINDEX);
    if (isUnder(path, '/admin/login')) return response;
    if (!session.userId) return redirectKeepingCookies(new URL(`${prefix}/admin/login`, request.url), response);
    if (!session.role || !STAFF.has(session.role)) {
      return new NextResponse(null, { status: 403, headers: { 'X-Robots-Tag': NOINDEX } });
    }
    if (session.aal !== 'aal2') return redirectKeepingCookies(new URL(`${prefix}/admin/login/mfa`, request.url), response);
    return response;
  }

  if (!session.userId && AUTH_ONLY.some((base) => isUnder(path, base))) {
    const url = new URL(`${prefix}/dang-nhap`, request.url);
    url.searchParams.set('next', `${pathname}${search}`);
    return redirectKeepingCookies(url, response);
  }

  return response;
}

export const config = {
  // Bỏ qua API, file tĩnh, _next, _vercel và mọi đường dẫn có dấu chấm (favicon, .well-known…).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

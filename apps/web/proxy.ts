// Proxy (Next 16 đổi tên từ middleware). Thứ tự (.claude/rules/web-routing-rsc.md):
// 1. next-intl chọn locale   2. làm mới phiên Supabase   3. chặn khu (auth)   4. chặn /admin (staff + MFA, noindex).
// Vai trò đọc từ JWT claims (app_metadata.role) — không query DB ở đây.
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { MINI_APP_PRIVATE_PATHS } from '@/features/listing/mini-app-routes';
import { splitLocale } from '@/i18n/paths';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/supabase/proxy';

const intl = createIntlMiddleware(routing);

/** Route cần đăng nhập (khu (auth)) + trang con riêng tư của mini-app (/pass-do/da-luu, /tin-nhan, /quan-ly). */
const AUTH_ONLY = ['/dang-tin', '/tao-nhom', '/tin-nhan', '/thong-bao', '/toi', ...MINI_APP_PRIVATE_PATHS];
/** Ngoại lệ: trang "Tôi" mở cho khách (nút đăng nhập + cài đặt ngôn ngữ / giao diện / pháp lý), giống tab Tôi của app. */
const GUEST_OK = new Set(['/toi']);
const STAFF = new Set(['moderator', 'admin']);
const NOINDEX = 'noindex, nofollow';

const isUnder = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

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
    // `next` = trang admin đang mở (quay lại đúng chỗ sau đăng nhập / MFA; trang đích tự kiểm safeAdminNext).
    const adminRedirect = (to: string) => {
      const url = new URL(`${prefix}${to}`, request.url);
      url.searchParams.set('next', `${pathname}${search}`);
      const res = redirectKeepingCookies(url, response);
      res.headers.set('X-Robots-Tag', NOINDEX);
      return res;
    };
    if (!session.userId) return adminRedirect('/admin/login');
    if (!session.role || !STAFF.has(session.role)) {
      return new NextResponse(null, { status: 403, headers: { 'X-Robots-Tag': NOINDEX } });
    }
    if (session.aal !== 'aal2') return adminRedirect('/admin/login/mfa');
    return response;
  }

  if (!session.userId && !GUEST_OK.has(path) && AUTH_ONLY.some((base) => isUnder(path, base))) {
    const url = new URL(`${prefix}/dang-nhap`, request.url);
    url.searchParams.set('next', `${pathname}${search}`);
    return redirectKeepingCookies(url, response);
  }

  return response;
}

export const config = {
  // Bỏ qua API, /auth/callback (OAuth, tự đổi code lấy phiên), file tĩnh, _next, _vercel và đường dẫn có dấu chấm.
  matcher: ['/((?!api|auth/callback|_next|_vercel|.*\\..*).*)'],
};

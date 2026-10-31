// Xử lý đường dẫn có tiền tố ngôn ngữ (vi không tiền tố, /en, /zh) — dùng ở proxy.ts và luồng đăng nhập.
// Không phụ thuộc React / Next để chạy được cả trong proxy.
import type { Locale } from '@hp/shared';
import { routing } from './routing';

/** `/en/toi?x=1` → { locale: 'en', path: '/toi?x=1' }; `/toi` → { locale: 'vi', path: '/toi' }. */
export function splitLocale(pathname: string): { locale: Locale; prefix: string; path: string } {
  const first = pathname.split(/[/?#]/)[1] ?? '';
  const locales = routing.locales as readonly string[];
  if (locales.includes(first) && first !== routing.defaultLocale) {
    return { locale: first as Locale, prefix: `/${first}`, path: pathname.slice(first.length + 1) || '/' };
  }
  return { locale: routing.defaultLocale, prefix: '', path: pathname };
}

/** Gắn tiền tố cho đường dẫn chưa có ngôn ngữ (`/toi`, 'en' → `/en/toi`). */
export function withLocale(path: string, locale: Locale): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path === '/' ? '' : path}`;
}

/**
 * Tham số `next` sau đăng nhập: chỉ nhận đường dẫn nội bộ (bắt đầu bằng một dấu `/`), chống open redirect
 * (`//evil.com`, `/\evil.com`, `https://…`). Không hợp lệ → trang chủ.
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}

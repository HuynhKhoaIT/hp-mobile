// canonical + hreflang (vi / en / zh + x-default) cho generateMetadata của trang công khai (.claude/rules/web-seo-public.md).
// URL tuyệt đối theo NEXT_PUBLIC_SITE_URL; vi không tiền tố, /en, /zh.
import type { Locale } from '@hp/shared';
import type { Metadata } from 'next';
import { publicEnv } from '@/lib/env';
import { withLocale } from './paths';
import { routing } from './routing';

/** Đường dẫn (chưa có tiền tố ngôn ngữ, có thể kèm query) → URL tuyệt đối theo ngôn ngữ. */
export function absoluteUrl(path: string, locale: Locale): string {
  const base = publicEnv.siteUrl.replace(/\/+$/, '');
  return `${base}${withLocale(path, locale)}`;
}

export function localeAlternates(path: string, locale: Locale): NonNullable<Metadata['alternates']> {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = absoluteUrl(path, l);
  languages['x-default'] = absoluteUrl(path, routing.defaultLocale);
  return { canonical: absoluteUrl(path, locale), languages };
}

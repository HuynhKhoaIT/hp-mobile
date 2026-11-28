// URL: tiếng Việt không tiền tố, /en/..., /zh/... (apps/web/CLAUDE.md mục 3).
import { DEFAULT_LOCALE, LOCALES } from '@hp/shared';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  // Luôn mở tiếng Việt: không tự chuyển sang /en, /zh theo Accept-Language hay cookie cũ của trình duyệt; đổi ngôn ngữ bằng bộ chọn.
  localeDetection: false,
});

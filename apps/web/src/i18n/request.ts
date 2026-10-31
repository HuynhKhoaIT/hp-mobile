// Cấu hình next-intl theo request. Locale lấy từ root param `[locale]` (next/root-params, thay setRequestLocale đã bỏ).
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { locale as rootLocale } from 'next/root-params';
import { messages } from './messages';
import { routing } from './routing';

export default getRequestConfig(async ({ locale: override }) => {
  const candidate = override ?? (await rootLocale());
  const locale = hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
  return {
    locale,
    messages: messages[locale],
    timeZone: 'Asia/Ho_Chi_Minh',
  };
});

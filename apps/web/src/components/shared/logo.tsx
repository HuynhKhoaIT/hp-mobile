// Logo: biểu tượng (LogoMark, logo-mark.tsx) và chữ tên app.
// Không dùng logo / nhận diện Hòa Phát (ứng dụng cộng đồng, độc lập).
import { APP_NAME } from '@hp/shared';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LogoMark } from './logo-mark';

export { LogoMark };

export async function Logo() {
  const t = await getTranslations('web.header');
  return (
    <Link
      href="/"
      aria-label={t('home')}
      className="inline-flex min-h-11 items-center gap-2 rounded-md text-lg font-semibold text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <LogoMark />
      {/* Điện thoại: header chật (tìm kiếm + Đăng nhập) → chỉ biểu tượng; tên đọc qua aria-label của link. */}
      <span className="hidden whitespace-nowrap sm:inline">{APP_NAME}</span>
    </Link>
  );
}

// Logo: biểu tượng (ô primary bo góc + ghim vị trí on-primary + chấm accent = "quanh khu làm việc") và chữ tên app.
// Không dùng logo / nhận diện Hòa Phát (ứng dụng cộng đồng, độc lập).
import { APP_NAME } from '@hp/shared';
import { MapPin } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export function LogoMark() {
  return (
    <span aria-hidden className="relative flex size-8 shrink-0 items-center justify-center rounded-md bg-primary shadow-card">
      <MapPin strokeWidth={2.25} className="size-5 text-on-primary" />
      <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-accent ring-2 ring-surface" />
    </span>
  );
}

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

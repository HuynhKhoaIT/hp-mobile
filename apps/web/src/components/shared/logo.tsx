// Logo dạng chữ (wordmark) tên app. Không dùng logo / nhận diện Hòa Phát (ứng dụng cộng đồng, độc lập).
import { APP_NAME } from '@hp/shared';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function Logo() {
  const t = await getTranslations('web.header');
  return (
    <Link
      href="/"
      aria-label={t('home')}
      className="inline-flex min-h-11 items-center rounded-md text-lg font-semibold text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {APP_NAME}
    </Link>
  );
}

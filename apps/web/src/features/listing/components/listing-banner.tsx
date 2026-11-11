// Khối mời đăng tin đầu danh sách (config.banner — style Stitch L3, khớp app `ListingBanner.tsx`). Mỗi nút là link tới
// /dang-tin?feature=<tính năng>&category=<danh mục> (chạy khi tắt JS; khách được proxy.ts chuyển sang /dang-nhap rồi quay lại).
//   'actions' (đồ thất lạc): thẻ có dòng chữ + các nút chia đều, nút đầu nền primary, các nút sau viền; hẹp quá thì xuống hàng.
//   'strip' (trọ): dải mỏng — chữ bên trái, một nút viền nhỏ bên phải.
// Không 'use client': render trong Server Component của trang danh sách.
import type { ListingFeature } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { ListingListBanner } from '../feature-config';

export function ListingBanner({ banner, feature }: { banner: ListingListBanner; feature: ListingFeature }) {
  const t = useTranslations();
  const href = (category: string) => ({ pathname: '/dang-tin', query: { feature, category } });

  if (banner.variant === 'strip') {
    const action = banner.actions[0];
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface py-2 pr-2 pl-4 shadow-card">
        <p className="min-w-0 flex-1 text-md font-medium text-fg">{t(banner.textKey)}</p>
        {action ? (
          <Button asChild variant="outline" size="sm" className="font-semibold text-primary">
            <Link href={href(action.category)}>
              {action.Icon ? <action.Icon aria-hidden strokeWidth={1.75} /> : null}
              {t(action.labelKey)}
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <section aria-label={t(banner.textKey)} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
      <p className="text-md font-semibold text-fg">{t(banner.textKey)}</p>
      <div className="flex flex-wrap gap-2">
        {banner.actions.map((a, i) => (
          <Button key={a.category} asChild variant={i === 0 ? 'default' : 'outline'} className="min-w-36 flex-1">
            <Link href={href(a.category)}>
              {a.Icon ? <a.Icon aria-hidden strokeWidth={1.75} /> : null}
              {t(a.labelKey)}
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
}

// Chân trang chủ (docs/design/home.md §4.9, §10; style Stitch): MỘT thẻ cộng đồng (đầu thẻ ô icon + tiêu đề, lưới 3 số
// ngăn bởi đường kẻ — public_stats, chỉ hiện khi đã có tin), MỘT hộp giao dịch an toàn (Stitch lặp 2 lần — lỗi, không
// lặp), thẻ tải app (chỉ khi có link store trong env). Pill "Đang hoạt động" của Stitch bỏ: chưa có chữ i18n phù hợp. Dòng miễn trừ "Ứng dụng cộng đồng, không thuộc
// Tập đoàn Hòa Phát" do layout (app) hiện: điện thoại MobileDisclaimer, desktop footer — không lặp ở đây.
import { formatNumber } from '@hp/shared';
import { ShieldCheck, Smartphone, Users } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { asLocale } from '@/features/listing/display';
import type { PublicStats } from '@/features/listing/queries';

const STORE_LINKS = [
  { key: 'get_app_ios', href: process.env.NEXT_PUBLIC_APP_STORE_URL },
  { key: 'get_app_android', href: process.env.NEXT_PUBLIC_PLAY_STORE_URL },
] as const;

export async function CommunitySection({ stats }: { stats: PublicStats | null }) {
  const t = await getTranslations();
  const locale = asLocale(await getLocale());
  const stores = STORE_LINKS.filter((s): s is { key: typeof s.key; href: string } => !!s.href);
  const showStats = !!stats && stats.listings > 0;

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-6">
      {showStats ? (
        <section
          aria-labelledby="home-community"
          className="relative flex flex-col gap-3 overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-card"
        >
          {/* Hoạ tiết góc phải trên (trang trí). */}
          <span aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full border-2 border-dashed border-primary/10" />
          <div className="relative flex items-center gap-2">
            <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary-light text-primary">
              <Users strokeWidth={1.75} className="size-4" />
            </span>
            <h2 id="home-community" className="text-md font-semibold text-fg">
              {t('common.home.community_title')}
            </h2>
          </div>
          <dl className="relative grid grid-cols-3 divide-x divide-border">
            {(['users', 'listings', 'sites'] as const).map((key) => (
              <div key={key} className="flex min-w-0 flex-col-reverse items-center justify-end gap-0.5 px-2 text-center">
                <dt className="text-xs text-muted sm:text-sm">{t(`common.home.stats.${key}`)}</dt>
                <dd className="text-xl font-bold text-primary">{formatNumber(stats[key], locale)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* Mô tả text-muted trên nền warning/10: ~4,8:1 (sáng), ~6:1 (tối) — đạt 4,5:1. */}
      <aside
        aria-labelledby="home-safety"
        className="relative flex items-start gap-3 overflow-hidden rounded-lg border border-warning/30 bg-warning/10 p-4 lg:self-stretch"
      >
        <ShieldCheck
          aria-hidden
          strokeWidth={1.5}
          className="pointer-events-none absolute -right-4 -bottom-5 size-24 text-warning opacity-15"
        />
        <span aria-hidden className="relative flex size-10 shrink-0 items-center justify-center rounded-md bg-warning/15">
          <ShieldCheck strokeWidth={1.75} className="size-6 text-warning" />
        </span>
        <div className="relative flex min-w-0 flex-col gap-1 pr-6">
          <h2 id="home-safety" className="text-md font-semibold text-fg">
            {t('common.home.safety_title')}
          </h2>
          <p className="text-sm text-muted">{t('listing.detail.safety_tip')}</p>
        </div>
      </aside>

      {stores.length > 0 ? (
        <section
          aria-labelledby="home-get-app"
          className="flex flex-col gap-4 rounded-lg bg-primary p-5 text-on-primary shadow-card sm:flex-row sm:items-center lg:col-span-2"
        >
          <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-md bg-on-primary/15">
            <Smartphone strokeWidth={1.75} className="size-7" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id="home-get-app" className="text-lg font-semibold">
              {t('common.home.get_app_title')}
            </h2>
            <p className="text-md opacity-90">{t('common.home.get_app_body')}</p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {stores.map((s) => (
              <li key={s.key}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center rounded-md bg-surface px-4 text-md font-semibold text-fg outline-none transition-colors hover:bg-primary-light focus-visible:ring-3 focus-visible:ring-on-primary/60"
                >
                  {t(`web.home.${s.key}`)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

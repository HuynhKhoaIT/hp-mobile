// Chân trang chủ (docs/design/home.md §4.9, §10): số liệu cộng đồng thật (public_stats — chỉ hiện khi đã có tin),
// hộp giao dịch an toàn, thẻ tải app (chỉ khi có link store trong env). Dòng miễn trừ "Ứng dụng cộng đồng, không thuộc
// Tập đoàn Hòa Phát" do layout (app) hiện: điện thoại MobileDisclaimer, desktop footer — không lặp ở đây.
import { formatNumber } from '@hp/shared';
import { ShieldCheck, Smartphone } from 'lucide-react';
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
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
      {showStats ? (
        <section aria-labelledby="home-community" className="flex flex-col gap-3">
          <h2 id="home-community" className="text-lg font-semibold text-fg">
            {t('common.home.community_title')}
          </h2>
          <dl className="grid grid-cols-3 gap-3">
            {(['users', 'listings', 'sites'] as const).map((key) => (
              <div key={key} className="flex flex-col-reverse items-center justify-end gap-0.5 rounded-lg bg-surface p-3 text-center shadow-card">
                <dt className="text-sm text-muted">{t(`common.home.stats.${key}`)}</dt>
                <dd className="text-xl font-bold text-primary">{formatNumber(stats[key], locale)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <aside
        aria-labelledby="home-safety"
        className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 lg:self-end"
      >
        <ShieldCheck aria-hidden strokeWidth={1.75} className="size-6 shrink-0 text-warning" />
        <div className="flex flex-col gap-1">
          <h2 id="home-safety" className="text-md font-semibold text-fg">
            {t('common.home.safety_title')}
          </h2>
          <p className="text-md text-fg">{t('listing.detail.safety_tip')}</p>
        </div>
      </aside>

      {stores.length > 0 ? (
        <section
          aria-labelledby="home-get-app"
          className="flex flex-col gap-4 rounded-xl bg-primary p-5 text-on-primary sm:flex-row sm:items-center lg:col-span-2"
        >
          <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-on-primary/15">
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

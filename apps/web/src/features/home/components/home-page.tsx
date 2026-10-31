// Trang chủ kiểu super app: dải tiêu đề + ô tìm kiếm lớn → lưới module (Dịch vụ, Tiện ích) → số liệu thật →
// mỗi dịch vụ một dải tin trượt ngang → mẹo an toàn. Server Component, không đọc cookie / searchParams:
// toàn trang prerender, dữ liệu tin cache 300s (tag listings — webhook DB làm mới), số liệu cache 1 giờ.
import { formatNumber } from '@hp/shared';
import { ChevronRight, MapPin, Search, ShieldAlert } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { getPathname, Link } from '@/i18n/navigation';
import { asLocale } from '@/features/listing/display';
import { ListingCard } from '@/features/listing/components/listing-card';
import { getListPage, getPublicStats } from '@/features/listing/queries';
import { cn } from '@/lib/utils';
import { HOME_RAILS, type HomeModule, SERVICE_MODULES, UTILITY_MODULES } from '../modules';

const RAIL_SIZE = 8;

export async function HomePage() {
  const t = await getTranslations();
  const locale = asLocale(await getLocale());
  const [stats, rails] = await Promise.all([
    getPublicStats().catch(() => null),
    Promise.all(
      HOME_RAILS.map(async (rail) => {
        const { page, now } = await getListPage({ categories: rail.categories, site: null, query: '' });
        return { ...rail, items: page.items.slice(0, RAIL_SIZE), now };
      }),
    ),
  ]);
  const searchAction = getPathname({ href: '/tim-kiem', locale });

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Dải tiêu đề + tìm kiếm */}
      <section className="rounded-b-xl bg-primary px-4 pt-6 pb-8 text-on-primary">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <p className="inline-flex items-center gap-1 self-start rounded-full bg-on-primary/15 px-3 py-1 text-sm font-medium">
            <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
            {t('web.home.area')}
          </p>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold sm:text-3xl">{t('listing.hub.subtitle')}</h1>
            <p className="text-md opacity-90">{t('web.home.tagline')}</p>
          </div>
          <form action={searchAction} role="search" className="relative">
            <label className="block">
              <span className="sr-only">{t('common.nav.search_placeholder')}</span>
              <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
              <input
                name="q"
                type="search"
                placeholder={t('common.nav.search_placeholder')}
                className="h-12 w-full rounded-full bg-surface pr-4 pl-12 text-md text-fg shadow-card outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>
          </form>
        </div>
      </section>

      <div className="mx-auto -mt-12 flex w-full max-w-6xl flex-col gap-8 px-4">
        {/* Dịch vụ */}
        <ModuleSection title={t('web.home.services_title')} modules={SERVICE_MODULES} soon={t('web.home.soon')} t={t} raised />
        {/* Tiện ích */}
        <ModuleSection title={t('web.home.utilities_title')} modules={UTILITY_MODULES} soon={t('web.home.soon')} t={t} />

        {/* Số liệu thật (ẩn khi chưa có / lỗi) */}
        {stats && stats.listings > 0 ? (
          <dl className="grid grid-cols-3 gap-3">
            {(
              [
                ['users', stats.users],
                ['listings', stats.listings],
                ['sites', stats.sites],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="flex flex-col items-center gap-0.5 rounded-lg bg-surface p-3 text-center shadow-card">
                <dd className="text-xl font-bold text-primary">{formatNumber(value, locale)}</dd>
                <dt className="text-sm text-muted">{t(`web.home.stats.${key}`)}</dt>
              </div>
            ))}
          </dl>
        ) : null}

        {/* Dải tin theo dịch vụ */}
        {rails.map((rail) =>
          rail.items.length === 0 ? null : (
            <section key={rail.feature} aria-labelledby={`rail-${rail.feature}`} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 id={`rail-${rail.feature}`} className="flex items-center gap-2 text-xl font-semibold text-fg">
                  <span className={cn('flex size-8 items-center justify-center rounded-md', rail.config.tone.soft)}>
                    <rail.config.Icon className={cn('size-5', rail.config.tone.fg)} strokeWidth={1.75} aria-hidden />
                  </span>
                  {t(`common.feature.${rail.feature}`)}
                </h2>
                <Link
                  href={rail.config.path}
                  className="inline-flex min-h-11 items-center gap-0.5 text-md font-medium text-primary hover:underline"
                >
                  {t('listing.hub.see_all')}
                  <ChevronRight className="size-5" strokeWidth={1.75} aria-hidden />
                </Link>
              </div>
              <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2">
                {rail.items.map((listing) => (
                  <li key={listing.id} className="flex w-52 shrink-0 snap-start flex-col *:flex-1 sm:w-60">
                    <ListingCard listing={listing} layout="grid" now={rail.now} />
                  </li>
                ))}
              </ul>
            </section>
          ),
        )}

        {/* Mẹo an toàn */}
        <aside className="flex items-start gap-3 rounded-lg border border-warning bg-surface p-4">
          <ShieldAlert className="mt-0.5 size-6 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-md font-semibold text-fg">{t('web.home.safety_title')}</p>
            <p className="text-md text-muted">{t('listing.detail.safety_tip')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ModuleSection({
  title,
  modules,
  soon,
  t,
  raised = false,
}: {
  title: string;
  modules: readonly HomeModule[];
  soon: string;
  t: (key: string) => string;
  /** Khối đầu nổi lên trên dải tiêu đề (kiểu super app). */
  raised?: boolean;
}) {
  return (
    <section aria-label={title} className={cn('flex flex-col gap-3', raised && 'rounded-xl bg-surface p-4 shadow-card')}>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      <ul className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-6">
        {modules.map((m) => {
          const inner = (
            <>
              <span className={cn('relative flex size-14 items-center justify-center rounded-xl', m.tone.soft)}>
                <m.Icon className={cn('size-7', m.tone.fg)} strokeWidth={1.75} aria-hidden />
                {m.href ? null : (
                  <span className="absolute -top-1.5 -right-2 rounded-full bg-surface-2 px-1.5 text-xs font-medium text-muted">
                    {soon}
                  </span>
                )}
              </span>
              <span className="text-center text-sm font-medium text-fg">{t(m.labelKey)}</span>
            </>
          );
          return (
            <li key={m.id}>
              {m.href ? (
                <Link
                  href={m.href}
                  className="flex min-h-11 flex-col items-center gap-2 rounded-lg p-1 transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {inner}
                </Link>
              ) : (
                <div aria-disabled className="flex flex-col items-center gap-2 p-1 opacity-70">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

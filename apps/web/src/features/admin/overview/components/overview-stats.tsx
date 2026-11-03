// Dashboard /admin: hàng chờ cần xử lý (link vào từng màn) → số liệu cộng đồng → tin đang đăng theo danh mục.
// Nguồn: RPC admin_stats (staff). Chưa tách web / app, chưa có lượt vào từ Google / lượt tải app / lead (docs/plan/web.md 3l).
import { LISTING_CATEGORIES, formatNumber } from '@hp/shared';
import { BadgeCheck, CalendarClock, FileText, Flag, MessagesSquare, ShieldCheck, Store, UserX, Users } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { StatCard } from '@/components/admin/states';
import { Skeleton } from '@/components/ui/skeleton';
import { asLocale } from '@/features/listing/display';
import { getDashboardStats } from '../queries';

export async function OverviewStats() {
  const [t, tCat, locale, stats] = await Promise.all([
    getTranslations('admin.overview'),
    getTranslations('common.category'),
    getLocale().then(asLocale),
    getDashboardStats(),
  ]);
  const n = (v: number) => formatNumber(v, locale);

  const queues: { key: string; value: number; Icon: typeof Flag; href: string | { pathname: string; query: Record<string, string> } }[] = [
    { key: 'moderation', value: stats.moderation_pending, Icon: ShieldCheck, href: '/admin/moderation' },
    { key: 'reports', value: stats.reports_open, Icon: Flag, href: '/admin/reports' },
    { key: 'badges', value: stats.badges_pending, Icon: BadgeCheck, href: '/admin/badges' },
    { key: 'venues', value: stats.venues_pending, Icon: Store, href: { pathname: '/admin/catalog', query: { tab: 'venues' } } },
  ];

  const byCategory = LISTING_CATEGORIES.map((c) => ({ c, v: stats.listings_by_category[c] ?? 0 })).sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...byCategory.map((x) => x.v));

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="ov-queues" className="flex flex-col gap-3">
        <h2 id="ov-queues" className="text-lg font-semibold text-fg">
          {t('queues_title')}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {queues.map(({ key, value, Icon, href }) => (
            <li key={key}>
              <StatCard
                label={t(`queue.${key}`)}
                value={n(value)}
                hint={value > 0 ? t('queue_open') : t('queue_clear')}
                Icon={Icon}
                tone={value > 0 ? 'warning' : 'success'}
                href={href}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ov-community" className="flex flex-col gap-3">
        <h2 id="ov-community" className="text-lg font-semibold text-fg">
          {t('community_title')}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <li>
            <StatCard label={t('users_total')} value={n(stats.users_total)} hint={t('new_7d', { count: stats.users_new_7d })} Icon={Users} href="/admin/users" />
          </li>
          <li>
            <StatCard
              label={t('users_banned')}
              value={n(stats.users_banned)}
              Icon={UserX}
              tone={stats.users_banned > 0 ? 'danger' : 'neutral'}
              href={{ pathname: '/admin/users', query: { state: 'banned' } }}
            />
          </li>
          <li>
            <StatCard
              label={t('listings_active')}
              value={n(stats.listings_active)}
              hint={t('new_7d', { count: stats.listings_new_7d })}
              Icon={FileText}
              href={{ pathname: '/admin/listings', query: { status: 'active' } }}
            />
          </li>
          <li>
            <StatCard
              label={t('groups_upcoming')}
              value={n(stats.groups_upcoming)}
              hint={t('new_7d', { count: stats.groups_new_7d })}
              Icon={CalendarClock}
              href="/admin/groups"
            />
          </li>
          <li>
            <StatCard label={t('messages_24h')} value={n(stats.messages_24h)} Icon={MessagesSquare} tone="neutral" />
          </li>
        </ul>
      </section>

      <section aria-labelledby="ov-cat" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-card">
        <div className="flex flex-col gap-1">
          <h2 id="ov-cat" className="text-lg font-semibold text-fg">
            {t('by_category_title')}
          </h2>
          <p className="text-sm text-muted">{t('by_category_hint')}</p>
        </div>
        {/* Một chuỗi số liệu → một màu (primary), sắp giảm dần, số in bằng chữ (không chỉ dựa vào độ dài thanh). */}
        <ul className="flex flex-col gap-3">
          {byCategory.map(({ c, v }) => (
            <li key={c} className="grid grid-cols-1 gap-1 sm:grid-cols-12 sm:items-center sm:gap-3">
              <span className="truncate text-sm text-fg sm:col-span-4">{tCat(c)}</span>
              <span className="flex items-center gap-3 sm:col-span-8">
                <span className="h-2 flex-1 rounded-full bg-surface-2" aria-hidden>
                  <span
                    className="block h-2 rounded-full bg-primary transition-all duration-150"
                    style={{ width: `${(v / max) * 100}%` }}
                    title={`${tCat(c)}: ${n(v)}`}
                  />
                </span>
                <span className="w-12 text-right text-sm font-semibold text-fg tabular-nums">{n(v)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">{t('gaps_note')}</p>
    </div>
  );
}

export function OverviewStatsSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}

// /admin/users/[id] — hồ sơ người dùng cho staff: thông tin (SĐT che), số tin / nhóm / báo cáo, yêu cầu huy hiệu,
// thao tác theo vai trò (khoá tạm, huy hiệu; admin: cấm, đổi vai trò). Theo request trong <Suspense>.
import { formatDate, formatNumber } from '@hp/shared';
import { ArrowLeft, CalendarClock, FileText, Flag, ScrollText } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { AdminPage, HeaderSkeleton, StatCard, TableSkeleton } from '@/components/admin/states';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { UserActions } from '@/features/admin/users/components/user-actions';
import { PersonSummary } from '@/features/admin/users/components/person-summary';
import { getUserDetail } from '@/features/admin/users/queries';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('user') };
}

async function Content({ params }: { params: PageProps<'/[locale]/admin/users/[id]'>['params'] }) {
  const { id } = await params;
  const [data, t, tBadge, locale] = await Promise.all([
    getUserDetail(id),
    getTranslations('admin.users'),
    getTranslations('listing.owner_badge'),
    getLocale().then(asLocale),
  ]);
  const { user, viewer } = data;
  const n = (v: number) => formatNumber(v, locale);
  const statusKey = (s: string) => (s === 'approved' || s === 'rejected' ? s : 'pending');

  return (
    <>
      <PageHeader
        title={user.full_name || user.display_name || t('no_name')}
        description={user.display_name ? t('detail.public_name', { name: user.display_name }) : undefined}
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href="/admin/users">
                <ArrowLeft strokeWidth={1.75} aria-hidden />
                {t('detail.back')}
              </Link>
            </Button>
            {viewer.role === 'admin' ? (
              <Button asChild variant="outline">
                <Link href={{ pathname: '/admin/audit', query: { target: user.id } }}>
                  <ScrollText strokeWidth={1.75} aria-hidden />
                  {t('detail.audit')}
                </Link>
              </Button>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <PersonSummary person={user} locale={locale} now={data.now} />
          <dl className="grid grid-cols-2 gap-3 text-md">
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-muted">{t('field.site')}</dt>
              <dd className="text-fg">{data.siteName ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-muted">{t('field.rating')}</dt>
              <dd className="text-fg">{t('detail.rating', { avg: user.rating_avg.toFixed(1), count: user.rating_count })}</dd>
            </div>
            {user.state === 'suspended' && user.banned_until ? (
              <div className="col-span-2 flex flex-col gap-1">
                <dt className="text-sm text-muted">{t('field.suspended_until')}</dt>
                <dd className="text-fg">{formatDate(user.banned_until, locale, 'datetime')}</dd>
              </div>
            ) : null}
          </dl>
          <ul className="grid gap-3 sm:grid-cols-3">
            <li>
              <StatCard
                label={t('detail.listings')}
                value={n(user.stats.listings)}
                hint={t('detail.listings_active', { count: user.stats.listings_active })}
                Icon={FileText}
                href={{ pathname: '/admin/listings', query: { owner: user.id } }}
              />
            </li>
            <li>
              <StatCard
                label={t('detail.groups')}
                value={n(user.stats.groups_hosted)}
                Icon={CalendarClock}
                href={{ pathname: '/admin/groups', query: { host: user.id } }}
              />
            </li>
            <li>
              <StatCard
                label={t('detail.reports_against')}
                value={n(user.stats.reports_against_open)}
                hint={t('detail.reports_filed', { count: user.stats.reports_filed })}
                Icon={Flag}
                tone={user.stats.reports_against_open > 0 ? 'danger' : 'neutral'}
                href={{ pathname: '/admin/reports', query: { type: 'profile' } }}
              />
            </li>
          </ul>
          <section aria-labelledby="badge-req" className="flex flex-col gap-2">
            <h2 id="badge-req" className="text-lg font-semibold text-fg">
              {t('detail.badge_requests')}
            </h2>
            {user.badge_requests.length === 0 ? (
              <p className="text-md text-muted">{t('detail.no_badge_requests')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {user.badge_requests.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-3">
                    <span className="font-medium text-fg">{tBadge(b.badge)}</span>
                    <StatusBadge kind="badge" status={statusKey(b.status)} label={t(`badge_status.${statusKey(b.status)}`)} />
                    <span className="text-sm text-muted">{formatDate(b.created_at, locale, 'date')}</span>
                    {b.reject_reason ? <span className="w-full text-sm text-muted">{b.reject_reason}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside aria-label={t('detail.actions')} className="flex flex-col gap-3 lg:col-span-5">
          <h2 className="text-lg font-semibold text-fg">{t('detail.actions')}</h2>
          <UserActions key={`${user.role}-${user.state}-${user.badges.join(',')}`} user={user} viewer={viewer} />
        </aside>
      </div>
    </>
  );
}

export default function UserDetailPage({ params }: PageProps<'/[locale]/admin/users/[id]'>) {
  return (
    <AdminPage>
      <Suspense
        fallback={
          <>
            <HeaderSkeleton />
            <TableSkeleton filters={false} rows={4} />
          </>
        }
      >
        <Content params={params} />
      </Suspense>
    </AdminPage>
  );
}

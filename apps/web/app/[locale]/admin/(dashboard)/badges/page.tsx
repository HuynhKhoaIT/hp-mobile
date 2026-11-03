// /admin/badges?status=&badge=&page= — yêu cầu huy hiệu (moderator+). Chờ duyệt trước, cũ trước. Theo request trong <Suspense>.
import { BADGE_REQUEST_STATUSES } from '@hp/core';
import { REQUESTABLE_BADGES } from '@hp/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { FilterBar } from '@/components/admin/filter-bar';
import { PageHeader } from '@/components/admin/page-header';
import { AdminPage, TableSkeleton } from '@/components/admin/states';
import { StatusTabs } from '@/components/admin/status-tabs';
import { BadgesView } from '@/features/admin/badges/components/badges-view';
import { getBadgesPage } from '@/features/admin/badges/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('badges') };
}

async function Content({ searchParams }: { searchParams: PageProps<'/[locale]/admin/badges'>['searchParams'] }) {
  const params = await searchParams;
  const [data, t, tBadge] = await Promise.all([getBadgesPage(params), getTranslations('admin.badges'), getTranslations('listing.owner_badge')]);
  return (
    <div className="flex flex-col gap-4">
      <StatusTabs
        basePath="/admin/badges"
        query={data.query}
        param="status"
        current={data.query.status ?? 'pending'}
        defaultValue="pending"
        tabs={BADGE_REQUEST_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`), count: data.counts[s] }))}
      />
      <FilterBar
        values={data.query}
        keep={data.query.status ? { status: data.query.status } : {}}
        fields={[{ type: 'select', name: 'badge', label: t('filter.badge'), options: REQUESTABLE_BADGES.map((b) => ({ value: b, label: tBadge(b) })) }]}
      />
      <BadgesView key={JSON.stringify(data.query)} data={data.page} query={data.query} now={data.now} />
    </div>
  );
}

export default async function BadgesPage({ searchParams }: PageProps<'/[locale]/admin/badges'>) {
  const t = await getTranslations('admin.badges');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<TableSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}

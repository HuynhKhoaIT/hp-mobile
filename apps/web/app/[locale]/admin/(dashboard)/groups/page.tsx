// /admin/groups?q=&kind=&status=&host=&sort=&page= — nhóm ghép xe / ghép trận (moderator+): lọc, huỷ nhóm vi phạm.
import { GROUP_KINDS, GROUP_STATUSES } from '@hp/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { FilterBar } from '@/components/admin/filter-bar';
import { PageHeader } from '@/components/admin/page-header';
import { AdminPage, TableSkeleton } from '@/components/admin/states';
import { GroupsTable } from '@/features/admin/groups/components/groups-table';
import { getGroupsPage } from '@/features/admin/groups/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('groups') };
}

async function Content({ searchParams }: { searchParams: PageProps<'/[locale]/admin/groups'>['searchParams'] }) {
  const params = await searchParams;
  const [data, t, tFeature, tStatus] = await Promise.all([
    getGroupsPage(params),
    getTranslations('admin.groups'),
    getTranslations('common.feature'),
    getTranslations('common.status'),
  ]);
  const keep: Record<string, string> = {};
  if (data.query.sort) keep.sort = data.query.sort;
  if (data.query.host) keep.host = data.query.host;
  return (
    <div className="flex flex-col gap-4">
      {data.query.host ? <p className="text-md text-muted">{t('host_filter')}</p> : null}
      <FilterBar
        values={data.query}
        keep={keep}
        fields={[
          { type: 'search', name: 'q', label: t('filter.q'), placeholder: t('filter.q_placeholder') },
          { type: 'select', name: 'kind', label: t('filter.kind'), options: GROUP_KINDS.map((k) => ({ value: k, label: tFeature(k) })) },
          { type: 'select', name: 'status', label: t('filter.status'), options: GROUP_STATUSES.map((s) => ({ value: s, label: tStatus(s) })) },
        ]}
      />
      <GroupsTable key={JSON.stringify(data.query)} data={data.page} query={data.query} />
    </div>
  );
}

export default async function GroupsPage({ searchParams }: PageProps<'/[locale]/admin/groups'>) {
  const t = await getTranslations('admin.groups');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<TableSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}

// /admin/leads?status=&kind=&q=&page= — lead từ form marketing (moderator+). Xuất CSV: /admin/leads/export (chỉ admin).
import { LEAD_KINDS, LEAD_STATUSES } from '@hp/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { FilterBar } from '@/components/admin/filter-bar';
import { PageHeader } from '@/components/admin/page-header';
import { AdminPage, TableSkeleton } from '@/components/admin/states';
import { LeadsTable } from '@/features/admin/leads/components/leads-table';
import { getLeadsPage } from '@/features/admin/leads/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('leads') };
}

async function Content({ searchParams }: { searchParams: PageProps<'/[locale]/admin/leads'>['searchParams'] }) {
  const params = await searchParams;
  const [data, t] = await Promise.all([getLeadsPage(params), getTranslations('admin.leads')]);
  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        values={data.query}
        fields={[
          { type: 'search', name: 'q', label: t('filter.q') },
          { type: 'select', name: 'status', label: t('filter.status'), options: LEAD_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) },
          { type: 'select', name: 'kind', label: t('filter.kind'), options: LEAD_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) })) },
        ]}
      />
      <LeadsTable key={JSON.stringify(data.query)} data={data.page} query={data.query} canExport={data.canExport} />
    </div>
  );
}

export default async function LeadsPage({ searchParams }: PageProps<'/[locale]/admin/leads'>) {
  const t = await getTranslations('admin.leads');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<TableSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}

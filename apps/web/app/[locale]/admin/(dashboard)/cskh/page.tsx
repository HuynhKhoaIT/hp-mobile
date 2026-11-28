// /admin/cskh?status=&party=&q=&page= — chăm sóc sau đơn Gọi thợ hoàn thành: gọi / nhắn Zalo / ghi kết quả (moderator+).
import { CSKH_PARTIES, CSKH_STATUSES } from '@hp/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { FilterBar } from '@/components/admin/filter-bar';
import { PageHeader } from '@/components/admin/page-header';
import { AdminPage, TableSkeleton } from '@/components/admin/states';
import { CskhTable } from '@/features/admin/cskh/components/cskh-table';
import { getCskhPage } from '@/features/admin/cskh/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('cskh') };
}

async function Content({ searchParams }: { searchParams: PageProps<'/[locale]/admin/cskh'>['searchParams'] }) {
  const params = await searchParams;
  const [data, t] = await Promise.all([getCskhPage(params), getTranslations('admin.cskh')]);
  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        values={data.query}
        fields={[
          { type: 'search', name: 'q', label: t('filter.q') },
          { type: 'select', name: 'status', label: t('filter.status'), options: CSKH_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) },
          { type: 'select', name: 'party', label: t('filter.party'), options: CSKH_PARTIES.map((p) => ({ value: p, label: t(`party.${p}`) })) },
        ]}
      />
      <CskhTable key={JSON.stringify(data.query)} data={data.page} query={data.query} />
    </div>
  );
}

export default async function CskhPage({ searchParams }: PageProps<'/[locale]/admin/cskh'>) {
  const t = await getTranslations('admin.cskh');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<TableSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}

// /admin/listings?q=&status=&category=&site=&owner=&sort=&page= — mọi tin (moderator+): tìm theo tiêu đề / mã ngắn,
// lọc trạng thái / danh mục / khu / người đăng; ẩn / mở lại / từ chối có ghi chú (audit listing.status).
import { LISTING_CATEGORIES, LISTING_STATUSES } from '@hp/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { FilterBar } from '@/components/admin/filter-bar';
import { PageHeader } from '@/components/admin/page-header';
import { AdminPage, TableSkeleton } from '@/components/admin/states';
import { ListingsTable } from '@/features/admin/listings/components/listings-table';
import { getListingsPage } from '@/features/admin/listings/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('listings') };
}

async function Content({ searchParams }: { searchParams: PageProps<'/[locale]/admin/listings'>['searchParams'] }) {
  const params = await searchParams;
  const [data, t, tCat, tStatus] = await Promise.all([
    getListingsPage(params),
    getTranslations('admin.listings'),
    getTranslations('common.category'),
    getTranslations('common.status'),
  ]);
  const keep: Record<string, string> = {};
  if (data.query.sort) keep.sort = data.query.sort;
  if (data.query.owner) keep.owner = data.query.owner;
  return (
    <div className="flex flex-col gap-4">
      {data.query.owner ? <p className="text-md text-muted">{t('owner_filter')}</p> : null}
      <FilterBar
        values={data.query}
        keep={keep}
        fields={[
          { type: 'search', name: 'q', label: t('filter.q'), placeholder: t('filter.q_placeholder') },
          { type: 'select', name: 'status', label: t('filter.status'), options: LISTING_STATUSES.map((s) => ({ value: s, label: tStatus(s) })) },
          { type: 'select', name: 'category', label: t('filter.category'), options: LISTING_CATEGORIES.map((c) => ({ value: c, label: tCat(c) })) },
          { type: 'select', name: 'site', label: t('filter.site'), options: data.sites.map((s) => ({ value: s.code, label: s.name })) },
        ]}
      />
      <ListingsTable key={JSON.stringify(data.query)} data={data.page} query={data.query} now={data.now} />
    </div>
  );
}

export default async function ListingsPage({ searchParams }: PageProps<'/[locale]/admin/listings'>) {
  const t = await getTranslations('admin.listings');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<TableSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}

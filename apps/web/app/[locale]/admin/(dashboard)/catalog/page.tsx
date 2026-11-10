// /admin/catalog?tab=venues|sites|keywords — danh mục. Sân: moderator+ (duyệt / từ chối / sửa / ẩn, lọc ?vstatus=&q=);
// khu và từ khoá cấm: chỉ admin (moderator thấy thông báo, action + RLS vẫn chặn). Theo request trong <Suspense>.
import { VENUE_STATUSES } from '@hp/core';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { FilterBar } from '@/components/admin/filter-bar';
import { PageHeader } from '@/components/admin/page-header';
import { AdminOnlyState, AdminPage, TableSkeleton } from '@/components/admin/states';
import { StatusTabs } from '@/components/admin/status-tabs';
import { KeywordsPanel } from '@/features/admin/catalog/components/keywords-panel';
import { SitesPanel } from '@/features/admin/catalog/components/sites-panel';
import { VenuesPanel } from '@/features/admin/catalog/components/venues-panel';
import { CATALOG_TABS, getCatalogPage } from '@/features/admin/catalog/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('catalog') };
}

async function Content({ searchParams }: { searchParams: PageProps<'/[locale]/admin/catalog'>['searchParams'] }) {
  const params = await searchParams;
  const [data, t] = await Promise.all([getCatalogPage(params), getTranslations('admin.catalog')]);
  const tabQuery: Record<string, string> = data.tab === 'venues' ? {} : { tab: data.tab };

  return (
    <div className="flex flex-col gap-4">
      <StatusTabs
        basePath="/admin/catalog"
        query={{}}
        param="tab"
        current={data.tab}
        defaultValue="venues"
        tabs={CATALOG_TABS.map((tab) => ({ value: tab, label: t(`tabs.${tab}`) }))}
      />
      {'forbidden' in data ? (
        <AdminOnlyState />
      ) : data.tab === 'venues' ? (
        <>
          <StatusTabs
            basePath="/admin/catalog"
            query={data.query}
            param="vstatus"
            current={data.query.vstatus ?? 'pending'}
            defaultValue="pending"
            tabs={[...VENUE_STATUSES, 'hidden' as const].map((s) => ({ value: s, label: t(`venues.filter.${s}`) }))}
          />
          <FilterBar
            values={data.query}
            keep={data.query.vstatus ? { vstatus: data.query.vstatus } : {}}
            fields={[{ type: 'search', name: 'q', label: t('venues.search'), placeholder: t('venues.search_placeholder') }]}
          />
          <VenuesPanel key={JSON.stringify(data.query)} data={data.venues} sites={data.sites} query={data.query} now={data.now} />
        </>
      ) : data.tab === 'sites' ? (
        <SitesPanel sites={data.sites} />
      ) : (
        <>
          <FilterBar
            values={data.query}
            keep={tabQuery}
            fields={[
              { type: 'search', name: 'q', label: t('keywords.search'), placeholder: t('keywords.search_placeholder') },
              { type: 'select', name: 'action', label: t('keywords.action'), options: [
                { value: 'reject', label: t('keywords.actions.reject') },
                { value: 'review', label: t('keywords.actions.review') },
              ] },
            ]}
          />
          <KeywordsPanel keywords={data.keywords} filtered={Boolean(data.query.q || data.query.action)} />
        </>
      )}
    </div>
  );
}

export default async function CatalogPage({ searchParams }: PageProps<'/[locale]/admin/catalog'>) {
  const t = await getTranslations('admin.catalog');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<TableSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}

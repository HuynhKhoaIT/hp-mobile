// /admin/marketing?placement= — banner app + web (chỉ admin). Lead / blog: chưa có bảng (tuần 11). Theo request trong <Suspense>.
import { BANNER_PLACEMENTS } from '@hp/core';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { AdminOnlyState, AdminPage, TableSkeleton } from '@/components/admin/states';
import { StatusTabs } from '@/components/admin/status-tabs';
import { BannersPanel } from '@/features/admin/marketing/components/banners-panel';
import { getMarketingPage } from '@/features/admin/marketing/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('marketing') };
}

async function Content({ searchParams }: { searchParams: PageProps<'/[locale]/admin/marketing'>['searchParams'] }) {
  const params = await searchParams;
  const [data, t] = await Promise.all([getMarketingPage(params), getTranslations('admin.marketing')]);
  if (data.forbidden) return <AdminOnlyState />;
  return (
    <div className="flex flex-col gap-4">
      <StatusTabs
        basePath="/admin/marketing"
        query={data.placement ? { placement: data.placement } : {}}
        param="placement"
        current={data.placement ?? 'all'}
        defaultValue="all"
        tabs={[{ value: 'all', label: t('placement.all') }, ...BANNER_PLACEMENTS.map((p) => ({ value: p, label: t(`placement.${p}`) }))]}
      />
      <BannersPanel banners={data.banners} now={data.now} />
    </div>
  );
}

export default async function MarketingPage({ searchParams }: PageProps<'/[locale]/admin/marketing'>) {
  const t = await getTranslations('admin.marketing');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<TableSkeleton filters={false} />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}

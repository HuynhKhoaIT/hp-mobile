// /admin — tổng quan (tạm thời: số liệu hàng chờ kiểm duyệt). Theo request, trong <Suspense>.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { OverviewStats, OverviewStatsSkeleton } from '@/features/admin/overview/components/overview-stats';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('overview') };
}

export default async function AdminOverviewPage() {
  const t = await getTranslations('admin.overview');
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<OverviewStatsSkeleton />}>
        <OverviewStats />
      </Suspense>
    </div>
  );
}

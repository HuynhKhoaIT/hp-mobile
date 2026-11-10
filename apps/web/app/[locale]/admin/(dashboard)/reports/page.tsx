// /admin/reports?status=&type=&reason=&page= — hàng chờ báo cáo (moderator+). Mặc định "Cần xử lý" (mở + đang xem),
// cũ trước. Dữ liệu theo request trong <Suspense>. Quyền: proxy.ts → AdminShell → requireStaff ở queries / actions → RLS.
import { REPORT_FILTERS } from '@hp/core';
import { REPORT_REASONS, REPORT_TARGETS } from '@hp/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { FilterBar } from '@/components/admin/filter-bar';
import { PageHeader } from '@/components/admin/page-header';
import { AdminPage, TableSkeleton } from '@/components/admin/states';
import { StatusTabs } from '@/components/admin/status-tabs';
import { ReportsView } from '@/features/admin/reports/components/reports-view';
import { getReportsPage } from '@/features/admin/reports/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('reports') };
}

async function Content({ searchParams }: { searchParams: PageProps<'/[locale]/admin/reports'>['searchParams'] }) {
  const params = await searchParams;
  const [data, t, tReport] = await Promise.all([getReportsPage(params), getTranslations('admin.reports'), getTranslations('common.report')]);
  const status = data.query.status ?? 'active';
  return (
    <div className="flex flex-col gap-4">
      <StatusTabs
        basePath="/admin/reports"
        query={data.query}
        param="status"
        current={status}
        defaultValue="active"
        tabs={REPORT_FILTERS.map((s) => ({ value: s, label: t(`tabs.${s}`), count: data.counts[s] }))}
      />
      <FilterBar
        values={data.query}
        keep={data.query.status ? { status: data.query.status } : {}}
        fields={[
          { type: 'select', name: 'type', label: t('filter.type'), options: REPORT_TARGETS.map((v) => ({ value: v, label: tReport(`targets.${v}`) })) },
          { type: 'select', name: 'reason', label: t('filter.reason'), options: REPORT_REASONS.map((v) => ({ value: v, label: tReport(`reasons.${v}`) })) },
        ]}
      />
      <ReportsView key={JSON.stringify(data.query)} data={data.page} query={data.query} now={data.now} />
    </div>
  );
}

export default async function ReportsPage({ searchParams }: PageProps<'/[locale]/admin/reports'>) {
  const t = await getTranslations('admin.reports');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<TableSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}

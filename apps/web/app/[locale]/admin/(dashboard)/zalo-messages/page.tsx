// /admin/zalo-messages?status=&mode=&kind=&target=&q=&from=&to=&page= — nhật ký mọi tin Zalo đã gửi (tự động + mở Zalo), moderator+.
import { ZALO_DELIVERY_STATUSES, ZALO_KINDS, ZALO_MODES, ZALO_TARGETS } from '@hp/shared';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { FilterBar } from '@/components/admin/filter-bar';
import { PageHeader } from '@/components/admin/page-header';
import { AdminPage, TableSkeleton } from '@/components/admin/states';
import { ZaloLogTable } from '@/features/admin/zalo/components/zalo-log-table';
import { getZaloLogPage } from '@/features/admin/zalo/queries';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('zalo_log') };
}

async function Content({ searchParams }: { searchParams: PageProps<'/[locale]/admin/zalo-messages'>['searchParams'] }) {
  const params = await searchParams;
  const [data, t, tZalo] = await Promise.all([getZaloLogPage(params), getTranslations('admin.zalo_log'), getTranslations('admin.zalo')]);
  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        values={data.query}
        fields={[
          { type: 'search', name: 'q', label: t('filter.q') },
          { type: 'select', name: 'status', label: t('filter.status'), options: ZALO_DELIVERY_STATUSES.map((s) => ({ value: s, label: tZalo(`delivery.${s}`) })) },
          { type: 'select', name: 'mode', label: t('filter.mode'), options: ZALO_MODES.map((m) => ({ value: m, label: tZalo(`mode.${m}`) })) },
          { type: 'select', name: 'kind', label: t('filter.kind'), options: ZALO_KINDS.map((k) => ({ value: k, label: tZalo(`kind.${k}`) })) },
          { type: 'select', name: 'target', label: t('filter.target'), options: ZALO_TARGETS.map((x) => ({ value: x, label: t(`target.${x}`) })) },
          { type: 'date', name: 'from', label: t('filter.from') },
          { type: 'date', name: 'to', label: t('filter.to') },
        ]}
      />
      <ZaloLogTable key={JSON.stringify(data.query)} data={data.page} query={data.query} />
    </div>
  );
}

export default async function ZaloMessagesPage({ searchParams }: PageProps<'/[locale]/admin/zalo-messages'>) {
  const t = await getTranslations('admin.zalo_log');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<TableSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}

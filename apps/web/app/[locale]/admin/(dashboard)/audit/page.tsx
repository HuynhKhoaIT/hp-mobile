// /admin/audit?from=&to=&action=&actor=&target=&page= — nhật ký thao tác (chỉ admin): lọc ngày (giờ VN), tiền tố hành động,
// người làm, đối tượng; xuất CSV (/admin/audit/export, ghi audit.export). Moderator mở → thông báo "chỉ quản trị viên".
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { FilterBar } from '@/components/admin/filter-bar';
import { PageHeader } from '@/components/admin/page-header';
import { AdminOnlyState, AdminPage, TableSkeleton } from '@/components/admin/states';
import { AuditTable } from '@/features/admin/audit/components/audit-table';
import { getAuditPage } from '@/features/admin/audit/queries';

/** Tiền tố hành động gợi ý (khớp `<đối_tượng>.` trong audit_log). */
const ACTION_PREFIXES = ['listing', 'report', 'badge', 'user', 'group', 'venue', 'site', 'keyword', 'banner', 'contact', 'account', 'audit'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('audit') };
}

async function Content({ searchParams }: { searchParams: PageProps<'/[locale]/admin/audit'>['searchParams'] }) {
  const params = await searchParams;
  const [data, t] = await Promise.all([getAuditPage(params), getTranslations('admin.audit')]);
  if (data.forbidden) return <AdminOnlyState />;
  const keep: Record<string, string> = {};
  if (data.query.actor) keep.actor = data.query.actor;
  if (data.query.target) keep.target = data.query.target;
  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        values={data.query}
        keep={keep}
        fields={[
          { type: 'date', name: 'from', label: t('filter.from') },
          { type: 'date', name: 'to', label: t('filter.to') },
          {
            type: 'select',
            name: 'action',
            label: t('filter.action'),
            options: ACTION_PREFIXES.map((p) => ({ value: `${p}.`, label: t(`prefix.${p}`) })),
          },
        ]}
      />
      <AuditTable key={JSON.stringify(data.query)} data={data.page} query={data.query} />
    </div>
  );
}

export default async function AuditPage({ searchParams }: PageProps<'/[locale]/admin/audit'>) {
  const t = await getTranslations('admin.audit');
  return (
    <AdminPage>
      <PageHeader title={t('title')} description={t('subtitle')} />
      <Suspense fallback={<TableSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}

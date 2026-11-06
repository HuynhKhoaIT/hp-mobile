'use client';

// Bảng lead: liên hệ hiện đầy đủ vì đây là việc của màn này (chỉ staff vào được), lời nhắn, nguồn, trạng thái, người xử lý.
// Đánh dấu đã liên hệ / đóng / mở lại từng dòng. Xuất CSV chỉ hiện với admin (route tự kiểm lại).
import type { AdminLead, AdminPage } from '@hp/core';
import { formatDate, type LeadStatus } from '@hp/shared';
import { Download, Inbox } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { DataTable, type DataColumn } from '@/components/admin/data-table';
import { Pagination, useRangeSummary } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { getPathname } from '@/i18n/navigation';
import type { Query } from '../../lib/params';
import { useAdminAction } from '../../lib/use-admin-action';
import { updateLeadAction } from '../actions';

const BASE = '/admin/leads';
const NEXT_STEPS: Record<LeadStatus, LeadStatus[]> = {
  new: ['contacted', 'closed'],
  contacted: ['closed'],
  closed: ['new'],
};

export function LeadsTable({ data, query, canExport }: { data: AdminPage<AdminLead>; query: Query; canExport: boolean }) {
  const t = useTranslations('admin.leads');
  const locale = asLocale(useLocale());
  const summary = useRangeSummary();
  const { pending, run } = useAdminAction();
  const filtered = Boolean(query.status || query.kind || query.q);
  const exportHref = getPathname({
    href: { pathname: '/admin/leads/export', query: query.status ? { status: query.status } : {} },
    locale,
  });

  const columns: DataColumn<AdminLead>[] = [
    {
      id: 'time',
      header: t('col.time'),
      cell: (l) => (
        <time dateTime={l.created_at} className="text-sm whitespace-nowrap text-fg tabular-nums">
          {formatDate(l.created_at, locale, 'datetime')}
        </time>
      ),
    },
    {
      id: 'contact',
      header: t('col.contact'),
      cell: (l) => (
        <span className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fg">{l.contact}</span>
          {l.name ? <span className="text-muted">{l.name}</span> : null}
        </span>
      ),
    },
    { id: 'kind', header: t('col.kind'), cell: (l) => <span className="text-sm text-fg">{t(`kind.${l.kind}`)}</span> },
    {
      id: 'message',
      header: t('col.message'),
      desktopOnly: true,
      cell: (l) => <p className="max-w-sm text-sm whitespace-pre-wrap text-fg">{l.message ?? '—'}</p>,
    },
    {
      id: 'source',
      header: t('col.source'),
      desktopOnly: true,
      cell: (l) => (
        <span className="flex flex-col gap-1 text-sm text-muted">
          <span>{l.source}</span>
          {l.utm.utm_source ? <span>{l.utm.utm_source}</span> : null}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('col.status'),
      cell: (l) => (
        <span className="flex flex-col items-start gap-1 text-sm">
          <StatusBadge kind="lead" status={l.status as LeadStatus} label={t(`status.${l.status}`)} />
          {l.handler_name ? <span className="text-muted">{l.handler_name}</span> : null}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('col.actions'),
      cell: (l) => (
        <span className="flex flex-wrap gap-2">
          {NEXT_STEPS[l.status as LeadStatus].map((status) => (
            <Button
              key={status}
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => updateLeadAction({ id: l.id, status }), { success: t('toast.updated') })}
            >
              {t(`to.${status}`)}
            </Button>
          ))}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {canExport ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{t('export_hint')}</p>
          <Button asChild>
            <a href={exportHref} download>
              <Download strokeWidth={1.75} aria-hidden />
              {t('export')}
            </a>
          </Button>
        </div>
      ) : null}
      <DataTable
        rows={data.items}
        columns={columns}
        getRowId={(l) => l.id}
        label={t('table_label')}
        basePath={BASE}
        query={query}
        summary={summary(data.page, data.pageSize, data.total)}
        empty={<EmptyState icon={Inbox} title={filtered ? t('empty_filtered') : t('empty')} />}
      />
      <Pagination basePath={BASE} query={query} page={data.page} pageCount={data.pageCount} />
    </div>
  );
}

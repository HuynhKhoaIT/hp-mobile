'use client';

// Bảng "Tin Zalo đã gửi": mỗi dòng = một tin (tự động hoặc mở Zalo). Cột: thời gian, người nhận (lead / người dùng, người dùng có link
// sang hồ sơ), nội dung, người gửi, loại tin, kết quả (+ kiểu gửi, lý do lỗi). Chỉ đọc; không có SĐT trong dữ liệu.
import type { AdminPage, ZaloLogItem } from '@hp/core';
import { formatDate } from '@hp/shared';
import { MessagesSquare } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { DataTable, type DataColumn } from '@/components/admin/data-table';
import { Pagination, useRangeSummary } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/shared/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import type { Query } from '../../lib/params';

const BASE = '/admin/zalo-messages';

export function ZaloLogTable({ data, query }: { data: AdminPage<ZaloLogItem>; query: Query }) {
  const t = useTranslations('admin.zalo_log');
  const tZalo = useTranslations('admin.zalo');
  const locale = asLocale(useLocale());
  const summary = useRangeSummary();
  const filtered = Boolean(query.status || query.mode || query.kind || query.target || query.q || query.from || query.to);

  const columns: DataColumn<ZaloLogItem>[] = [
    {
      id: 'time',
      header: t('col.time'),
      summary: true,
      cell: (m) => (
        <time dateTime={m.created_at} className="text-sm whitespace-nowrap text-fg tabular-nums">
          {formatDate(m.created_at, locale, 'datetime')}
        </time>
      ),
    },
    {
      id: 'to',
      header: t('col.to'),
      primary: true,
      cell: (m) => {
        const name = m.target_name ?? t('unknown_target');
        return (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={m.target_type === 'lead' ? 'neutral' : 'primary'}>{t(`target.${m.target_type}`)}</Badge>
            {m.target_type === 'user' ? (
              <Link href={`/admin/users/${m.target_id}`} className="font-medium text-fg underline-offset-4 hover:text-primary hover:underline">
                {name}
              </Link>
            ) : (
              <span className="font-medium text-fg">{name}</span>
            )}
          </span>
        );
      },
    },
    {
      id: 'message',
      header: t('col.message'),
      cell: (m) => (
        <span className="flex max-w-md flex-col gap-1">
          <p className="line-clamp-3 text-sm whitespace-pre-wrap text-fg">{m.content}</p>
          {m.status === 'failed' && m.error ? <span className="text-xs text-danger">{t('error_label', { error: m.error })}</span> : null}
        </span>
      ),
    },
    {
      id: 'staff',
      header: t('col.staff'),
      summary: true,
      cell: (m) => <span className="text-sm text-fg">{m.staff_name ?? t('unknown_staff')}</span>,
    },
    { id: 'kind', header: t('col.kind'), cell: (m) => <span className="text-sm text-fg">{tZalo(`kind.${m.kind}`)}</span> },
    {
      id: 'status',
      header: t('col.status'),
      cell: (m) => (
        <span className="flex flex-col items-start gap-1 text-sm">
          <StatusBadge kind="zalo" status={m.status} label={tZalo(`delivery.${m.status}`)} />
          <span className="text-xs text-muted">{tZalo(`mode.${m.mode}`)}</span>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        rows={data.items}
        columns={columns}
        getRowId={(m) => m.id}
        label={t('table_label')}
        basePath={BASE}
        query={query}
        summary={summary(data.page, data.pageSize, data.total)}
        empty={<EmptyState icon={MessagesSquare} title={filtered ? t('empty_filtered') : t('empty')} />}
      />
      <Pagination basePath={BASE} query={query} page={data.page} pageCount={data.pageCount} />
    </div>
  );
}

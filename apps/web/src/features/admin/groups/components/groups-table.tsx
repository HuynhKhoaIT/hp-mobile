'use client';

// Bảng nhóm ghép: tiêu đề (trang công khai, tab mới) + loại, chủ nhóm (hồ sơ admin), giờ bắt đầu, số chỗ, trạng thái,
// hành động: Huỷ nhóm (xác nhận + ghi chú bắt buộc; thành viên nhận thông báo) khi nhóm chưa kết thúc.
import type { AdminGroup, AdminPage } from '@hp/core';
import { formatDate } from '@hp/shared';
import { CalendarClock, ExternalLink } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/confirm-dialog';
import { DataTable, type DataColumn } from '@/components/admin/data-table';
import { Pagination, useRangeSummary } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import type { Query } from '../../lib/params';
import { useAdminAction } from '../../lib/use-admin-action';
import { cancelGroupAction } from '../actions';

const BASE = '/admin/groups';
const CANCELLABLE = new Set(['open', 'full', 'in_progress']);

export function GroupsTable({ data, query }: { data: AdminPage<AdminGroup>; query: Query }) {
  const t = useTranslations('admin.groups');
  const tFeature = useTranslations('common.feature');
  const tSub = useTranslations('group.sub_kind');
  const tStatus = useTranslations('common.status');
  const locale = asLocale(useLocale());
  const summary = useRangeSummary();
  const { pending, run } = useAdminAction();
  const [target, setTarget] = useState<AdminGroup | null>(null);
  const filtered = Boolean(query.q || query.kind || query.status || query.host);

  const columns: DataColumn<AdminGroup>[] = [
    {
      id: 'title',
      header: t('col.title'),
      cell: (g) => (
        <div className="flex min-w-56 flex-col gap-1">
          {g.slug ? (
            <Link
              href={`/nhom/${g.slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 font-medium text-fg underline-offset-4 hover:text-primary hover:underline"
            >
              <span className="line-clamp-2">{g.title}</span>
              <ExternalLink strokeWidth={1.75} className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">{t('opens_new_tab')}</span>
            </Link>
          ) : (
            <span className="font-medium text-fg">{g.title}</span>
          )}
          <span className="text-sm text-muted">
            {tFeature(g.kind)} · {tSub(g.sub_kind)}
            {g.short_id ? ` · #${g.short_id}` : ''}
          </span>
        </div>
      ),
    },
    {
      id: 'host',
      header: t('col.host'),
      desktopOnly: true,
      cell: (g) => (
        <Link href={`/admin/users/${g.host_id}`} className="text-sm text-fg underline-offset-4 hover:text-primary hover:underline">
          {g.host_name ?? t('unknown_host')}
        </Link>
      ),
    },
    {
      id: 'starts',
      header: t('col.starts'),
      sort: 'starts_at',
      cell: (g) => (
        <time dateTime={g.starts_at} className="text-sm whitespace-nowrap text-fg">
          {formatDate(g.starts_at, locale, 'datetime')}
        </time>
      ),
    },
    {
      id: 'seats',
      header: t('col.seats'),
      desktopOnly: true,
      cell: (g) => <span className="text-sm tabular-nums">{t('seats', { taken: g.seats_taken, total: g.seats_total })}</span>,
    },
    { id: 'status', header: t('col.status'), cell: (g) => <StatusBadge kind="group" status={g.status} label={tStatus(g.status)} /> },
    {
      id: 'actions',
      header: <span className="sr-only">{t('col.actions')}</span>,
      cell: (g) =>
        CANCELLABLE.has(g.status) ? (
          <Button variant="destructive" size="sm" disabled={pending} onClick={() => setTarget(g)}>
            {t('cancel')}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        rows={data.items}
        columns={columns}
        getRowId={(g) => g.id}
        label={t('table_label')}
        basePath={BASE}
        query={query}
        summary={summary(data.page, data.pageSize, data.total)}
        empty={
          <EmptyState
            icon={CalendarClock}
            title={filtered ? t('empty.filtered_title') : t('empty.title')}
            description={filtered ? t('empty.filtered_body') : undefined}
          />
        }
      />
      <Pagination basePath={BASE} query={query} page={data.page} pageCount={data.pageCount} />
      <AdminConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={t('confirm.title', { title: target?.title ?? '', host: target?.host_name ?? t('unknown_host') })}
        description={t('confirm.body')}
        confirmLabel={t('cancel')}
        destructive
        pending={pending}
        note={{ label: t('note_label'), hint: t('note_hint'), required: true, max: 500 }}
        onConfirm={({ note }) => {
          if (!target) return;
          const groupId = target.id;
          setTarget(null);
          run(() => cancelGroupAction({ groupId, note }), { success: t('toast.cancelled') });
        }}
      />
    </div>
  );
}

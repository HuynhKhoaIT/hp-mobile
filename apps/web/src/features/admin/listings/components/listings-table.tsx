'use client';

// Bảng tin (mọi trạng thái): tiêu đề (trang công khai, tab mới) + mã ngắn, danh mục, người đăng (hồ sơ admin), trạng thái,
// lượt xem, thời gian, hành động: Ẩn tin / Mở lại / Từ chối (xác nhận + ghi chú) — từng tin hoặc ẩn hàng loạt.
// Tin chờ duyệt → link sang hàng chờ kiểm duyệt (duyệt ở đó để có đủ lý do mẫu + thông báo đúng mẫu).
import type { AdminListing, AdminPage, StaffListingStatus } from '@hp/core';
import { formatNumber, formatRelative } from '@hp/shared';
import { ExternalLink, FileText, MoreHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/confirm-dialog';
import { DataTable, type DataColumn } from '@/components/admin/data-table';
import { Pagination, useRangeSummary } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import type { Query } from '../../lib/params';
import { useAdminAction } from '../../lib/use-admin-action';
import { bulkSetListingStatusAction, setListingStatusAction } from '../actions';

const BASE = '/admin/listings';

type Confirm = { ids: string[]; title: string | null; status: StaffListingStatus } | null;

/** Trạng thái staff được chuyển tới từ trạng thái hiện tại. */
function nextStatuses(status: AdminListing['status']): StaffListingStatus[] {
  if (status === 'active') return ['closed', 'rejected'];
  if (status === 'closed') return ['active'];
  if (status === 'pending_review') return ['rejected'];
  if (status === 'expired' || status === 'sold') return ['closed'];
  return [];
}

export function ListingsTable({ data, query, now }: { data: AdminPage<AdminListing>; query: Query; now: number }) {
  const t = useTranslations('admin.listings');
  const tCat = useTranslations('common.category');
  const tStatus = useTranslations('common.status');
  const locale = asLocale(useLocale());
  const summary = useRangeSummary();
  const { pending, run } = useAdminAction();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const nowDate = new Date(now);
  const filtered = Boolean(query.q || query.status || query.category || query.site || query.owner);

  const columns: DataColumn<AdminListing>[] = [
    {
      id: 'title',
      header: t('col.title'),
      cell: (l) => (
        <div className="flex min-w-56 flex-col gap-1">
          <Link
            href={`/tin/${l.slug}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 font-medium text-fg underline-offset-4 hover:text-primary hover:underline"
          >
            <span className="line-clamp-2">{l.title}</span>
            <ExternalLink strokeWidth={1.75} className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">{t('opens_new_tab')}</span>
          </Link>
          <span className="text-sm text-muted">
            {tCat(l.category)} · #{l.short_id}
          </span>
        </div>
      ),
    },
    {
      id: 'owner',
      header: t('col.owner'),
      desktopOnly: true,
      cell: (l) => (
        <Link href={`/admin/users/${l.owner_id}`} className="text-sm text-fg underline-offset-4 hover:text-primary hover:underline">
          {l.owner_name ?? t('unknown_owner')}
        </Link>
      ),
    },
    { id: 'status', header: t('col.status'), cell: (l) => <StatusBadge kind="listing" status={l.status} label={tStatus(l.status)} /> },
    {
      id: 'views',
      header: t('col.views'),
      sort: 'view_count',
      desktopOnly: true,
      cell: (l) => <span className="text-sm tabular-nums">{formatNumber(l.view_count, locale)}</span>,
    },
    {
      id: 'created',
      header: t('col.created'),
      sort: 'created_at',
      cell: (l) => (
        <time dateTime={l.created_at} className="text-sm whitespace-nowrap text-muted">
          {formatRelative(l.created_at, locale, nowDate)}
        </time>
      ),
    },
    {
      id: 'actions',
      header: <span className="sr-only">{t('col.actions')}</span>,
      cell: (l) => {
        const next = nextStatuses(l.status);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('actions_for', { title: l.title })} disabled={pending}>
                <MoreHorizontal strokeWidth={1.75} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {l.status === 'pending_review' ? (
                <DropdownMenuItem asChild>
                  <Link href="/admin/moderation">{t('open_queue')}</Link>
                </DropdownMenuItem>
              ) : null}
              {next.map((s) => (
                <DropdownMenuItem
                  key={s}
                  variant={s === 'active' ? 'default' : 'destructive'}
                  onSelect={() => setConfirm({ ids: [l.id], title: l.title, status: s })}
                >
                  {t(`set.${s}`)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild>
                <Link href={`/admin/users/${l.owner_id}`}>{t('open_owner')}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const status = confirm?.status;
  const many = (confirm?.ids.length ?? 0) > 1;

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        rows={data.items}
        columns={columns}
        getRowId={(l) => l.id}
        label={t('table_label')}
        basePath={BASE}
        query={query}
        selectable
        rowLabel={(l) => t('select_row', { title: l.title })}
        summary={summary(data.page, data.pageSize, data.total)}
        bulkActions={(ids, clear) => (
          <>
            <Button variant="ghost" size="sm" onClick={clear}>
              {t('clear_selection')}
            </Button>
            <Button variant="destructive" size="sm" disabled={pending} onClick={() => setConfirm({ ids, title: null, status: 'closed' })}>
              {t('bulk_hide', { count: ids.length })}
            </Button>
          </>
        )}
        empty={
          <EmptyState icon={FileText} title={filtered ? t('empty.filtered_title') : t('empty.title')} description={filtered ? t('empty.filtered_body') : undefined} />
        }
      />
      <Pagination basePath={BASE} query={query} page={data.page} pageCount={data.pageCount} />

      <AdminConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          !confirm || !status
            ? ''
            : many
              ? t(`confirm.${status}_many`, { count: confirm.ids.length })
              : t(`confirm.${status}_title`, { title: confirm.title ?? '' })
        }
        description={status ? t(`confirm.${status}_body`) : undefined}
        confirmLabel={status ? (many ? t('bulk_hide', { count: confirm?.ids.length ?? 0 }) : t(`set.${status}`)) : ''}
        destructive={status !== 'active'}
        pending={pending}
        note={{ label: t('note_label'), hint: t('note_hint'), required: status !== 'active', max: 500 }}
        onConfirm={({ note }) => {
          if (!confirm) return;
          const { ids, status: s } = confirm;
          setConfirm(null);
          if (ids.length === 1 && ids[0]) {
            const listingId = ids[0];
            run(() => setListingStatusAction({ listingId, status: s, note }), { success: t(`toast.${s}`) });
          } else {
            run(() => bulkSetListingStatusAction({ ids, status: s, note }), {
              success: (d) => (d.failed ? t('toast.bulk_partial', { ok: d.done.length, failed: d.failed }) : t('toast.bulk_done', { count: d.done.length })),
            });
          }
        }}
      />
    </div>
  );
}

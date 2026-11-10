'use client';

// Bảng báo cáo: đối tượng (link trang công khai / hồ sơ admin) + số báo cáo đang mở của đối tượng, lý do, mô tả, người báo,
// thời gian, trạng thái, hành động. Hành động: Đang xem / Đã xử lý / Bỏ qua (từng dòng hoặc hàng loạt), Ẩn tin / Huỷ nhóm
// (xác nhận + ghi chú, tự đóng mọi báo cáo của đối tượng), người dùng → mở hồ sơ admin để khoá. Quyền: action + RLS.
import type { AdminReport, AdminPage, ReportStatus } from '@hp/core';
import { formatRelative } from '@hp/shared';
import { ExternalLink, Flag, MoreHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/confirm-dialog';
import { DataTable, type DataColumn } from '@/components/admin/data-table';
import { Pagination, useRangeSummary } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/shared/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import type { Query } from '../../lib/params';
import { useAdminAction } from '../../lib/use-admin-action';
import { cancelReportedGroupAction, hideReportedListingAction, setReportsStatusAction } from '../actions';

const BASE = '/admin/reports';

type Pending =
  | { kind: 'status'; ids: string[]; status: ReportStatus; label: string }
  | { kind: 'hide'; report: AdminReport }
  | { kind: 'cancel'; report: AdminReport }
  | null;

export function ReportsView({ data, query, now }: { data: AdminPage<AdminReport>; query: Query; now: number }) {
  const t = useTranslations('admin.reports');
  const tReport = useTranslations('common.report');
  const locale = asLocale(useLocale());
  const summary = useRangeSummary();
  const { pending, run } = useAdminAction();
  const [confirm, setConfirm] = useState<Pending>(null);
  const nowDate = new Date(now);

  const targetLabel = (r: AdminReport) => r.target.title ?? (r.target_type === 'message' ? t('message_hidden') : t('target_missing'));

  const setStatus = (ids: string[], status: ReportStatus, after?: () => void) =>
    run(() => setReportsStatusAction({ ids, status }), {
      success: (d) => t('toast.status', { count: d.updated.length, status: t(`status.${status}`) }),
      onDone: () => after?.(),
    });

  const columns: DataColumn<AdminReport>[] = [
    {
      id: 'target',
      header: t('col.target'),
      cell: (r) => (
        <div className="flex min-w-56 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <Badge>{tReport(`targets.${r.target_type}`)}</Badge>
            {r.target_open_count > 1 ? <Badge tone="danger">{t('open_count', { count: r.target_open_count })}</Badge> : null}
          </span>
          <TargetLink report={r} label={targetLabel(r)} />
          {r.target.deleted ? <span className="text-sm text-muted">{t('target_deleted')}</span> : null}
        </div>
      ),
    },
    {
      id: 'reason',
      header: t('col.reason'),
      cell: (r) => (
        <div className="flex max-w-xs flex-col gap-1">
          <span className="font-medium text-fg">{tReport(`reasons.${r.reason}`)}</span>
          {r.detail ? <span className="line-clamp-3 text-sm text-muted">{r.detail}</span> : null}
        </div>
      ),
    },
    {
      id: 'reporter',
      header: t('col.reporter'),
      desktopOnly: true,
      cell: (r) => <span className="text-sm text-fg">{r.reporter_name ?? t('unknown_user')}</span>,
    },
    {
      id: 'created',
      header: t('col.created'),
      cell: (r) => (
        <time dateTime={r.created_at} className="text-sm whitespace-nowrap text-muted">
          {formatRelative(r.created_at, locale, nowDate)}
        </time>
      ),
    },
    {
      id: 'status',
      header: t('col.status'),
      cell: (r) => (
        <div className="flex flex-col gap-1">
          <StatusBadge kind="report" status={r.status} label={t(`status.${r.status}`)} />
          {r.resolver_name && r.resolved_at ? (
            <span className="text-xs text-muted">{t('resolved_by', { name: r.resolver_name, time: formatRelative(r.resolved_at, locale, nowDate) })}</span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'actions',
      header: <span className="sr-only">{t('col.actions')}</span>,
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('actions_for', { target: targetLabel(r) })} disabled={pending}>
              <MoreHorizontal strokeWidth={1.75} aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {(['reviewing', 'resolved', 'dismissed'] as const)
              .filter((s) => s !== r.status)
              .map((s) => (
                <DropdownMenuItem key={s} onSelect={() => setStatus([r.id], s)}>
                  {t(`set.${s}`)}
                </DropdownMenuItem>
              ))}
            {r.status === 'open' || r.status === 'reviewing' ? (
              <>
                {r.target_type === 'listing' && r.target.title && !r.target.deleted ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirm({ kind: 'hide', report: r })}>
                      {t('hide_listing')}
                    </DropdownMenuItem>
                  </>
                ) : null}
                {r.target_type === 'group' && r.target.title && !r.target.deleted ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirm({ kind: 'cancel', report: r })}>
                      {t('cancel_group')}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </>
            ) : null}
            {r.target.owner_id ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/admin/users/${r.target.owner_id}`}>{r.target_type === 'profile' ? t('open_user') : t('open_owner')}</Link>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const active = !query.status || query.status === 'open' || query.status === 'reviewing' || query.status === 'active';

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        rows={data.items}
        columns={columns}
        getRowId={(r) => r.id}
        label={t('table_label')}
        basePath={BASE}
        query={query}
        selectable={active}
        rowLabel={(r) => t('select_row', { target: targetLabel(r) })}
        summary={summary(data.page, data.pageSize, data.total)}
        bulkActions={(ids, clear) => (
          <>
            <Button variant="ghost" size="sm" onClick={clear}>
              {t('clear_selection')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setConfirm({ kind: 'status', ids, status: 'resolved', label: t('bulk.resolve', { count: ids.length }) })}
            >
              {t('bulk.resolve', { count: ids.length })}
            </Button>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => setConfirm({ kind: 'status', ids, status: 'dismissed', label: t('bulk.dismiss', { count: ids.length }) })}
            >
              {t('bulk.dismiss', { count: ids.length })}
            </Button>
          </>
        )}
        empty={
          <EmptyState
            icon={Flag}
            title={active ? t('empty.active_title') : t('empty.other_title')}
            description={active ? t('empty.active_body') : t('empty.other_body')}
          />
        }
      />
      <Pagination basePath={BASE} query={query} page={data.page} pageCount={data.pageCount} />

      <AdminConfirmDialog
        open={confirm?.kind === 'status'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'status' ? t('bulk.title', { count: confirm.ids.length, status: t(`status.${confirm.status}`) }) : ''}
        description={t('bulk.description')}
        confirmLabel={confirm?.kind === 'status' ? confirm.label : ''}
        pending={pending}
        onConfirm={() => {
          if (confirm?.kind !== 'status') return;
          const { ids, status } = confirm;
          setConfirm(null);
          setStatus(ids, status);
        }}
      />

      <AdminConfirmDialog
        open={confirm?.kind === 'hide' || confirm?.kind === 'cancel'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.kind === 'hide'
            ? t('hide.title', { title: confirm.report.target.title ?? '' })
            : confirm?.kind === 'cancel'
              ? t('cancel.title', { title: confirm.report.target.title ?? '' })
              : ''
        }
        description={confirm?.kind === 'cancel' ? t('cancel.description') : t('hide.description')}
        confirmLabel={confirm?.kind === 'cancel' ? t('cancel.confirm') : t('hide.confirm')}
        destructive
        pending={pending}
        note={{ label: t('note_label'), hint: t('note_hint'), required: true, max: 500 }}
        onConfirm={({ note }) => {
          if (confirm?.kind !== 'hide' && confirm?.kind !== 'cancel') return;
          const { report, kind } = confirm;
          setConfirm(null);
          if (kind === 'hide') {
            run(() => hideReportedListingAction({ listingId: report.target_id, note }), { success: t('toast.hidden') });
          } else {
            run(() => cancelReportedGroupAction({ groupId: report.target_id, note }), { success: t('toast.cancelled') });
          }
        }}
      />
    </div>
  );
}

function TargetLink({ report, label }: { report: AdminReport; label: string }) {
  const t = useTranslations('admin.reports');
  const { target } = report;
  const href =
    target.type === 'listing' && target.slug
      ? `/tin/${target.slug}`
      : target.type === 'group' && target.slug
        ? `/nhom/${target.slug}`
        : target.type === 'profile'
          ? `/admin/users/${target.id}`
          : null;
  if (!href || !target.title) return <span className="font-medium text-muted">{label}</span>;
  const external = target.type !== 'profile';
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener' : undefined}
      className="inline-flex items-center gap-1 font-medium text-fg underline-offset-4 hover:text-primary hover:underline"
    >
      <span className="line-clamp-2">{label}</span>
      {external ? (
        <>
          <ExternalLink strokeWidth={1.75} className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">{t('opens_new_tab')}</span>
        </>
      ) : null}
    </Link>
  );
}

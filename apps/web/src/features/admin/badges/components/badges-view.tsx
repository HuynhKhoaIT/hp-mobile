'use client';

// Bảng yêu cầu huy hiệu (chờ duyệt cũ trước) + hộp "Xem & duyệt": người xin (họ tên để đối chiếu, SĐT che), giấy tờ
// (signed URL 5 phút, ký khi mở — ảnh xem ngay, PDF nhúng + mở tab mới), Duyệt / Từ chối (lý do mẫu + ghi chú → lý do
// gửi người dùng). Phím tắt trong hộp: A duyệt, R từ chối. Quyền: action + RLS; trigger DB ghi audit + thông báo.
import type { AdminBadgeRequest, AdminPage } from '@hp/core';
import { formatRelative } from '@hp/shared';
import { BadgeCheck, ExternalLink, FileWarning, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/confirm-dialog';
import { DataTable, type DataColumn } from '@/components/admin/data-table';
import { Kbd } from '@/components/admin/kbd';
import { Pagination, useRangeSummary } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/shared/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { asLocale } from '@/features/listing/display';
import type { Query } from '../../lib/params';
import { useAdminAction } from '../../lib/use-admin-action';
import { PersonName, PersonSummary } from '../../users/components/person-summary';
import { getBadgeDocumentAction, reviewBadgeAction } from '../actions';

const BASE = '/admin/badges';
const REJECT_PRESETS = ['unreadable', 'name_mismatch', 'wrong_document', 'expired', 'other'] as const;

export function BadgesView({ data, query, now }: { data: AdminPage<AdminBadgeRequest>; query: Query; now: number }) {
  const t = useTranslations('admin.badges');
  const tBadge = useTranslations('listing.owner_badge');
  const locale = asLocale(useLocale());
  const summary = useRangeSummary();
  const [openId, setOpenId] = useState<string | null>(null);
  const nowDate = new Date(now);
  const open = data.items.find((r) => r.id === openId) ?? null;

  const columns: DataColumn<AdminBadgeRequest>[] = [
    {
      id: 'user',
      header: t('col.user'),
      cell: (r) => (r.user ? <PersonName person={r.user} /> : <span className="text-muted">{t('unknown_user')}</span>),
    },
    { id: 'badge', header: t('col.badge'), cell: (r) => <Badge tone="primary">{tBadge(r.badge)}</Badge> },
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
        <div className="flex max-w-xs flex-col gap-1">
          <StatusBadge kind="badge" status={r.status} label={t(`status.${r.status}`)} />
          {r.reviewer_name && r.reviewed_at ? (
            <span className="text-xs text-muted">{t('reviewed_by', { name: r.reviewer_name, time: formatRelative(r.reviewed_at, locale, nowDate) })}</span>
          ) : null}
          {r.reject_reason ? <span className="line-clamp-2 text-xs text-muted">{r.reject_reason}</span> : null}
        </div>
      ),
    },
    {
      id: 'actions',
      header: <span className="sr-only">{t('col.actions')}</span>,
      cell: (r) => (
        <Button size="sm" variant={r.status === 'pending' ? 'default' : 'outline'} onClick={() => setOpenId(r.id)}>
          {r.status === 'pending' ? t('review') : t('view')}
        </Button>
      ),
    },
  ];

  const pendingTab = !query.status || query.status === 'pending';

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        rows={data.items}
        columns={columns}
        getRowId={(r) => r.id}
        label={t('table_label')}
        basePath={BASE}
        query={query}
        summary={summary(data.page, data.pageSize, data.total)}
        onOpen={(r) => setOpenId(r.id)}
        activeId={openId}
        empty={
          <EmptyState
            icon={BadgeCheck}
            title={pendingTab ? t('empty.pending_title') : t('empty.other_title')}
            description={pendingTab ? t('empty.pending_body') : t('empty.other_body')}
          />
        }
      />
      <Pagination basePath={BASE} query={query} page={data.page} pageCount={data.pageCount} />
      <ReviewDialog request={open} now={now} onClose={() => setOpenId(null)} />
    </div>
  );
}

type DocState = { status: 'loading' } | { status: 'error'; code: string } | { status: 'ready'; url: string; kind: 'image' | 'pdf' };

function ReviewDialog({ request, now, onClose }: { request: AdminBadgeRequest | null; now: number; onClose: () => void }) {
  return (
    <Dialog open={request !== null} onOpenChange={(o) => !o && onClose()}>
      {request ? <ReviewBody key={request.id} request={request} now={now} onClose={onClose} /> : null}
    </Dialog>
  );
}

function ReviewBody({ request, now, onClose }: { request: AdminBadgeRequest; now: number; onClose: () => void }) {
  const t = useTranslations('admin.badges');
  const tBadge = useTranslations('listing.owner_badge');
  const tCommon = useTranslations('common.actions');
  const errorText = useErrorText();
  const locale = asLocale(useLocale());
  const { pending, run } = useAdminAction();
  const [doc, setDoc] = useState<DocState>(request.document_path ? { status: 'loading' } : { status: 'error', code: 'document_missing' });
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  const actionable = request.status === 'pending';
  const who = request.user?.full_name || request.user?.display_name || t('unknown_user');
  const badgeLabel = tBadge(request.badge);

  const load = useCallback(() => {
    if (!request.document_path) return;
    setDoc({ status: 'loading' });
    void getBadgeDocumentAction({ id: request.id }).then((r) =>
      setDoc(r.ok ? { status: 'ready', url: r.data.url, kind: r.data.kind } : { status: 'error', code: r.code }),
    );
  }, [request.document_path, request.id]);

  useEffect(() => {
    if (request.document_path) {
      void getBadgeDocumentAction({ id: request.id }).then((r) =>
        setDoc(r.ok ? { status: 'ready', url: r.data.url, kind: r.data.kind } : { status: 'error', code: r.code }),
      );
    }
  }, [request.document_path, request.id]);

  // Phím tắt A / R khi hộp đang mở và chưa mở hộp xác nhận.
  useEffect(() => {
    if (!actionable) return;
    const onKey = (e: KeyboardEvent) => {
      if (confirm || e.altKey || e.ctrlKey || e.metaKey || (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName))) return;
      const key = e.key.toLowerCase();
      if (key === 'a') {
        e.preventDefault();
        setConfirm('approve');
      } else if (key === 'r') {
        e.preventDefault();
        setConfirm('reject');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actionable, confirm]);

  const submit = (approve: boolean, rejectReason?: string) =>
    run(() => reviewBadgeAction({ id: request.id, approve, rejectReason }), {
      success: approve ? t('toast.approved', { badge: badgeLabel, name: who }) : t('toast.rejected', { badge: badgeLabel, name: who }),
      onDone: onClose,
    });

  return (
    <DialogContent className="sm:max-w-3xl" closeLabel={tCommon('close')}>
      <DialogHeader>
        <DialogTitle>{t('dialog.title', { badge: badgeLabel, name: who })}</DialogTitle>
        <DialogDescription>
          {t('dialog.submitted', { time: formatRelative(request.created_at, locale, new Date(now)) })} · {t('dialog.privacy')}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        {request.user ? <PersonSummary person={request.user} locale={locale} now={now} /> : null}

        <section aria-label={t('dialog.document')} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-md font-semibold text-fg">{t('dialog.document')}</h3>
            {doc.status === 'ready' ? (
              <Button asChild variant="ghost" size="sm">
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink strokeWidth={1.75} aria-hidden />
                  {t('dialog.open_new_tab')}
                </a>
              </Button>
            ) : null}
          </div>
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-2">
            {doc.status === 'loading' ? (
              <Skeleton className="h-80 w-full" />
            ) : doc.status === 'error' ? (
              <div role="alert" className="flex flex-col items-center gap-3 p-6 text-center">
                <FileWarning strokeWidth={1.75} className="size-8 text-muted" aria-hidden />
                <p className="text-md text-muted">
                  {doc.code === 'document_missing' ? t('dialog.document_purged') : errorText(doc.code)}
                </p>
                {doc.code !== 'document_missing' ? (
                  <Button variant="outline" size="sm" onClick={load}>
                    <RefreshCw strokeWidth={1.75} aria-hidden />
                    {tCommon('retry')}
                  </Button>
                ) : null}
              </div>
            ) : doc.kind === 'pdf' ? (
              <iframe src={doc.url} title={t('dialog.document')} className="h-96 w-full bg-surface" />
            ) : (
              <Image
                src={doc.url}
                alt={t('dialog.document_alt', { badge: badgeLabel, name: who })}
                width={1200}
                height={900}
                unoptimized
                className="h-auto max-h-96 w-full object-contain"
              />
            )}
          </div>
          <p className="text-sm text-muted">{t('dialog.url_expiry')}</p>
        </section>

        {!actionable && request.reject_reason ? (
          <p className="rounded-md border border-border p-3 text-md text-fg">
            <span className="font-medium">{t('dialog.reject_reason')}: </span>
            {request.reject_reason}
          </p>
        ) : null}
      </div>

      {actionable ? (
        <DialogFooter>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => setConfirm('reject')}>
            {t('reject')}
            <Kbd className="hidden sm:inline-flex">R</Kbd>
          </Button>
          <Button type="button" disabled={pending} onClick={() => setConfirm('approve')}>
            {t('approve')}
            <Kbd className="hidden bg-primary-light sm:inline-flex">A</Kbd>
          </Button>
        </DialogFooter>
      ) : null}

      <AdminConfirmDialog
        open={confirm === 'approve'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t('approve_confirm.title', { badge: badgeLabel, name: who })}
        description={t('approve_confirm.description')}
        confirmLabel={t('approve_confirm.confirm')}
        pending={pending}
        onConfirm={() => {
          setConfirm(null);
          submit(true);
        }}
      />
      <AdminConfirmDialog
        open={confirm === 'reject'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t('reject_confirm.title', { badge: badgeLabel, name: who })}
        description={t('reject_confirm.description')}
        confirmLabel={t('reject_confirm.confirm')}
        destructive
        pending={pending}
        reasons={{ legend: t('reject_confirm.reason_label'), options: REJECT_PRESETS.map((r) => ({ value: r, label: t(`reject_reasons.${r}`) })) }}
        note={{ label: t('reject_confirm.note_label'), hint: t('reject_confirm.note_hint'), max: 150 }}
        onConfirm={({ reason, note }) => {
          setConfirm(null);
          const preset = reason ? t(`reject_reasons.${reason}`) : '';
          submit(false, (note ? `${preset}: ${note}` : preset).slice(0, 200));
        }}
      />
    </DialogContent>
  );
}

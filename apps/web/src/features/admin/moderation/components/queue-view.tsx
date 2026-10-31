'use client';

// Hàng chờ tương tác: danh sách (chọn nhiều → duyệt hàng loạt) + panel chi tiết + phím tắt A / R / J / K.
// Ghi qua Server Action (reviewListingAction / approveListingsAction). Lạc quan: tin biến khỏi danh sách ngay (useOptimistic),
// tự chuyển sang tin kế; action xong thì server làm mới trang (revalidatePath) trong cùng transition — lỗi thì transition
// kết thúc mà dữ liệu server không đổi → tin hiện lại (hoàn tác) + toast lỗi. Mọi kiểm quyền nằm ở action + RLS.
import type { ModerationDetail, ModerationItem } from '@hp/core';
import type { ModerationReason, ModerationStatus, RejectReason } from '@hp/shared';
import { ChevronLeft, ChevronRight, ListChecks, PartyPopper } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useOptimistic, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { asLocale } from '@/features/listing/display';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { approveListingsAction, getModerationItemAction, reviewListingAction } from '../actions';
import { queueHref } from '../labels';
import { type DetailExtras, DetailPanel, DetailPlaceholder } from './detail-panel';
import { QueueRow } from './queue-row';
import { RejectDialog } from './reject-dialog';

type Props = {
  items: ModerationItem[];
  status: ModerationStatus;
  reason: ModerationReason | null;
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  now: number;
  sites: Record<string, string>;
  /** `?item=` trên URL (mở thẳng một tin). */
  initialItemId: string | null;
};

const DESKTOP = '(min-width: 1024px)';

function subscribeDesktop(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/** ≥ 1024px (panel chi tiết là cột phải). Server / lần render đầu: false (giống điện thoại) để không lệch hydrate. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP).matches, () => false);
}

/** Đang gõ trong ô nhập / có phím bổ trợ → không bắt phím tắt. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function QueueView({ items, status, reason, page, pageCount, pageSize, total, now, sites, initialItemId }: Props) {
  const t = useTranslations('admin.moderation');
  const errorText = useErrorText();
  const locale = asLocale(useLocale());
  const router = useRouter();
  const toast = useToast();
  const actionable = status === 'pending';

  const [list, removeOptimistic] = useOptimistic(items, (state, listingIds: readonly string[]) =>
    state.filter((i) => !listingIds.includes(i.listing_id)),
  );
  const [busy, startTransition] = useTransition();
  const isDesktop = useIsDesktop();
  // null = chưa chọn: desktop tự xem tin đầu tiên (duyệt liên tục bằng phím); điện thoại thì đóng panel (toàn màn hình).
  const [pickedId, setSelectedId] = useState<string | null>(initialItemId);
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [rejecting, setRejecting] = useState<ModerationItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [extras, setExtras] = useState<Record<string, DetailExtras>>({});
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const inflight = useRef(new Set<string>());
  const selectedId = pickedId ?? (isDesktop ? (list[0]?.id ?? null) : null);

  const index = selectedId ? list.findIndex((i) => i.id === selectedId) : -1;
  const fromList = index >= 0 ? list[index] : undefined;
  const loaded = selectedId ? extras[selectedId] : undefined;
  // Mở bằng link tới tin không nằm trong trang này → dùng dữ liệu chi tiết vừa tải.
  const selected: ModerationItem | null = fromList ?? (loaded && typeof loaded === 'object' ? loaded : null);

  // Đồng bộ ?item= trên URL (chia sẻ link / tải lại giữ tin đang xem) — không điều hướng, không tải lại dữ liệu.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set('item', selectedId);
    else url.searchParams.delete('item');
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
  }, [selectedId]);

  // Lịch sử kiểm duyệt + số tin của chủ tin: tải khi mở tin (chưa có = đang tải), giữ lại khi quay lại tin đó.
  useEffect(() => {
    const id = selectedId;
    if (!id || extras[id] !== undefined || inflight.current.has(id)) return;
    inflight.current.add(id);
    void getModerationItemAction({ id }).then((r) => {
      inflight.current.delete(id);
      setExtras((prev) => ({ ...prev, [id]: r.ok ? (r.data satisfies ModerationDetail) : 'error' }));
    });
  }, [selectedId, extras]);

  const retryExtras = (id: string) =>
    setExtras((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

  // Cuộn dòng đang chọn vào tầm nhìn khi chuyển bằng J / K.
  useEffect(() => {
    if (selectedId) rowRefs.current.get(selectedId)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  /** Tin kế tiếp sau khi `item` rời danh sách (ưu tiên tin bên dưới). */
  const neighbor = useCallback(
    (ids: readonly string[]) => {
      const remaining = list.filter((i) => !ids.includes(i.id));
      const first = list.findIndex((i) => ids.includes(i.id));
      const after = list.slice(first + 1).find((i) => !ids.includes(i.id));
      return after ?? remaining.at(-1) ?? null;
    },
    [list],
  );

  const review = useCallback(
    (item: ModerationItem, decision: { approve: true } | { approve: false; reason: RejectReason; note: string }) => {
      const next = neighbor([item.id]);
      setSelectedId(next?.id ?? null);
      setChecked((prev) => {
        const copy = new Set(prev);
        copy.delete(item.id);
        return copy;
      });
      startTransition(async () => {
        removeOptimistic([item.listing_id]);
        const result = await reviewListingAction(
          decision.approve
            ? { listingId: item.listing_id, approve: true }
            : { listingId: item.listing_id, approve: false, reason: decision.reason, note: decision.note || undefined },
        );
        if (result.ok) {
          toast.show(t(decision.approve ? 'toast.approved' : 'toast.rejected', { title: item.listing.title }));
        } else if (result.code === 'conflict' || result.code === 'not_found') {
          // Người khác vừa xử lý / chủ tin đã sửa: làm mới để danh sách đúng với server.
          toast.show(t('toast.already_reviewed'), 'error');
          router.refresh();
        } else {
          toast.show(errorText(result.code), 'error');
          setSelectedId(item.id);
        }
      });
    },
    [errorText, neighbor, removeOptimistic, router, t, toast],
  );

  const bulkApprove = () => {
    const targets = list.filter((i) => checked.has(i.id));
    setBulkOpen(false);
    if (targets.length === 0) return;
    if (selectedId && checked.has(selectedId)) setSelectedId(neighbor(targets.map((i) => i.id))?.id ?? null);
    setChecked(new Set());
    startTransition(async () => {
      removeOptimistic(targets.map((i) => i.listing_id));
      const result = await approveListingsAction({ listingIds: targets.map((i) => i.listing_id) });
      if (!result.ok) {
        toast.show(errorText(result.code), 'error');
        return;
      }
      const { approved, failed } = result.data;
      if (failed.length === 0) toast.show(t('toast.bulk_done', { count: approved.length }));
      else {
        toast.show(t('toast.bulk_partial', { ok: approved.length, failed: failed.length }), 'error');
        router.refresh();
      }
    });
  };

  const go = useCallback(
    (delta: 1 | -1) => {
      if (list.length === 0) return;
      const target = index < 0 ? list[0] : list[Math.min(Math.max(index + delta, 0), list.length - 1)];
      if (target) setSelectedId(target.id);
    },
    [index, list],
  );

  // Phím tắt: A duyệt, R từ chối, J tin sau, K tin trước, Esc đóng chi tiết (điện thoại).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isTypingTarget(e.target)) return;
      if (rejecting || bulkOpen || document.querySelector('[role="dialog"]')) return;
      const key = e.key.toLowerCase();
      if (key === 'j') {
        e.preventDefault();
        go(1);
      } else if (key === 'k') {
        e.preventDefault();
        go(-1);
      } else if (key === 'escape' && selectedId && !isDesktop) {
        setSelectedId(null);
      } else if (actionable && selected && selected.status === 'pending' && fromList) {
        if (key === 'a') {
          e.preventDefault();
          review(selected, { approve: true });
        } else if (key === 'r') {
          e.preventDefault();
          setRejecting(selected);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actionable, bulkOpen, fromList, go, isDesktop, rejecting, review, selected, selectedId]);

  const allChecked = list.length > 0 && list.every((i) => checked.has(i.id));
  const someChecked = list.some((i) => checked.has(i.id));
  const checkedCount = list.filter((i) => checked.has(i.id)).length;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const ownerLabel = (item: ModerationItem) =>
    item.owner?.deleted ? t('deleted_owner') : (item.owner?.display_name ?? t('unknown_owner'));

  const emptyState = useMemo(() => {
    if (reason) {
      return (
        <EmptyState
          title={t('empty.filtered_title')}
          description={t('empty.filtered_body')}
          action={
            <Button asChild variant="outline">
              <Link href={queueHref({ status })}>{t('empty.clear_filter')}</Link>
            </Button>
          }
        />
      );
    }
    if (status === 'pending') {
      return (
        <EmptyState
          icon={PartyPopper}
          title={t('empty.pending_title')}
          description={t('empty.pending_body')}
          action={
            <Button asChild variant="outline">
              <Link href={queueHref({ status: 'approved' })}>{t('empty.view_approved')}</Link>
            </Button>
          }
        />
      );
    }
    return <EmptyState icon={ListChecks} title={t(`empty.${status}_title`)} description={t('empty.other_body')} />;
  }, [reason, status, t]);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
      {/* Danh sách */}
      <section
        aria-label={t('list_label')}
        className={cn('flex min-w-0 flex-col gap-3', list.length === 0 && !selected ? 'lg:col-span-12' : 'lg:col-span-5')}
      >
        {actionable && list.length > 0 ? (
          <div
            className={cn(
              'sticky top-16 z-20 flex min-h-14 flex-wrap items-center gap-3 rounded-md border px-3 py-2 transition-colors duration-150',
              someChecked ? 'border-primary bg-primary-light' : 'border-border bg-surface',
            )}
          >
            <Checkbox
              checked={allChecked ? true : someChecked ? 'indeterminate' : false}
              onCheckedChange={(v) => setChecked(v === true ? new Set(list.map((i) => i.id)) : new Set())}
              aria-label={t('select_all')}
            />
            <span className="flex-1 text-sm font-medium text-fg">
              {someChecked ? t('selected', { count: checkedCount }) : t('results', { from, to, total })}
            </span>
            {someChecked ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setChecked(new Set())}>
                  {t('clear_selection')}
                </Button>
                <Button size="sm" onClick={() => setBulkOpen(true)} disabled={busy}>
                  {t('bulk_approve', { count: checkedCount })}
                </Button>
              </>
            ) : null}
          </div>
        ) : list.length > 0 ? (
          <p className="text-sm text-muted">{t('results', { from, to, total })}</p>
        ) : null}

        {list.length === 0 ? (
          <div className="rounded-md border border-border bg-surface">{emptyState}</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((item) => (
              <QueueRow
                key={item.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(item.id, el);
                  else rowRefs.current.delete(item.id);
                }}
                item={item}
                locale={locale}
                now={now}
                selected={item.id === selectedId}
                selectable={actionable}
                checked={checked.has(item.id)}
                onSelect={() => setSelectedId(item.id)}
                onCheckedChange={(v) =>
                  setChecked((prev) => {
                    const copy = new Set(prev);
                    if (v) copy.add(item.id);
                    else copy.delete(item.id);
                    return copy;
                  })
                }
              />
            ))}
          </ul>
        )}

        {pageCount > 1 ? (
          <nav aria-label={t('pagination_label')} className="flex items-center justify-between gap-2 pt-2">
            <Button asChild={page > 1} variant="outline" size="sm" disabled={page <= 1}>
              {page > 1 ? (
                <Link href={queueHref({ status, reason, page: page - 1 })}>
                  <ChevronLeft strokeWidth={1.75} aria-hidden />
                  {t('prev_page')}
                </Link>
              ) : (
                <span>
                  <ChevronLeft strokeWidth={1.75} aria-hidden />
                  {t('prev_page')}
                </span>
              )}
            </Button>
            <span className="text-sm text-muted">{t('page', { page, total: pageCount })}</span>
            <Button asChild={page < pageCount} variant="outline" size="sm" disabled={page >= pageCount}>
              {page < pageCount ? (
                <Link href={queueHref({ status, reason, page: page + 1 })}>
                  {t('next_page')}
                  <ChevronRight strokeWidth={1.75} aria-hidden />
                </Link>
              ) : (
                <span>
                  {t('next_page')}
                  <ChevronRight strokeWidth={1.75} aria-hidden />
                </span>
              )}
            </Button>
          </nav>
        ) : null}
      </section>

      {/* Chi tiết: desktop cột phải dính; điện thoại phủ toàn màn hình khi đã chọn. */}
      <aside
        aria-label={t('detail.label')}
        className={cn(
          selected ? 'fixed inset-0 z-40 flex' : 'hidden',
          'flex-col bg-surface lg:sticky lg:inset-auto lg:top-20 lg:z-auto lg:col-span-7 lg:flex lg:max-h-admin-panel lg:overflow-hidden lg:rounded-md lg:border lg:border-border',
          list.length === 0 && !selected && 'lg:hidden',
        )}
      >
        {selected ? (
          <DetailPanel
            key={selected.id}
            item={selected}
            extras={extras[selected.id] ?? 'loading'}
            locale={locale}
            now={now}
            position={index >= 0 ? { index, total: list.length } : null}
            actionable={actionable && index >= 0}
            busy={busy}
            sites={sites}
            onPrev={index > 0 ? () => go(-1) : null}
            onNext={index >= 0 && index < list.length - 1 ? () => go(1) : null}
            onApprove={() => review(selected, { approve: true })}
            onReject={() => setRejecting(selected)}
            onClose={() => setSelectedId(null)}
            onRetryExtras={() => retryExtras(selected.id)}
          />
        ) : list.length > 0 ? (
          <DetailPlaceholder />
        ) : null}
      </aside>

      <RejectDialog
        target={rejecting ? { title: rejecting.listing.title, owner: ownerLabel(rejecting) } : null}
        onOpenChange={(open) => {
          if (!open) setRejecting(null);
        }}
        onConfirm={(reasonCode, note) => {
          const item = rejecting;
          setRejecting(null);
          if (item) review(item, { approve: false, reason: reasonCode, note });
        }}
      />

      <ConfirmDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title={t('bulk.title', { count: checkedCount })}
        description={t('bulk.description')}
        confirmLabel={t('bulk.confirm', { count: checkedCount })}
        pending={busy}
        onConfirm={bulkApprove}
      />
    </div>
  );
}

'use client';

// Thao tác một tin của tôi: menu ⋮ (DropdownMenu: Sửa · Đánh dấu đã bán (xác nhận) · Đóng tin · Mở lại · Gửi duyệt lại
// (tin bị từ chối → status active, DB chuyển pending_review) · Gia hạn · Xoá (xác nhận)) và hàng thao tác nhanh dưới thẻ
// (style Stitch: 1 nút chính + tối đa 2 nút viền — chọn bởi quickActions trong manage.ts; Xoá chỉ ở menu).
// Cả hai dùng chung useManage: gọi Server Action (actions.ts) → toast manage.*_done → làm mới query "Tin của tôi" của
// TanStack (khối xem trước ở /toi + số trên chip) và router.refresh() (trang /toi/tin-cua-toi đọc theo request).
// Thao tác nào hiện do manage.ts quyết định (chỉ UI); DB mới là nơi chặn.
// useManage export cho thẻ "Quản lý tin" của mini-app (cùng action / toast / làm mới, hàng nút riêng theo Stitch).
// Đồ thất lạc: "Đã nhận lại đồ" / "Đã trả cho chủ" → ReturnedDialog (xác nhận → "Bàn giao thành công" → đánh giá, style
// Stitch; RPC mark_listing_returned trong hộp, đóng hộp mới làm mới danh sách để thẻ không biến mất giữa chừng). Đã trả lại →
// "Cảm ơn người trả đồ" / "Đánh giá người nhận" → RateListingDialog (rate_listing). Cần `returnable` (tiêu đề, loại, ảnh,
// attributes) để dựng thẻ trong hộp.
import { keys } from '@hp/core';
import { formatDate } from '@hp/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  CalendarClock,
  CircleCheck,
  type LucideIcon,
  MoreVertical,
  PackageCheck,
  Pencil,
  RotateCcw,
  Send,
  Star,
  Trash2,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useState, useTransition } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { Link, useRouter } from '@/i18n/navigation';
import type { ActionResult } from '@/lib/action-result';
import { cn } from '@/lib/utils';
import { deleteListingAction, renewListingAction, setListingStatusAction } from '../actions';
import { asLocale } from '../display';
import type { ManageAction, QuickAction } from '../manage';
import { RateListingDialog } from './rate-listing-dialog';
import { rateLabelKey, ReturnedDialog, type ReturnedListing, returnedLabelKeys } from './returned-dialog';

const editHref = (id: string) => `/toi/tin-cua-toi/${id}/sua`;

const ICON: Record<QuickAction['action'], LucideIcon> = {
  edit: Pencil,
  sold: CircleCheck,
  returned: PackageCheck,
  rate: Star,
  close: Archive,
  reopen: RotateCcw,
  resubmit: Send,
  renew: CalendarClock,
};

export function useManage(id: string, returnable?: ReturnedListing) {
  const t = useTranslations('listing.manage');
  const tForm = useTranslations('listing.form');
  const locale = asLocale(useLocale());
  const errorText = useErrorText();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<'sold' | 'delete' | 'returned' | 'rate' | null>(null);

  const run = <T,>(action: () => Promise<ActionResult<T>>, done: (data: T) => string) => {
    startTransition(async () => {
      const res = await action();
      setConfirm(null);
      if (!res.ok) {
        toast.show(errorText(res.code), 'error');
        return;
      }
      toast.show(done(res.data));
      // Khoá myListings() gồm cả số liệu (myListingStats) → chip và khối xem trước cập nhật cùng lúc.
      void queryClient.invalidateQueries({ queryKey: keys.myListings() });
      router.refresh();
    });
  };

  const markSold = () => run(() => setListingStatusAction({ id, status: 'sold' }), () => t('sold_done'));
  const remove = () => run(() => deleteListingAction(id), () => t('deleted'));
  // Sau khi trả đồ (đóng hộp): làm mới số liệu / khối xem trước + trang (thẻ chuyển sang "Đã đóng" + "Đã trả lại").
  const afterReturned = () => {
    void queryClient.invalidateQueries({ queryKey: keys.myListings() });
    router.refresh();
  };
  const handlers: Record<Exclude<QuickAction['action'], 'edit'>, () => void> = {
    sold: () => setConfirm('sold'),
    returned: () => setConfirm('returned'),
    rate: () => setConfirm('rate'),
    close: () => run(() => setListingStatusAction({ id, status: 'closed' }), () => t('closed_done')),
    reopen: () => run(() => setListingStatusAction({ id, status: 'active' }), () => t('reopened')),
    resubmit: () => run(() => setListingStatusAction({ id, status: 'active' }), () => tForm('pending_title')),
    renew: () => run(() => renewListingAction(id), (expires) => t('renewed', { date: formatDate(expires, locale) })),
  };

  const dialogs: ReactNode = (
    <>
      <ConfirmDialog
        open={confirm === 'sold'}
        onOpenChange={(open) => setConfirm(open ? 'sold' : null)}
        title={t('sold_title')}
        description={t('sold_body')}
        confirmLabel={t('sold_confirm')}
        pending={pending}
        onConfirm={markSold}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(open) => setConfirm(open ? 'delete' : null)}
        title={t('delete_title')}
        description={t('delete_body')}
        confirmLabel={t('delete_confirm')}
        destructive
        pending={pending}
        onConfirm={remove}
      />
      {returnable ? (
        <>
          <ReturnedDialog
            open={confirm === 'returned'}
            onOpenChange={(open) => setConfirm(open ? 'returned' : null)}
            listingId={id}
            listing={returnable}
            onFinished={afterReturned}
          />
          <RateListingDialog open={confirm === 'rate'} onOpenChange={(open) => setConfirm(open ? 'rate' : null)} listingId={id} />
        </>
      ) : null}
    </>
  );

  return { pending, handlers, askDelete: () => setConfirm('delete'), dialogs };
}

export function MyListingMenu({
  id,
  title,
  actions,
  returnable,
  editHref: editLink,
  className,
}: {
  id: string;
  title: string;
  actions: ManageAction[];
  /** Đồ thất lạc: dữ liệu cho hộp "Đã nhận lại đồ". */
  returnable?: ReturnedListing;
  /** Trang sửa (mini-app: /pass-do/quan-ly/[id]/sua); thiếu → /toi/tin-cua-toi/[id]/sua. */
  editHref?: string;
  className?: string;
}) {
  const t = useTranslations('listing.manage');
  const tLost = useTranslations('listing.lost_found');
  const { pending, handlers, askDelete, dialogs } = useManage(id, returnable);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pending}
            aria-label={`${t('more')}: ${title}`}
            className={cn('text-muted', className)}
          >
            <MoreVertical strokeWidth={1.75} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.includes('edit') ? (
            <DropdownMenuItem asChild>
              <Link href={editLink ?? editHref(id)}>
                <Pencil strokeWidth={1.75} aria-hidden />
                {t('edit')}
              </Link>
            </DropdownMenuItem>
          ) : null}
          {actions.includes('sold') ? (
            <DropdownMenuItem onSelect={handlers.sold}>
              <CircleCheck strokeWidth={1.75} aria-hidden />
              {t('mark_sold')}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('returned') && returnable ? (
            <DropdownMenuItem onSelect={handlers.returned}>
              <PackageCheck strokeWidth={1.75} aria-hidden />
              {tLost(returnedLabelKeys(returnable.category).action)}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('rate') && returnable ? (
            <DropdownMenuItem onSelect={handlers.rate}>
              <Star strokeWidth={1.75} aria-hidden />
              {tLost(rateLabelKey(returnable.category))}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('close') ? (
            <DropdownMenuItem onSelect={handlers.close}>
              <Archive strokeWidth={1.75} aria-hidden />
              {t('mark_closed')}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('reopen') ? (
            <DropdownMenuItem onSelect={handlers.reopen}>
              <RotateCcw strokeWidth={1.75} aria-hidden />
              {t('reopen')}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('resubmit') ? (
            <DropdownMenuItem onSelect={handlers.resubmit}>
              <Send strokeWidth={1.75} aria-hidden />
              {t('resubmit')}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('renew') ? (
            <DropdownMenuItem onSelect={handlers.renew}>
              <CalendarClock strokeWidth={1.75} aria-hidden />
              {t('renew')}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('delete') ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={askDelete}>
                <Trash2 strokeWidth={1.75} aria-hidden />
                {t('delete')}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </>
  );
}

/** Nhãn ngắn của nút nhanh ("Đã bán" thay "Đánh dấu đã bán" — nút hẹp). */
const QUICK_LABEL: Record<Exclude<QuickAction['action'], 'returned' | 'rate'>, string> = {
  edit: 'edit',
  sold: 'sold_confirm',
  close: 'mark_closed',
  reopen: 'reopen',
  resubmit: 'resubmit',
  renew: 'renew',
};

const QUICK_TONE: Record<QuickAction['tone'], string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary/90',
  // Chữ trắng trên cam: chữ 14 px đậm (semibold) mới đạt (.claude/rules/web-ui-design.md).
  accent: 'bg-accent text-on-accent hover:bg-accent/90',
  outline: 'border-border bg-surface text-fg hover:bg-surface-2',
};

export function MyListingQuickActions({
  id,
  title,
  items,
  returnable,
}: {
  id: string;
  title: string;
  items: QuickAction[];
  /** Đồ thất lạc: dữ liệu cho hộp "Đã nhận lại đồ" (thiếu → bỏ nút returned). */
  returnable?: ReturnedListing;
}) {
  const t = useTranslations('listing.manage');
  const tLost = useTranslations('listing.lost_found');
  const { pending, handlers, dialogs } = useManage(id, returnable);
  const shown = returnable ? items : items.filter((q) => q.action !== 'returned' && q.action !== 'rate');
  if (shown.length === 0) return null;
  // Không có nút chính (đang đăng chưa tới hạn gia hạn, đã đóng) → các nút viền chia đều.
  const hasMain = shown.some((q) => q.tone !== 'outline');

  return (
    <>
      <div role="group" aria-label={title} className="mt-3 flex flex-wrap gap-2 border-t border-border pt-2.5">
        {shown.map(({ action, tone }) => {
          const Icon = ICON[action];
          const className = cn(
            'min-w-0 font-semibold whitespace-normal leading-tight',
            QUICK_TONE[tone],
            tone !== 'outline' || !hasMain ? 'flex-1' : 'shrink-0',
          );
          const content = (
            <>
              <Icon aria-hidden strokeWidth={1.75} />
              {action === 'returned'
                ? tLost(returnedLabelKeys(returnable?.category ?? 'lost').action)
                : action === 'rate'
                  ? tLost(rateLabelKey(returnable?.category ?? 'lost'))
                  : t(QUICK_LABEL[action])}
            </>
          );
          return action === 'edit' ? (
            <Button key={action} asChild size="sm" variant={tone === 'outline' ? 'outline' : 'default'} className={className}>
              <Link href={editHref(id)}>{content}</Link>
            </Button>
          ) : (
            <Button
              key={action}
              type="button"
              size="sm"
              variant={tone === 'outline' ? 'outline' : 'default'}
              disabled={pending}
              className={className}
              onClick={handlers[action]}
            >
              {content}
            </Button>
          );
        })}
      </div>
      {dialogs}
    </>
  );
}

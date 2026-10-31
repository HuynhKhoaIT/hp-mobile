'use client';

// Menu thao tác một tin của tôi (DropdownMenu): Sửa · Đánh dấu đã bán (xác nhận) · Đóng tin · Mở lại · Gửi duyệt lại
// (tin bị từ chối → status active, DB chuyển pending_review) · Gia hạn · Xoá (xác nhận).
// Gọi Server Action (actions.ts) → toast manage.*_done → router.refresh() (trang /toi/tin-cua-toi đọc theo request).
// Thao tác nào hiện do manage.ts quyết định (chỉ UI); DB mới là nơi chặn.
import { formatDate } from '@hp/shared';
import { Archive, CalendarClock, CircleCheck, MoreVertical, Pencil, RotateCcw, Send, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
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
import { deleteListingAction, renewListingAction, setListingStatusAction } from '../actions';
import { asLocale } from '../display';
import type { ManageAction } from '../manage';

export function MyListingMenu({
  id,
  title,
  actions,
}: {
  id: string;
  title: string;
  actions: ManageAction[];
}) {
  const t = useTranslations('listing.manage');
  const tForm = useTranslations('listing.form');
  const locale = asLocale(useLocale());
  const errorText = useErrorText();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<'sold' | 'delete' | null>(null);

  const run = <T,>(action: () => Promise<ActionResult<T>>, done: (data: T) => string) => {
    startTransition(async () => {
      const res = await action();
      setConfirm(null);
      if (!res.ok) {
        toast.show(errorText(res.code), 'error');
        return;
      }
      toast.show(done(res.data));
      router.refresh();
    });
  };

  const markSold = () => run(() => setListingStatusAction({ id, status: 'sold' }), () => t('sold_done'));
  const close = () => run(() => setListingStatusAction({ id, status: 'closed' }), () => t('closed_done'));
  const reopen = () => run(() => setListingStatusAction({ id, status: 'active' }), () => t('reopened'));
  const resubmit = () => run(() => setListingStatusAction({ id, status: 'active' }), () => tForm('pending_title'));
  const renew = () => run(() => renewListingAction(id), (expires) => t('renewed', { date: formatDate(expires, locale) }));
  const remove = () => run(() => deleteListingAction(id), () => t('deleted'));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" disabled={pending} aria-label={`${t('more')}: ${title}`}>
            <MoreVertical strokeWidth={1.75} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {actions.includes('edit') ? (
            <DropdownMenuItem asChild>
              <Link href={`/toi/tin-cua-toi/${id}/sua`}>
                <Pencil strokeWidth={1.75} aria-hidden />
                {t('edit')}
              </Link>
            </DropdownMenuItem>
          ) : null}
          {actions.includes('sold') ? (
            <DropdownMenuItem onSelect={() => setConfirm('sold')}>
              <CircleCheck strokeWidth={1.75} aria-hidden />
              {t('mark_sold')}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('close') ? (
            <DropdownMenuItem onSelect={close}>
              <Archive strokeWidth={1.75} aria-hidden />
              {t('mark_closed')}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('reopen') ? (
            <DropdownMenuItem onSelect={reopen}>
              <RotateCcw strokeWidth={1.75} aria-hidden />
              {t('reopen')}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('resubmit') ? (
            <DropdownMenuItem onSelect={resubmit}>
              <Send strokeWidth={1.75} aria-hidden />
              {t('resubmit')}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('renew') ? (
            <DropdownMenuItem onSelect={renew}>
              <CalendarClock strokeWidth={1.75} aria-hidden />
              {t('renew')}
            </DropdownMenuItem>
          ) : null}
          {actions.includes('delete') ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirm('delete')}>
                <Trash2 strokeWidth={1.75} aria-hidden />
                {t('delete')}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  );
}

'use client';

// Hộp "Đã nhận lại đồ" / "Đã trả cho chủ" (đồ thất lạc, chủ tin) — khớp ReturnedSheet của app, ba bước trong một Dialog:
// 1. Xác nhận (style Stitch "Popup xác minh nhận lại đồ"): nhãn "Bàn giao an toàn" (khiên) → thẻ nhỏ món đồ (ảnh bìa, nhãn
//    Mất đồ / Nhặt được, tiêu đề, nơi mất / nhặt) → (tin nhặt được) hộp nhắc hỏi đặc điểm riêng trước khi trao → giải thích
//    tin sẽ đóng → nút chính ghi rõ việc + Huỷ. Gọi useMarkListingReturned (@hp/core/react → RPC mark_listing_returned:
//    returned = true + đóng tin trong một lệnh) với deferRefresh.
// 2. Thành công (style Stitch "Popup Xác nhận bàn giao thành công"): dấu tích trong vòng success → nhãn "Bàn giao thành
//    công" → tiêu đề + câu theo loại tin → thẻ món đồ (nhãn "Đã trả lại") → "Gửi lời cảm ơn / Đánh giá" (khi có người đã
//    nhắn tin về tin) + "Nhắn tin" (hội thoại gần nhất) + "Để sau".
// 3. Đánh giá: ListingRateForm.
// Dữ liệu chỉ làm mới khi đóng hộp sau khi đã trả (`onFinished` → nơi gọi router.refresh()): làm mới sớm khiến thẻ / khối
// chứa hộp biến mất giữa chừng (tin chuyển tab "Đã đóng", khối chủ tin ẩn khi đã trả lại). Trang công khai /tin/[slug] được
// làm mới bởi webhook trg_listings_revalidate (tin đổi trạng thái → /api/revalidate).
// Cố ý khác Stitch: không form khai tên / CCCD / ảnh đối chiếu / giờ đến nhận, không thẻ người nhận, điểm Karma, ảnh biên bản.
import { useListingCounterparts, useMarkListingReturned } from '@hp/core/react';
import type { ListingCategory } from '@hp/shared';
import { CircleCheck, MapPin, MessageCircle, PackageCheck, ShieldCheck, Star } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Badge } from '@/components/shared/badge';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { Link } from '@/i18n/navigation';
import { listingImageUrl } from '@/lib/images';
import { ListingPlaceholder } from './listing-placeholder';
import { ListingRateForm } from './listing-rate-form';

export type ReturnedListing = { title: string; category: ListingCategory; images: readonly string[]; attributes: unknown };
type Step = 'confirm' | 'done' | 'rate';

/** Key chữ (ns listing.lost_found) theo loại tin: mất đồ → "Đã nhận lại đồ", nhặt được → "Đã trả cho chủ". */
export function returnedLabelKeys(category: ListingCategory) {
  return category === 'found'
    ? { action: 'mark_returned_found', title: 'mark_returned_found_confirm_title' }
    : { action: 'mark_returned', title: 'mark_returned_confirm_title' };
}

/** Đánh giá sau khi trả đồ: tin mất đồ → "Cảm ơn người trả đồ", tin nhặt được → "Đánh giá người nhận" (ns listing.lost_found). */
export function rateLabelKey(category: ListingCategory) {
  return category === 'found' ? 'rate_cta_found' : 'rate_cta_lost';
}

function placeOf(attributes: unknown): string | null {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return null;
  const v = (attributes as Record<string, unknown>).place;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export function ReturnedDialog({
  open,
  onOpenChange,
  listingId,
  listing,
  onFinished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listing: ReturnedListing;
  /** Đóng hộp sau khi đã đánh dấu trả lại (thành công): làm mới trang / danh sách. */
  onFinished: () => void;
}) {
  const t = useTranslations('listing.lost_found');
  const tCommon = useTranslations('common.actions');
  const errorText = useErrorText();
  const toast = useToast();
  const mark = useMarkListingReturned(listingId, { deferRefresh: true });
  const [step, setStep] = useState<Step>('confirm');
  const people = useListingCounterparts(listingId, { enabled: open && step !== 'confirm' });
  const labels = returnedLabelKeys(listing.category);
  const found = listing.category === 'found';
  const latest = people.data?.[0];
  const hasPeople = (people.data?.length ?? 0) > 0;

  const close = () => {
    if (mark.isPending) return;
    const finished = step !== 'confirm';
    setStep('confirm');
    onOpenChange(false);
    if (finished) {
      mark.refresh();
      onFinished();
    }
  };
  const confirm = () =>
    mark.mutate(undefined, {
      onSuccess: () => setStep('done'),
      onError: (e) => toast.show(errorText(e.code), 'error'),
    });

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent closeLabel={tCommon('close')}>
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <span aria-hidden className="flex size-8 items-center justify-center rounded-md bg-primary-light">
                  <ShieldCheck strokeWidth={1.75} className="size-5" />
                </span>
                {t('safe_flow')}
              </p>
              <DialogTitle>{t(labels.title)}</DialogTitle>
              <DialogDescription>{t('mark_returned_confirm_body')}</DialogDescription>
            </DialogHeader>
            <ItemCard listing={listing} />
            {found ? (
              <p role="note" className="flex items-start gap-3 rounded-md bg-primary-light p-3 text-md text-fg">
                <ShieldCheck aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-primary" />
                {t('returned_check')}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={mark.isPending} onClick={close}>
                {tCommon('cancel')}
              </Button>
              <Button type="button" disabled={mark.isPending} aria-busy={mark.isPending || undefined} onClick={confirm}>
                <PackageCheck aria-hidden strokeWidth={1.75} />
                {t(labels.action)}
              </Button>
            </DialogFooter>
          </>
        ) : step === 'done' ? (
          <>
            <DialogHeader className="items-center text-center">
              <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
                <CircleCheck strokeWidth={1.75} className="size-10" />
              </span>
              <Badge tone="success">{t('done_badge')}</Badge>
              <DialogTitle>{t('done_title')}</DialogTitle>
              <DialogDescription>{t(found ? 'done_body_found' : 'done_body_lost')}</DialogDescription>
            </DialogHeader>
            <ItemCard listing={listing} returned />
            <div className="flex flex-col gap-2">
              {hasPeople || people.isPending ? (
                <Button type="button" disabled={people.isPending} onClick={() => setStep('rate')}>
                  <Star aria-hidden strokeWidth={1.75} />
                  {t('done_rate')}
                </Button>
              ) : null}
              {latest ? (
                <Button asChild variant="outline">
                  <Link href={`/tin-nhan/${latest.conversationId}`} onClick={close}>
                    <MessageCircle aria-hidden strokeWidth={1.75} />
                    {t('done_message')}
                  </Link>
                </Button>
              ) : null}
              <Button type="button" variant="ghost" onClick={close}>
                {t('done_later')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('rate.title')}</DialogTitle>
              <DialogDescription>{t('rate.hint')}</DialogDescription>
            </DialogHeader>
            <ListingRateForm listingId={listingId} onDone={close} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Thẻ nhỏ món đồ: ảnh bìa, Mất đồ / Nhặt được (+ "Đã trả lại" khi xong), tiêu đề, nơi mất / nhặt. */
function ItemCard({ listing, returned = false }: { listing: ReturnedListing; returned?: boolean }) {
  const t = useTranslations('listing.lost_found');
  const found = listing.category === 'found';
  const place = placeOf(listing.attributes);
  const cover = listing.images[0];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
        {cover ? (
          <Image src={listingImageUrl(cover, 'thumb')} alt="" fill unoptimized sizes="56px" className="object-cover" />
        ) : (
          <ListingPlaceholder category={listing.category} size="sm" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="flex flex-wrap gap-1">
          <Badge tone={found ? 'success' : 'danger'}>{t(found ? 'kind_found' : 'kind_lost')}</Badge>
          {returned ? <Badge tone="primary">{t('returned_badge')}</Badge> : null}
        </span>
        <p className="line-clamp-2 text-md font-semibold text-fg">{listing.title}</p>
        {place ? (
          <p className="flex max-w-full items-center gap-1 text-sm text-muted">
            <MapPin aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
            <span className="truncate">{place}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

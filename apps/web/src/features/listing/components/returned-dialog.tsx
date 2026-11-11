'use client';

// Hộp xác nhận "Đã nhận lại đồ" / "Đã trả cho chủ" (đồ thất lạc, chủ tin) — style Stitch "Popup xác minh nhận lại đồ",
// khớp ReturnedSheet của app: thẻ nhỏ món đồ (ảnh bìa, nhãn Mất đồ / Nhặt được, tiêu đề, nơi mất / nhặt) → (tin nhặt được) hộp
// nhắc hỏi đặc điểm riêng trước khi trao → giải thích tin sẽ đóng → nút chính ghi rõ việc + Huỷ. Nơi gọi chạy
// markListingReturnedAction (RPC mark_listing_returned: returned = true + đóng tin trong một lệnh).
// Cố ý khác Stitch: không có form khai tên / CCCD / ảnh đối chiếu / giờ đến nhận — không có luồng hay dữ liệu đó.
import type { ListingCategory } from '@hp/shared';
import { MapPin, PackageCheck, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/shared/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { listingImageUrl } from '@/lib/images';
import { ListingPlaceholder } from './listing-placeholder';

export type ReturnedListing = { title: string; category: ListingCategory; images: readonly string[]; attributes: unknown };

/** Key chữ (ns listing.lost_found) theo loại tin: mất đồ → "Đã nhận lại đồ", nhặt được → "Đã trả cho chủ". */
export function returnedLabelKeys(category: ListingCategory) {
  return category === 'found'
    ? { action: 'mark_returned_found', title: 'mark_returned_found_confirm_title' }
    : { action: 'mark_returned', title: 'mark_returned_confirm_title' };
}

function placeOf(attributes: unknown): string | null {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return null;
  const v = (attributes as Record<string, unknown>).place;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export function ReturnedDialog({
  open,
  onOpenChange,
  listing,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: ReturnedListing;
  pending: boolean;
  onConfirm: () => void;
}) {
  const t = useTranslations('listing.lost_found');
  const tCommon = useTranslations('common.actions');
  const labels = returnedLabelKeys(listing.category);
  const found = listing.category === 'found';
  const place = placeOf(listing.attributes);
  const cover = listing.images[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(labels.title)}</DialogTitle>
          <DialogDescription>{t('mark_returned_confirm_body')}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
            {cover ? (
              <Image src={listingImageUrl(cover, 'thumb')} alt="" fill unoptimized sizes="56px" className="object-cover" />
            ) : (
              <ListingPlaceholder category={listing.category} size="sm" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <Badge tone={found ? 'success' : 'danger'}>{t(found ? 'kind_found' : 'kind_lost')}</Badge>
            <p className="line-clamp-2 text-md font-semibold text-fg">{listing.title}</p>
            {place ? (
              <p className="flex max-w-full items-center gap-1 text-sm text-muted">
                <MapPin aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
                <span className="truncate">{place}</span>
              </p>
            ) : null}
          </div>
        </div>
        {found ? (
          <p role="note" className="flex items-start gap-3 rounded-md bg-primary-light p-3 text-md text-fg">
            <ShieldCheck aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-primary" />
            {t('returned_check')}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button type="button" disabled={pending} onClick={onConfirm}>
            <PackageCheck aria-hidden strokeWidth={1.75} />
            {t(labels.action)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

// "Đánh giá & lời cảm ơn" mở riêng (không qua bước trả đồ) cho tin đồ thất lạc đã trả lại — khớp ListingRateSheet của app:
// - RateListingDialog: Dialog bọc ListingRateForm — chủ tin mở từ thẻ "Tin của tôi" ("Cảm ơn người trả đồ" /
//   "Đánh giá người nhận").
// - RateListingEntry: nút + dialog tự ẩn cho NGƯỜI KHÔNG PHẢI CHỦ TIN đã nhắn tin với chủ tin về tin — gắn ở chi tiết tin
//   khi tin đã trả lại và người xem không phải chủ tin. Chưa chat / khách → không hiện; đã chấm → "Bạn đã chấm N/5".
//   Quyền thật ở RPC rate_listing.
import { ratedCounterpart } from '@hp/core';
import { useListingCounterparts } from '@hp/core/react';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ListingRateForm } from './listing-rate-form';

export function RateListingDialog({
  open,
  onOpenChange,
  listingId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
}) {
  const t = useTranslations();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('common.actions.close')}>
        <DialogHeader>
          <DialogTitle>{t('listing.lost_found.rate.title')}</DialogTitle>
          <DialogDescription>{t('listing.lost_found.rate.hint')}</DialogDescription>
        </DialogHeader>
        {open ? <ListingRateForm listingId={listingId} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

/** Nút "Đánh giá chủ tin" cho người đã chat về tin đã trả lại (tự ẩn khi không có ai để chấm). */
export function RateListingEntry({ listingId }: { listingId: string }) {
  const t = useTranslations();
  const people = useListingCounterparts(listingId);
  const [open, setOpen] = useState(false);
  const list = people.data ?? [];
  if (!list.some((c) => c.isOwner)) return null;
  const rated = ratedCounterpart(list);
  if (rated?.myScore) {
    return (
      <p className="flex items-center gap-2 text-md text-muted">
        <Star aria-hidden strokeWidth={1.75} className="size-5 fill-warning text-warning" />
        {t('group.rate.your_score', { score: rated.myScore })}
      </p>
    );
  }
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Star aria-hidden strokeWidth={1.75} />
        {t('listing.lost_found.rate_cta_owner')}
      </Button>
      <RateListingDialog open={open} onOpenChange={setOpen} listingId={listingId} />
    </>
  );
}

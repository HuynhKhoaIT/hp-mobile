'use client';

// Đồ thất lạc — khối riêng của CHỦ TIN trên /tin/[slug] (config.returnable). Trang chi tiết là bản cache công khai nên khối
// này chỉ hiện ở trình duyệt khi người xem là chủ tin (chỉ là UI: RPC list_lost_found_matches + RLS mới quyết định).
// - "Tin có thể khớp": useLostFoundMatches (trigger khớp tự động: cùng loại đồ, gần thời điểm, gần vị trí). Skeleton /
//   lỗi + thử lại / rỗng (sẽ được báo khi có tin khớp).
// - "Đã nhận lại đồ" / "Đã trả cho chủ" (tin đang đăng, chưa trả): ReturnedDialog (xác nhận → "Bàn giao thành công" →
//   đánh giá / lời cảm ơn — style Stitch) gọi RPC mark_listing_returned; đóng hộp sau khi trả → router.refresh(). Khối được
//   giữ lại khi đang mở hộp sau khi trả (`handover`), dù trang đã có returned = true, để hộp không biến mất giữa chừng.
// Người xem KHÁC chủ tin, tin đã trả lại: nút cảm ơn / đánh giá chủ tin (RateListingEntry — tự ẩn khi chưa từng chat về tin).
import { useLostFoundMatches } from '@hp/core/react';
import { PackageCheck, SearchCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { ListingGridSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { useSessionUser } from '@/features/auth/components/use-session-user';
import { useRouter } from '@/i18n/navigation';
import { ListingGrid } from './listing-grid';
import { RateListingEntry } from './rate-listing-dialog';
import { ReturnedDialog, type ReturnedListing, returnedLabelKeys } from './returned-dialog';

export function LostFoundOwnerPanel({
  listingId,
  ownerId,
  item,
  active,
  returned,
}: {
  listingId: string;
  ownerId: string;
  /** Món đồ (thẻ trong hộp xác nhận). */
  item: ReturnedListing;
  /** listingDisplayStatus === 'active'. */
  active: boolean;
  returned: boolean;
}) {
  const userId = useSessionUser();
  // Hộp trả đồ đang mở (kể cả bước "Bàn giao thành công" / đánh giá sau khi trả) → giữ khối để hộp không bị gỡ.
  const [confirming, setConfirming] = useState(false);
  if (!userId) return null;
  if (userId !== ownerId) return returned ? <RateListingEntry listingId={listingId} /> : null;
  // Đã trả lại → không còn gì để khớp / đánh dấu (nhãn "Đã trả lại" ở phần server của trang).
  if (returned && !confirming) return null;
  return (
    <OwnerPanel
      listingId={listingId}
      item={item}
      canMarkReturned={active && !returned}
      confirming={confirming}
      setConfirming={setConfirming}
    />
  );
}

function OwnerPanel({
  listingId,
  item,
  canMarkReturned,
  confirming,
  setConfirming,
}: {
  listingId: string;
  item: ReturnedListing;
  canMarkReturned: boolean;
  confirming: boolean;
  setConfirming: (open: boolean) => void;
}) {
  const t = useTranslations('listing.lost_found');
  const router = useRouter();
  const matches = useLostFoundMatches(listingId);

  return (
    <section aria-labelledby="lost-found-owner" className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <SearchCheck aria-hidden strokeWidth={1.75} className="mt-0.5 size-6 shrink-0 text-primary" />
          <div className="flex flex-col gap-0.5">
            <h2 id="lost-found-owner" className="text-lg font-semibold text-fg">
              {t('matches_title')}
            </h2>
            <p className="text-sm text-muted">{t('matches_hint')}</p>
          </div>
        </div>
        {canMarkReturned ? (
          <Button type="button" variant="default" onClick={() => setConfirming(true)}>
            <PackageCheck aria-hidden strokeWidth={1.75} />
            {t(returnedLabelKeys(item.category).action)}
          </Button>
        ) : null}
      </div>

      {matches.isPending ? (
        <ListingGridSkeleton count={2} layout="row" />
      ) : matches.isError ? (
        <ErrorState code={matches.error.code} onRetry={() => void matches.refetch()} />
      ) : matches.data.length === 0 ? (
        <p className="rounded-md bg-surface-2 p-4 text-md text-muted">{t('matches_empty')}</p>
      ) : (
        <ListingGrid items={matches.data} now={matches.dataUpdatedAt} layout="row" />
      )}

      <ReturnedDialog
        open={confirming}
        onOpenChange={setConfirming}
        listingId={listingId}
        listing={item}
        onFinished={() => router.refresh()}
      />
    </section>
  );
}

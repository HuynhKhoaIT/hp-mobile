'use client';

// Đồ thất lạc — khối riêng của CHỦ TIN trên /tin/[slug] (config.returnable). Trang chi tiết là bản cache công khai nên khối
// này chỉ hiện ở trình duyệt khi người xem là chủ tin (chỉ là UI: RPC list_lost_found_matches + RLS mới quyết định).
// - "Tin có thể khớp": useLostFoundMatches (trigger khớp tự động: cùng loại đồ, gần thời điểm, gần vị trí). Skeleton /
//   lỗi + thử lại / rỗng (sẽ được báo khi có tin khớp).
// - "Đã nhận lại đồ" / "Đã trả cho chủ" (tin đang đăng, chưa trả): ReturnedDialog (thẻ món đồ + nhắc đối chiếu — style Stitch
//   L2) → markListingReturnedAction (returned = true + đóng tin) → toast → router.refresh() (trang đọc lại bản cache đã làm
//   mới bằng updateTag).
import { useLostFoundMatches } from '@hp/core/react';
import { PackageCheck, SearchCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { ListingGridSkeleton } from '@/components/shared/skeletons';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { useSessionUser } from '@/features/auth/components/use-session-user';
import { useRouter } from '@/i18n/navigation';
import { markListingReturnedAction } from '../actions';
import { ListingGrid } from './listing-grid';
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
  // Đã trả lại → không còn gì để khớp / đánh dấu (nhãn "Đã trả lại" ở phần server của trang).
  if (!userId || userId !== ownerId || returned) return null;
  return <OwnerPanel listingId={listingId} item={item} canMarkReturned={active} />;
}

function OwnerPanel({ listingId, item, canMarkReturned }: { listingId: string; item: ReturnedListing; canMarkReturned: boolean }) {
  const t = useTranslations('listing.lost_found');
  const toast = useToast();
  const errorText = useErrorText();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const matches = useLostFoundMatches(listingId);

  const markReturned = () =>
    startTransition(async () => {
      const res = await markListingReturnedAction(listingId);
      if (!res.ok) {
        toast.show(errorText(res.code), 'error');
        return;
      }
      setConfirming(false);
      toast.show(t('returned_done'));
      router.refresh();
    });

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

      <ReturnedDialog open={confirming} onOpenChange={setConfirming} listing={item} pending={pending} onConfirm={markReturned} />
    </section>
  );
}

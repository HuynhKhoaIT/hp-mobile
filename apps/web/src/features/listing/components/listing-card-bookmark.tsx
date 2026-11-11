'use client';

// Nút tim "Lưu tin" trên thẻ tin (config.card.bookmark — khớp BookmarkButton trên ListingCard của app). Dùng hook chung
// @hp/core/react (DataProvider của khu người dùng): useBookmarkedListingIds — MỘT query cho mọi thẻ trên trang (không đọc
// danh sách đã lưu theo từng thẻ) — và useToggleBookmark (tô tim ngay, lỗi tự trả lại). Khách → LoginDialog (intent "save":
// sau đăng nhập trang tải lại, thẻ khớp intent tự lưu tiếp). Tin của chính mình → không có nút. Nút là anh em của link thẻ
// (không lồng trong <a>), vùng chạm 44px, aria-pressed + nhãn đổi theo trạng thái (không chỉ bằng màu).
import { useBookmarkedListingIds, useSession, useToggleBookmark } from '@hp/core/react';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { takeLoginIntent } from '@/components/shared/login-intent';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { cn } from '@/lib/utils';

export function ListingCardBookmark({
  listingId,
  ownerId,
  overlay,
  className,
}: {
  listingId: string;
  ownerId: string;
  /** Nút nổi trên ảnh bìa (layout grid): nền surface/90 mờ nền để đọc rõ trên mọi ảnh. */
  overlay: boolean;
  className?: string;
}) {
  const t = useTranslations('listing.bookmark');
  const errorText = useErrorText();
  const toast = useToast();
  const session = useSession();
  const userId = session.isLoading ? undefined : session.userId;
  const ids = useBookmarkedListingIds({ enabled: !!userId });
  const toggle = useToggleBookmark();
  const saved = !!userId && !!ids.data?.has(listingId);

  const run = (next: boolean) =>
    toggle.mutate(
      { listingId, next },
      {
        onSuccess: () => toast.show(next ? t('saved') : t('removed')),
        onError: (e) => toast.show(errorText(e.code), 'error'),
      },
    );
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  // Vừa đăng nhập từ nút tim của thẻ này (intent) → lưu luôn khi đã biết danh sách đã lưu.
  const ready = !!userId && ids.isSuccess;
  useEffect(() => {
    if (!ready) return;
    if (takeLoginIntent('save', listingId) && !saved) runRef.current(true);
  }, [ready, listingId, saved]);

  if (userId && userId === ownerId) return null;

  const label = saved ? t('unsave') : t('save');
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={userId ? saved : undefined}
      title={label}
      disabled={userId === undefined}
      onClick={userId ? () => run(!saved) : undefined}
      className={cn(
        'rounded-full',
        overlay ? 'bg-surface/90 shadow-card backdrop-blur-sm hover:bg-surface' : 'bg-surface',
        className,
      )}
    >
      <Heart
        strokeWidth={1.75}
        className={cn(saved && 'fill-current text-danger animate-in zoom-in-75 duration-200 motion-reduce:animate-none')}
      />
    </Button>
  );

  return userId === null ? <LoginDialog trigger={button} intent={{ action: 'save', target: listingId }} /> : button;
}

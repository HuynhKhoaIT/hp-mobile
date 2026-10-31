'use client';

// Nút tim "Lưu tin" ở trang chi tiết. Khách → LoginDialog (intent "save": sau đăng nhập tự lưu tiếp). Đã đăng nhập:
// trạng thái đọc ở trình duyệt (listBookmarks — dữ liệu riêng, trang công khai được cache nên không đọc ở server),
// bấm → useOptimistic đổi ngay → setBookmarkAction → toast bookmark.saved / removed; lỗi tự quay lại + toast lỗi.
import { listBookmarks } from '@hp/core';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { takeLoginIntent } from '@/components/shared/login-intent';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { useSessionUser } from '@/features/auth/components/use-session-user';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { setBookmarkAction } from '../actions';

export function BookmarkButton({ listingId }: { listingId: string }) {
  const t = useTranslations('listing.bookmark');
  const errorText = useErrorText();
  const toast = useToast();
  const userId = useSessionUser();
  const [saved, setSaved] = useState(false);
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(saved);
  const [pending, startTransition] = useTransition();

  const toggle = useCallback(
    (next: boolean) => {
      startTransition(async () => {
        setOptimisticSaved(next);
        const res = await setBookmarkAction({ listingId, next });
        if (!res.ok) {
          toast.show(errorText(res.code), 'error');
          return;
        }
        setSaved(next);
        toast.show(next ? t('saved') : t('removed'));
      });
    },
    [listingId, setOptimisticSaved, t, toast, errorText],
  );

  // Effect đọc trạng thái chỉ phụ thuộc người dùng + tin; hàm toggle mới nhất lấy qua ref.
  const toggleRef = useRef(toggle);
  useEffect(() => {
    toggleRef.current = toggle;
  }, [toggle]);

  // Đã đăng nhập: đọc trạng thái lưu; vừa đăng nhập từ nút này (intent) → lưu luôn.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void listBookmarks(createBrowserClient(), 'listing').then((res) => {
      if (!active) return;
      const isSaved = res.data?.some((b) => b.target_id === listingId) ?? false;
      setSaved(isSaved);
      if (takeLoginIntent('save', listingId) && !isSaved) toggleRef.current(true);
    });
    return () => {
      active = false;
    };
  }, [userId, listingId]);

  const label = optimisticSaved ? t('unsave') : t('save');
  const button = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      aria-pressed={userId ? optimisticSaved : undefined}
      title={label}
      disabled={userId === undefined || pending}
      onClick={userId ? () => toggle(!optimisticSaved) : undefined}
    >
      <Heart
        strokeWidth={1.75}
        className={cn(
          optimisticSaved && 'fill-current text-danger animate-in zoom-in-75 duration-200 motion-reduce:animate-none',
        )}
      />
    </Button>
  );

  return userId === null ? <LoginDialog trigger={button} intent={{ action: 'save', target: listingId }} /> : button;
}

'use client';

// Hành động trang chi tiết: Nhắn tin (chính) + Chia sẻ. Ghi lượt xem khi người xem đã đăng nhập.
// - Nhắn tin: khách → LoginDialog tại chỗ; đã đăng nhập → báo "sắp có" (chat ở tuần 5–6).
// - Chia sẻ: Web Share API (điện thoại); không có → sao chép link web (shareUrl của @hp/core) + báo "Đã sao chép".
// Không có nút báo cáo ở tuần 3.
import { recordListingView, shareUrl } from '@hp/core';
import { APP_NAME } from '@hp/shared';
import { MessageCircle, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { Button } from '@/components/ui/button';
import { useSessionUser } from '@/features/auth/components/use-session-user';
import { publicEnv } from '@/lib/env';
import { createBrowserClient } from '@/lib/supabase/client';

export function ListingActions({ listingId, slug, title }: { listingId: string; slug: string; title: string }) {
  const t = useTranslations();
  const userId = useSessionUser();
  const [note, setNote] = useState<string | null>(null);

  // Đếm lượt xem: một lần mỗi lần mở trang, chỉ khi đã đăng nhập (hàm core tự bỏ qua khách). Lỗi không ảnh hưởng trang.
  useEffect(() => {
    if (!userId) return;
    void recordListingView(createBrowserClient(), listingId);
  }, [userId, listingId]);

  const share = async () => {
    const url = shareUrl({ type: 'listing', slug }, publicEnv.siteUrl);
    const text = t('listing.detail.share_text', { title, app: APP_NAME });
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        // Người dùng huỷ chia sẻ: không làm gì.
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote(t('listing.detail.link_copied'));
    } catch {
      setNote(t('errors.unknown'));
    }
  };

  const contactButton = (
    <Button type="button" size="lg" className="flex-1" onClick={userId ? () => setNote(t('listing.detail.contact_soon')) : undefined}>
      <MessageCircle strokeWidth={1.75} aria-hidden />
      {t('listing.detail.contact')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {userId === null ? <LoginDialog trigger={contactButton} /> : contactButton}
        <Button type="button" variant="outline" size="lg" onClick={() => void share()}>
          <Share2 strokeWidth={1.75} aria-hidden />
          {t('listing.detail.share')}
        </Button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted">
        {note}
      </p>
    </div>
  );
}

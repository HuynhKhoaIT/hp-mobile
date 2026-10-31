'use client';

// Hành động trang chi tiết (cột phải, dính khi cuộn). Ghi lượt xem khi người xem đã đăng nhập.
// - Chủ tin xem tin của mình → "Sửa tin" + "Tin của tôi" (không liên hệ chính mình). Chỉ là UI: RLS mới quyết định quyền.
// - Tin đang đăng: "Hiện số điện thoại" (ContactReveal) + Nhắn tin (khách → LoginDialog; chat ở tuần 6 → "sắp có").
// - Tin đã bán / đóng / hết hạn: ẩn liên hệ, chỉ còn Chia sẻ (banner trạng thái ở trang).
// - Chia sẻ: Web Share API (điện thoại); không có → sao chép link web (shareUrl của @hp/core) + toast "Đã sao chép".
import { recordListingView, shareUrl } from '@hp/core';
import { APP_NAME } from '@hp/shared';
import { MessageCircle, Pencil, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { useSessionUser } from '@/features/auth/components/use-session-user';
import { Link } from '@/i18n/navigation';
import { publicEnv } from '@/lib/env';
import { createBrowserClient } from '@/lib/supabase/client';
import { ContactReveal } from './contact-reveal';

export function ListingActions({
  listingId,
  slug,
  title,
  ownerId,
  active,
}: {
  listingId: string;
  slug: string;
  title: string;
  ownerId: string;
  /** listingDisplayStatus === 'active' (còn liên hệ được). */
  active: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const userId = useSessionUser();
  const isOwner = !!userId && userId === ownerId;

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
      toast.show(t('listing.detail.link_copied'));
    } catch {
      toast.show(t('errors.unknown'), 'error');
    }
  };

  const shareButton = (
    <Button type="button" variant="outline" size="lg" onClick={() => void share()}>
      <Share2 strokeWidth={1.75} aria-hidden />
      {t('listing.detail.share')}
    </Button>
  );

  if (isOwner) {
    return (
      <div className="flex flex-col gap-2">
        <p className="rounded-md bg-primary-light p-3 text-md text-primary">{t('web.listing.owner_note')}</p>
        <Button asChild size="lg">
          <Link href={`/toi/tin-cua-toi/${listingId}/sua`}>
            <Pencil strokeWidth={1.75} aria-hidden />
            {t('listing.manage.edit')}
          </Link>
        </Button>
        <div className="flex gap-2 *:flex-1">
          <Button asChild variant="outline" size="lg">
            <Link href="/toi/tin-cua-toi">{t('listing.manage.title')}</Link>
          </Button>
          {shareButton}
        </div>
      </div>
    );
  }

  if (!active) return <div className="flex flex-col gap-2">{shareButton}</div>;

  const messageButton = (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="flex-1"
      onClick={userId ? () => toast.show(t('listing.detail.contact_soon')) : undefined}
    >
      <MessageCircle strokeWidth={1.75} aria-hidden />
      {t('listing.detail.contact')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3">
      <ContactReveal listingId={listingId} userId={userId} />
      <div className="flex gap-2">
        {userId === null ? <LoginDialog trigger={messageButton} /> : messageButton}
        {shareButton}
      </div>
    </div>
  );
}

'use client';

// Hành động trang chi tiết (cột phải, dính khi cuộn). Ghi lượt xem khi người xem đã đăng nhập.
// - Chủ tin xem tin của mình → "Sửa tin" + "Tin của tôi" (không liên hệ chính mình). Chỉ là UI: RLS mới quyết định quyền.
// - Tin đang đăng (khớp ContactBar của app, style Stitch "Chi tiết việc làm"): 2 nút vuông chỉ icon 48×48 — Gọi (Hiện số →
//   Gọi, PhoneAction + useContactReveal) và Nhắn tin (mở hội thoại → /tin-nhan/[id]) — rồi nút chính rộng theo `primaryCta`
//   (config tính năng: 'call' trọ / đồ thất lạc, 'chat' pass / việc), nhãn theo tính năng (listing.contact.primary.<cta>_<feature>).
//   Khách bấm → LoginDialog (intent reveal / chat: sau đăng nhập làm tiếp). Đã hiện số mà không có SĐT → nút chính thành
//   Nhắn tin + contact.no_phone; nút chính là Nhắn tin mà đã hiện số → dòng "Số điện thoại: …".
//   Dưới 1024px hàng nút là thanh dính đáy (ngay trên thanh điều hướng dưới của điện thoại, nền surface/95 + shadow-bar); từ
//   1024px nằm trong cột phải dính + dòng gợi ý contact.hint.
// - Tin đã bán / đóng / hết hạn: ẩn liên hệ, chỉ còn Chia sẻ (banner trạng thái ở trang).
// - Người xem không phải chủ tin: "Báo cáo tin" (ReportButton; khách → LoginDialog).
// - Chia sẻ: useShareListing (Web Share API trên điện thoại; không có → sao chép link web + toast "Đã sao chép").
import { recordListingView } from '@hp/core';
import { featureOfCategory, formatVnPhone, type ListingCategory } from '@hp/shared';
import { MessageCircle, Pencil, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { takeLoginIntent } from '@/components/shared/login-intent';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { useSessionUser } from '@/features/auth/components/use-session-user';
import { useOpenConversation } from '@/features/chat/use-chat';
import { ReportButton } from '@/features/report/components/report-button';
import { Link } from '@/i18n/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { useShareListing } from '../use-share-listing';
import { PhoneAction, useContactReveal } from './contact-reveal';

export function ListingActions({
  listingId,
  slug,
  title,
  ownerId,
  category,
  active,
  primaryCta = 'chat',
}: {
  listingId: string;
  slug: string;
  title: string;
  ownerId: string;
  /** Category của tin — nhãn nút chính theo tính năng. */
  category: ListingCategory;
  /** listingDisplayStatus === 'active' (còn liên hệ được). */
  active: boolean;
  /** Nút liên hệ chính (config.primaryCta). */
  primaryCta?: 'chat' | 'call';
}) {
  const t = useTranslations();
  const userId = useSessionUser();
  const isOwner = !!userId && userId === ownerId;

  // Đếm lượt xem: một lần mỗi lần mở trang, chỉ khi đã đăng nhập (hàm core tự bỏ qua khách). Lỗi không ảnh hưởng trang.
  useEffect(() => {
    if (!userId) return;
    void recordListingView(createBrowserClient(), listingId);
  }, [userId, listingId]);

  const shareListing = useShareListing();
  const share = () => shareListing({ slug, title });

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

  const reportButton = <ReportButton target="listing" targetId={listingId} label={t('listing.detail.report')} userId={userId} />;

  if (!active) {
    return (
      <div className="flex flex-col gap-2">
        {shareButton}
        {reportButton}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ContactBar listingId={listingId} userId={userId} category={category} primaryCta={primaryCta} />
      <div className="flex gap-2 *:flex-1">
        {shareButton}
        {reportButton}
      </div>
    </div>
  );
}

/** Thanh liên hệ: [Gọi] [Nhắn tin] [nút chính rộng]. Một trạng thái hiện số + một lần mở hội thoại cho cả ba nút. */
function ContactBar({
  listingId,
  userId,
  category,
  primaryCta,
}: {
  listingId: string;
  userId: string | null | undefined;
  category: ListingCategory;
  primaryCta: 'chat' | 'call';
}) {
  const t = useTranslations();
  const errorText = useErrorText();
  const phone = useContactReveal(listingId, userId);
  const chat = useOpenConversation();
  const { open } = chat;
  const feature = featureOfCategory(category);
  const noPhone = !!phone.revealed && !phone.revealed.phone;
  const cta = primaryCta === 'call' && noPhone ? 'chat' : primaryCta;
  const shown = phone.revealed?.phone ? formatVnPhone(phone.revealed.phone) : null;

  // Vừa đăng nhập từ nút Nhắn tin → mở hội thoại luôn (chạy sau commit).
  useEffect(() => {
    if (!userId || !takeLoginIntent('chat', listingId)) return;
    const id = setTimeout(() => open(listingId), 0);
    return () => clearTimeout(id);
  }, [userId, listingId, open]);

  const chatButton = (square: boolean) => {
    const button = (
      <Button
        type="button"
        size={square ? 'icon' : 'lg'}
        variant={square ? 'secondary' : 'default'}
        className={square ? 'size-12 text-primary' : 'w-full whitespace-normal text-center'}
        aria-label={square ? t('listing.detail.contact') : undefined}
        title={square ? t('listing.detail.contact') : undefined}
        aria-busy={chat.isPending || undefined}
        disabled={userId === undefined || chat.isPending}
        onClick={userId ? () => open(listingId) : undefined}
      >
        <MessageCircle strokeWidth={1.75} aria-hidden />
        {square ? null : t(`listing.contact.primary.chat_${feature}`)}
      </Button>
    );
    return userId === null ? <LoginDialog trigger={button} intent={{ action: 'chat', target: listingId }} /> : button;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="z-30 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-above-nav max-lg:border-t max-lg:border-border max-lg:bg-surface/95 max-lg:px-4 max-lg:py-3 max-lg:shadow-bar max-lg:backdrop-blur-md sm:max-lg:bottom-0 sm:max-lg:pb-safe">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center gap-2">
            <PhoneAction state={phone} listingId={listingId} userId={userId} square />
            {chatButton(true)}
            {/* Nút chính rộng bên phải (gần ngón cái), giống Stitch. */}
            <div className="min-w-0 flex-1">
              {cta === 'call' ? (
                <PhoneAction
                  state={phone}
                  listingId={listingId}
                  userId={userId}
                  label={t(`listing.contact.primary.call_${feature}`)}
                />
              ) : (
                chatButton(false)
              )}
            </div>
          </div>
          <div aria-live="polite" className="empty:hidden">
            {phone.error ? (
              <p role="alert" className="text-sm text-danger">
                {errorText(phone.error)}
              </p>
            ) : noPhone ? (
              <p className="text-sm text-muted">{t('listing.contact.no_phone')}</p>
            ) : shown && cta === 'chat' ? (
              <p className="text-md font-semibold text-fg">{t('listing.contact.phone_line', { phone: shown })}</p>
            ) : null}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted max-lg:hidden">{t('listing.contact.hint')}</p>
    </div>
  );
}

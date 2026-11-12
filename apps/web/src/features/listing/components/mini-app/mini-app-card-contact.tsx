'use client';

// Hai nút liên hệ trên thẻ lớn của trang chủ mini-app (MiniAppFeatureCard — Stitch room_home "Gọi" / "Nhắn tin"):
// - Gọi: dùng chung useContactReveal + PhoneAction của trang chi tiết (SĐT KHÔNG có trong HTML: chỉ lấy sau khi bấm, qua
//   reveal_contact — đăng nhập, giới hạn lượt, audit; khách → LoginDialog rồi tự hiện số).
// - Nhắn tin: mở / lấy lại hội thoại rồi vào khung chat TRONG mini-app (`threadBase`, vd /tro/tin-nhan/<id>); khách →
//   LoginDialog (intent chat: sau đăng nhập mở luôn).
// Tin của chính mình → không có nút. Nút nằm trên lớp phủ link của thẻ (relative z-10) nên bấm / Tab tới riêng được.
import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import { useEffect } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { takeLoginIntent } from '@/components/shared/login-intent';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { useSessionUser } from '@/features/auth/components/use-session-user';
import { useOpenConversation } from '@/features/chat/use-chat';
import { PhoneAction, useContactReveal } from '../contact-reveal';

export function MiniAppCardContact({
  listingId,
  ownerId,
  threadBase,
  callLabel,
  chatLabel,
}: {
  listingId: string;
  ownerId: string;
  /** Hộp thư của mini-app (paths.chat) — khung chat mở trong mini-app. */
  threadBase: string;
  callLabel: string;
  chatLabel: string;
}) {
  const t = useTranslations('listing.contact');
  const errorText = useErrorText();
  const userId = useSessionUser();
  const phone = useContactReveal(listingId, userId);
  const { open, isPending } = useOpenConversation(threadBase);

  // Vừa đăng nhập từ nút Nhắn tin → mở hội thoại luôn (chạy sau commit).
  useEffect(() => {
    if (!userId || !takeLoginIntent('chat', listingId)) return;
    const id = setTimeout(() => open(listingId), 0);
    return () => clearTimeout(id);
  }, [userId, listingId, open]);

  if (userId && userId === ownerId) return null;

  const chatButton = (
    <Button
      type="button"
      size="lg"
      variant="outline"
      className="w-full font-semibold text-primary"
      aria-busy={isPending || undefined}
      disabled={userId === undefined || isPending}
      onClick={userId ? () => open(listingId) : undefined}
    >
      <MessageCircle strokeWidth={1.75} aria-hidden />
      {chatLabel}
    </Button>
  );

  return (
    <div className="relative z-10 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <PhoneAction state={phone} listingId={listingId} userId={userId} label={callLabel} />
        {userId === null ? <LoginDialog trigger={chatButton} intent={{ action: 'chat', target: listingId }} /> : chatButton}
      </div>
      <div aria-live="polite" className="empty:hidden">
        {phone.error ? (
          <p role="alert" className="text-sm text-danger">
            {errorText(phone.error)}
          </p>
        ) : phone.revealed && !phone.revealed.phone ? (
          <p className="text-sm text-muted">{t('no_phone')}</p>
        ) : null}
      </div>
    </div>
  );
}

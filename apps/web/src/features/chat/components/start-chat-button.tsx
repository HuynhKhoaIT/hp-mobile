'use client';

// CTA "Nhắn tin" ở chi tiết tin (người xem không phải chủ tin, tin đang đăng): mở (hoặc lấy lại) hội thoại với chủ tin qua
// useStartConversation rồi vào /tin-nhan/[id]. Khách → LoginDialog (intent "chat": sau đăng nhập tự mở hội thoại).
// Lỗi (cannot_chat_self, blocked, banned…) → toast errors.*.
import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { takeLoginIntent } from '@/components/shared/login-intent';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOpenConversation } from '../use-chat';

export function StartChatButton({
  listingId,
  userId,
  className,
}: {
  listingId: string;
  /** undefined = đang kiểm tra phiên, null = khách. */
  userId: string | null | undefined;
  className?: string;
}) {
  const t = useTranslations('chat.cta');
  const { open, isPending } = useOpenConversation();

  // Vừa đăng nhập từ nút này → mở hội thoại luôn (chạy sau commit).
  useEffect(() => {
    if (!userId || !takeLoginIntent('chat', listingId)) return;
    const id = setTimeout(() => open(listingId), 0);
    return () => clearTimeout(id);
  }, [userId, listingId, open]);

  const button = (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={cn('flex-1', className)}
      disabled={userId === undefined || isPending}
      aria-busy={isPending || undefined}
      onClick={userId ? () => open(listingId) : undefined}
    >
      <MessageCircle strokeWidth={1.75} aria-hidden />
      {t('chat')}
    </Button>
  );

  return userId === null ? <LoginDialog trigger={button} intent={{ action: 'chat', target: listingId }} /> : button;
}

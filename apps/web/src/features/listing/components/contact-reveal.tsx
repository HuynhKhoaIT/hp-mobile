'use client';

// "Hiện số điện thoại" → Gọi (trang chi tiết, tin đang đăng). SĐT KHÔNG có trong HTML công khai: chỉ lấy sau khi bấm, qua
// revealContactAction (RPC reveal_contact: đăng nhập, 20 lần / giờ, ghi audit). Khách → LoginDialog (intent "reveal":
// sau đăng nhập tự hiện số). Có số → link tel:+84…; không có → contact.no_phone (thanh liên hệ hiện); lỗi → errors.*.
// Style Stitch (thanh liên hệ ở listing-actions): `useContactReveal` giữ trạng thái chung cho nút vuông Gọi và nút chính rộng
// (config.primaryCta = 'call', trọ / đồ thất lạc) — một lần hiện số, hai nút cùng thấy. `PhoneAction` vẽ một trong hai dạng.
import { formatVnPhone } from '@hp/shared';
import { Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { takeLoginIntent } from '@/components/shared/login-intent';
import { Button } from '@/components/ui/button';
import { revealContactAction } from '../actions';

export type ContactRevealState = {
  /** null = chưa hiện; `phone` null = người đăng không có SĐT. */
  revealed: { phone: string | null } | null;
  /** Mã lỗi errors.* của lần hiện số gần nhất. */
  error: string | null;
  pending: boolean;
  reveal: () => void;
};

/** Trạng thái hiện số dùng chung cho các nút Gọi của một tin. Vừa đăng nhập từ nút Gọi → tự hiện số. */
export function useContactReveal(listingId: string, userId: string | null | undefined): ContactRevealState {
  const [revealed, setRevealed] = useState<{ phone: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reveal = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const res = await revealContactAction(listingId);
      if (!res.ok) {
        setError(res.code);
        return;
      }
      setRevealed(res.data);
    });
  }, [listingId]);

  // Chạy sau commit, không đặt state đồng bộ trong effect.
  useEffect(() => {
    if (!userId || !takeLoginIntent('reveal', listingId)) return;
    const id = setTimeout(reveal, 0);
    return () => clearTimeout(id);
  }, [userId, listingId, reveal]);

  return { revealed, error, pending, reveal };
}

/**
 * Nút Gọi. `square`: nút vuông chỉ icon 48×48 (nhãn chỉ ở aria-label); không thì nút chính rộng nền primary với `label`
 * (trước khi hiện số; đã hiện → "Gọi 0912 345 678"). Đã hiện mà không có số → nút tắt.
 */
export function PhoneAction({
  state,
  listingId,
  userId,
  square = false,
  label,
}: {
  state: ContactRevealState;
  listingId: string;
  userId: string | null | undefined;
  square?: boolean;
  /** Nhãn nút rộng trước khi hiện số (vd "Gọi hỏi phòng"). */
  label?: string;
}) {
  const t = useTranslations('listing.contact');
  const phone = state.revealed?.phone ?? null;
  const callText = phone ? t('call', { phone: formatVnPhone(phone) }) : null;
  const variant = square ? 'secondary' : 'default';
  const size = square ? 'icon' : 'lg';
  const className = square ? 'size-12 text-primary' : 'w-full whitespace-normal text-center';

  if (phone && callText) {
    return (
      <Button asChild size={size} variant={variant} className={className}>
        <a href={`tel:+${phone}`} aria-label={square ? callText : undefined}>
          <Phone strokeWidth={1.75} aria-hidden />
          {square ? null : callText}
        </a>
      </Button>
    );
  }

  const button = (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      aria-label={square ? t('reveal_call') : undefined}
      title={square ? t('reveal_call') : undefined}
      aria-busy={state.pending || undefined}
      disabled={userId === undefined || state.pending || !!state.revealed}
      onClick={userId ? state.reveal : undefined}
    >
      <Phone strokeWidth={1.75} aria-hidden />
      {square ? null : (label ?? t('reveal'))}
    </Button>
  );
  return userId === null ? <LoginDialog trigger={button} intent={{ action: 'reveal', target: listingId }} /> : button;
}

'use client';

// "Hiện số điện thoại" (trang chi tiết, tin đang đăng). SĐT KHÔNG có trong HTML công khai: chỉ lấy sau khi bấm, qua
// revealContactAction (RPC reveal_contact: đăng nhập, 20 lần / giờ, ghi audit). Khách → LoginDialog (intent "reveal":
// sau đăng nhập tự hiện số). Có số → nút "Gọi 0912 345 678" (tel:+84…); không có → contact.no_phone; lỗi → errors.*.
import { formatVnPhone } from '@hp/shared';
import { Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { LoginDialog } from '@/components/shared/login-dialog';
import { takeLoginIntent } from '@/components/shared/login-intent';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { revealContactAction } from '../actions';

export function ContactReveal({ listingId, userId }: { listingId: string; userId: string | null | undefined }) {
  const t = useTranslations('listing.contact');
  const errorText = useErrorText();
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

  // Vừa đăng nhập từ nút này → hiện số luôn (chạy sau commit, không đặt state đồng bộ trong effect).
  useEffect(() => {
    if (!userId || !takeLoginIntent('reveal', listingId)) return;
    const id = setTimeout(reveal, 0);
    return () => clearTimeout(id);
  }, [userId, listingId, reveal]);

  let control;
  if (revealed?.phone) {
    control = (
      <Button asChild size="lg" className="w-full">
        <a href={`tel:+${revealed.phone}`}>
          <Phone strokeWidth={1.75} aria-hidden />
          {t('call', { phone: formatVnPhone(revealed.phone) })}
        </a>
      </Button>
    );
  } else if (revealed) {
    control = <p className="rounded-md bg-surface-2 p-3 text-md text-fg">{t('no_phone')}</p>;
  } else {
    const button = (
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={userId === undefined || pending}
        onClick={userId ? reveal : undefined}
      >
        <Phone strokeWidth={1.75} aria-hidden />
        {t('reveal')}
      </Button>
    );
    control = userId === null ? <LoginDialog trigger={button} intent={{ action: 'reveal', target: listingId }} /> : button;
  }

  return (
    <div className="flex flex-col gap-2">
      <div aria-live="polite">{control}</div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {errorText(error)}
        </p>
      ) : null}
      <p className="text-sm text-muted">{t('hint')}</p>
    </div>
  );
}

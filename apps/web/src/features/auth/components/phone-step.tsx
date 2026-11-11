'use client';

// Bước 1: nhập số điện thoại → gửi OTP. Kèm nút Google (OAuth). Số được chuẩn hoá ở @hp/shared, giới hạn gửi do server.
// `brand` (trang /dang-nhap + LoginDialog, style Stitch "Đăng nhập gọn nhẹ", giống app): biểu tượng app + tên + câu giới
// thiệu ở đầu, tiêu đề bước nhỏ lại (text-lg). Khu /admin không bật brand. Không đăng nhập Zalo (không có).
import { sendPhoneOtp, signInWithGoogle } from '@hp/core';
import { APP_NAME } from '@hp/shared';
import { Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useId, useState } from 'react';
import { LogoMark } from '@/components/shared/logo-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBrowserClient } from '@/lib/supabase/client';
import { useErrorText } from './use-error-text';

export function PhoneStep({
  next,
  initialError,
  onSent,
  showGoogle = true,
  brand = false,
}: {
  next: string;
  initialError?: string | null;
  onSent: (phone: string) => void;
  /** Khu /admin chỉ đăng nhập bằng SĐT (rồi TOTP) — ẩn Google. */
  showGoogle?: boolean;
  /** Biểu tượng + tên app ở đầu (người dùng). */
  brand?: boolean;
}) {
  const t = useTranslations('auth.phone');
  const errorText = useErrorText();
  const id = useId();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await sendPhoneOtp(createBrowserClient(), { phone });
    setPending(false);
    if (result.error) setError(result.error.code);
    else onSent(result.data.phone);
  };

  const google = async () => {
    setPending(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const result = await signInWithGoogle(createBrowserClient(), { redirectTo });
    // Thành công: trình duyệt đã chuyển sang Google, không cần làm gì thêm.
    if (result.error) {
      setPending(false);
      setError(result.error.code);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {brand ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <LogoMark size="lg" />
          <div className="flex flex-col gap-1">
            <p className="text-xl font-bold text-primary">{APP_NAME}</p>
            <p className="text-sm text-muted">{t('tagline')}</p>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <h1 className={brand ? 'text-lg font-semibold text-fg' : 'text-2xl font-semibold text-fg'}>{t('title')}</h1>
        <p className={brand ? 'text-sm text-muted' : 'text-md text-muted'}>{t('subtitle')}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-phone`}>{t('label')}</Label>
          <div className="relative">
            <Phone aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" />
            <Input
              id={`${id}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={t('placeholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className="pl-10"
              required
            />
          </div>
          {error ? (
            <p id={`${id}-error`} role="alert" className="text-sm text-danger">
              {errorText(error)}
            </p>
          ) : null}
        </div>
        <Button type="submit" size="lg" disabled={pending || phone.trim().length === 0}>
          {t('submit')}
        </Button>
      </form>
      {showGoogle ? (
        <>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="h-px flex-1 bg-border" />
            {t('or')}
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" size="lg" onClick={google} disabled={pending}>
            {t('google')}
          </Button>
        </>
      ) : null}
    </div>
  );
}

'use client';

// Bước 2: nhập mã 6 số (style Stitch "Nhập mã OTP", giống app `(auth)/otp.tsx`): ô khoá → tiêu đề → "Mã 6 số đã gửi qua
// tin nhắn tới" + viên số điện thoại có nút Đổi số → hàng ô mã (OtpInput, tự điền one-time-code) → đếm ngược gửi lại
// (OTP_RESEND_SECONDS, server vẫn giới hạn) → nút Xác nhận → nhắc không chia sẻ mã. Thành công → báo lên để kiểm tra
// onboarding. Dùng chung cho /admin/login. Không gửi qua Zalo / gọi thoại (không có).
import { sendPhoneOtp, verifyPhoneOtp } from '@hp/core';
import { formatVnPhone, OTP_LENGTH, OTP_RESEND_SECONDS } from '@hp/shared';
import { Clock, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import { AuthHero } from './auth-hero';
import { OtpInput } from './otp-input';
import { useErrorText } from './use-error-text';

export function OtpStep({
  phone,
  onVerified,
  onChangePhone,
}: {
  /** Số đã chuẩn hoá `84…`. */
  phone: string;
  onVerified: () => void;
  onChangePhone: () => void;
}) {
  const t = useTranslations('auth.otp');
  const errorText = useErrorText();
  const id = useId();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [wait, setWait] = useState(OTP_RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await verifyPhoneOtp(createBrowserClient(), { phone, token });
    if (result.error) {
      setPending(false);
      setError(result.error.code);
      return;
    }
    onVerified();
  };

  const resend = async () => {
    setError(null);
    setWait(OTP_RESEND_SECONDS);
    const result = await sendPhoneOtp(createBrowserClient(), { phone });
    if (result.error) setError(result.error.code);
  };

  return (
    <div className="flex flex-col gap-6">
      <AuthHero variant="center" icon={LockKeyhole} title={t('title')} subtitle={t('sent_to')}>
        <p className="mt-1 inline-flex items-center gap-2 rounded-full border border-border bg-surface py-0.5 pr-1 pl-3">
          <Smartphone aria-hidden strokeWidth={1.75} className="size-4 text-primary" />
          <span className="text-md font-semibold text-fg">{formatVnPhone(phone)}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-primary"
            aria-label={t('change_phone')}
            onClick={onChangePhone}
          >
            {t('change')}
          </Button>
        </p>
      </AuthHero>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-otp`} className="sr-only">
            {t('label')}
          </label>
          <OtpInput
            id={`${id}-otp`}
            length={OTP_LENGTH}
            value={token}
            onValueChange={(digits) => {
              setToken(digits);
              if (error) setError(null);
            }}
            invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            autoFocus
          />
          {error ? (
            <p id={`${id}-error`} role="alert" className="text-center text-sm text-danger">
              {errorText(error)}
            </p>
          ) : null}
        </div>
        <div className="flex min-h-11 items-center justify-center gap-2 text-sm text-muted">
          {wait > 0 ? (
            <>
              <Clock aria-hidden strokeWidth={1.75} className="size-4" />
              {t('resend_in', { seconds: wait })}
            </>
          ) : (
            <Button type="button" variant="ghost" className="text-primary" onClick={resend}>
              {t('resend')}
            </Button>
          )}
        </div>
        <Button type="submit" size="lg" disabled={pending || token.length !== OTP_LENGTH}>
          {t('submit')}
        </Button>
      </form>
      <p className="flex items-center justify-center gap-2 text-center text-sm text-muted">
        <ShieldCheck aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-success" />
        {t('security_note')}
      </p>
    </div>
  );
}

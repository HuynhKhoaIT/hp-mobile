'use client';

// Bước 2: nhập mã 6 số. Gửi lại mã sau OTP_RESEND_SECONDS giây. Thành công → báo lên để kiểm tra onboarding.
import { sendPhoneOtp, verifyPhoneOtp } from '@hp/core';
import { formatVnPhone, OTP_LENGTH, OTP_RESEND_SECONDS } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBrowserClient } from '@/lib/supabase/client';
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
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg">{t('title')}</h1>
        <p className="text-md text-muted">{t('subtitle', { phone: formatVnPhone(phone) })}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-otp`}>{t('label')}</Label>
          <Input
            id={`${id}-otp`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
            className="text-center text-2xl tracking-widest"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            autoFocus
          />
          {error ? (
            <p id={`${id}-error`} role="alert" className="text-sm text-danger">
              {errorText(error)}
            </p>
          ) : null}
        </div>
        <Button type="submit" size="lg" disabled={pending || token.length !== OTP_LENGTH}>
          {t('submit')}
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="link" className="px-0" onClick={onChangePhone}>
          {t('change_phone')}
        </Button>
        <Button type="button" variant="ghost" onClick={resend} disabled={wait > 0}>
          {wait > 0 ? t('resend_in', { seconds: wait }) : t('resend')}
        </Button>
      </div>
    </div>
  );
}

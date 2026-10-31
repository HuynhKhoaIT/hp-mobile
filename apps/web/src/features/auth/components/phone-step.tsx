'use client';

// Bước 1: nhập số điện thoại → gửi OTP. Kèm nút Google (OAuth). Số được chuẩn hoá ở @hp/shared.
import { sendPhoneOtp, signInWithGoogle } from '@hp/core';
import { useTranslations } from 'next-intl';
import { type FormEvent, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBrowserClient } from '@/lib/supabase/client';
import { useErrorText } from './use-error-text';

export function PhoneStep({
  next,
  initialError,
  onSent,
}: {
  next: string;
  initialError?: string | null;
  onSent: (phone: string) => void;
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
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-fg">{t('title')}</h1>
        <p className="text-md text-muted">{t('subtitle')}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-phone`}>{t('label')}</Label>
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
            required
          />
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
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-border" />
        {t('or')}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" size="lg" onClick={google} disabled={pending}>
        {t('google')}
      </Button>
    </div>
  );
}

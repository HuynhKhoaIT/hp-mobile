'use client';

// Điều phối đăng nhập (trang /dang-nhap và LoginDialog): đã có phiên? → onboarding nếu cần → xong.
// Chưa có phiên: số điện thoại → OTP → (onboarding) → xong. Google quay về /auth/callback rồi lại vào đây.
// `next` là đường dẫn đầy đủ đã có tiền tố ngôn ngữ (do proxy.ts tạo) → điều hướng bằng location, không qua router next-intl.
import { getMyProfile, type MyProfile, needsOnboarding } from '@hp/core';
import type { Locale } from '@hp/shared';
import { useEffect, useState } from 'react';
import { TextLinesSkeleton } from '@/components/shared/skeletons';
import { safeNext, splitLocale, withLocale } from '@/i18n/paths';
import { createBrowserClient } from '@/lib/supabase/client';
import { OnboardingForm } from './onboarding-form';
import { OtpStep } from './otp-step';
import { PhoneStep } from './phone-step';

type Step = { kind: 'checking' } | { kind: 'phone' } | { kind: 'otp'; phone: string } | { kind: 'onboarding'; profile: MyProfile };

export function LoginFlow({
  next: rawNext,
  initialError,
  onDone,
}: {
  next: string;
  initialError?: string | null;
  /** Dialog: đóng + làm mới trang hiện tại. Bỏ trống: chuyển tới `next`. */
  onDone?: () => void;
}) {
  const next = safeNext(rawNext);
  const [step, setStep] = useState<Step>({ kind: 'checking' });

  const finish = (chosenLocale?: Locale) => {
    if (onDone && !chosenLocale) return onDone();
    const { locale, path } = splitLocale(next);
    window.location.assign(withLocale(path, chosenLocale ?? locale));
  };

  /** Sau khi có phiên: cần onboarding thì hiện form, không thì xong. */
  const afterSignIn = async () => {
    const profile = await getMyProfile(createBrowserClient());
    if (profile.error) return setStep({ kind: 'phone' });
    if (needsOnboarding(profile.data)) setStep({ kind: 'onboarding', profile: profile.data });
    else finish();
  };

  useEffect(() => {
    let active = true;
    void createBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        if (data.session) void afterSignIn();
        else setStep({ kind: 'phone' });
      });
    return () => {
      active = false;
    };
    // Chỉ kiểm tra một lần khi mở.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  switch (step.kind) {
    case 'checking':
      return <TextLinesSkeleton lines={4} />;
    case 'phone':
      return <PhoneStep next={next} initialError={initialError} onSent={(phone) => setStep({ kind: 'otp', phone })} />;
    case 'otp':
      return <OtpStep phone={step.phone} onVerified={() => void afterSignIn()} onChangePhone={() => setStep({ kind: 'phone' })} />;
    case 'onboarding':
      return (
        <OnboardingForm
          profile={step.profile}
          onDone={(locale) => finish(locale === splitLocale(next).locale ? undefined : locale)}
        />
      );
  }
}

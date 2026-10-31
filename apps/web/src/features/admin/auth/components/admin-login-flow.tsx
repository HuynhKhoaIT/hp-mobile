'use client';

// Đăng nhập admin bước 1: SĐT → OTP (dùng lại PhoneStep / OtpStep của khu người dùng, ẩn Google).
// Sau khi có phiên: đọc vai trò từ JWT (getSessionInfo) —
//   - không phải staff → đăng xuất ngay + báo admin.login.not_staff (không để phiên thường "kẹt" ở khu admin);
//   - staff → sang /admin/login/mfa (giữ `next`).
// Vào trang khi ĐÃ có phiên thường (từ trang người dùng): không tự đăng xuất, hiện thông báo + nút đổi tài khoản.
// Quyền thật vẫn do proxy.ts / requireStaff / RLS quyết định; ở đây chỉ để dẫn đường.
import { getSessionInfo, signOut } from '@hp/core';
import { ShieldAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { TextLinesSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { OtpStep } from '@/features/auth/components/otp-step';
import { PhoneStep } from '@/features/auth/components/phone-step';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import { withLocale } from '@/i18n/paths';
import { createBrowserClient } from '@/lib/supabase/client';

type Step = { kind: 'checking' } | { kind: 'phone'; notStaff: boolean } | { kind: 'otp'; phone: string } | { kind: 'signed_in_user' };

function NotStaffAlert() {
  const t = useTranslations('admin.login');
  return (
    <p role="alert" className="flex items-start gap-3 rounded-md bg-danger/10 p-3 text-md text-fg">
      <ShieldAlert strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
      {t('not_staff')}
    </p>
  );
}

export function AdminLoginFlow({ next }: { next: string | null }) {
  const t = useTranslations('admin.login');
  const locale = asLocale(useLocale());
  const [step, setStep] = useState<Step>({ kind: 'checking' });
  const started = useRef(false);

  const goMfa = () => {
    // Tải lại cả trang: proxy.ts đọc cookie phiên mới.
    const target = withLocale('/admin/login/mfa', locale) + (next ? `?next=${encodeURIComponent(next)}` : '');
    window.location.assign(target);
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void getSessionInfo(createBrowserClient()).then((res) => {
      const info = res.data;
      if (!info) setStep({ kind: 'phone', notStaff: false });
      else if (info.role === 'user') setStep({ kind: 'signed_in_user' });
      else goMfa();
    });
    // Chỉ kiểm một lần khi mở trang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const afterOtp = async () => {
    const client = createBrowserClient();
    const res = await getSessionInfo(client);
    if (res.data && res.data.role !== 'user') return goMfa();
    await signOut(client);
    setStep({ kind: 'phone', notStaff: true });
  };

  switch (step.kind) {
    case 'checking':
      return <TextLinesSkeleton lines={5} />;
    case 'signed_in_user':
      return (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-fg">{t('title')}</h1>
          <NotStaffAlert />
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              onClick={async () => {
                await signOut(createBrowserClient());
                setStep({ kind: 'phone', notStaff: false });
              }}
            >
              {t('use_other')}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/">{t('back_home')}</Link>
            </Button>
          </div>
        </div>
      );
    case 'phone':
      return (
        <div className="flex flex-col gap-6">
          {step.notStaff ? <NotStaffAlert /> : null}
          <PhoneStep next={next ?? '/admin'} showGoogle={false} onSent={(phone) => setStep({ kind: 'otp', phone })} />
          <p className="rounded-md bg-surface-2 p-3 text-sm text-muted">{t('subtitle')}</p>
        </div>
      );
    case 'otp':
      return (
        <OtpStep
          phone={step.phone}
          onVerified={() => void afterOtp()}
          onChangePhone={() => setStep({ kind: 'phone', notStaff: false })}
        />
      );
  }
}

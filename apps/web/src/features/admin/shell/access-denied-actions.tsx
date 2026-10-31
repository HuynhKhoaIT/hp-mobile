'use client';

// Nút cho trang "Không có quyền": đăng xuất rồi đăng nhập bằng tài khoản staff khác, hoặc về trang chủ.
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { asLocale } from '@/features/listing/display';
import { signOutToAdminLogin } from '../auth/sign-out';

export function AccessDeniedActions() {
  const t = useTranslations('admin');
  const locale = asLocale(useLocale());
  const [pending, setPending] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        disabled={pending}
        onClick={() => {
          setPending(true);
          void signOutToAdminLogin(locale);
        }}
      >
        {t('access.sign_in_again')}
      </Button>
      <Button asChild variant="outline">
        <Link href="/">{t('login.back_home')}</Link>
      </Button>
    </div>
  );
}

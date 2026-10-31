'use client';

// Nút "Đăng nhập" trên header của khách — mở LoginDialog, không rời trang.
import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { LoginDialog } from './login-dialog';

export function LoginButton() {
  const t = useTranslations('auth');
  return (
    <LoginDialog
      trigger={
        <Button variant="outline">
          <LogIn strokeWidth={1.75} aria-hidden />
          {t('sign_in')}
        </Button>
      }
    />
  );
}

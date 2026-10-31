'use client';

// Đăng xuất trên trình duyệt này rồi về trang chủ (tải lại để xoá dữ liệu theo phiên cũ).
import { signOut } from '@hp/core';
import { LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@hp/shared';
import { withLocale } from '@/i18n/paths';
import { createBrowserClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const t = useTranslations('auth');
  const locale = useLocale() as Locale;
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await signOut(createBrowserClient());
        window.location.assign(withLocale('/', locale));
      }}
    >
      <LogOut strokeWidth={1.75} aria-hidden />
      {t('sign_out')}
    </Button>
  );
}

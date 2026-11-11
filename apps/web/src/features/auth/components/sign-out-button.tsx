'use client';

// Đăng xuất trên trình duyệt này rồi về trang chủ (tải lại để xoá dữ liệu theo phiên cũ).
// SignOutButton: nút viền. SignOutRow: dòng cuối card "Cài đặt & hỗ trợ" ở /toi (ô icon danger/10, chữ danger đậm).
import { signOut } from '@hp/core';
import { ChevronRight, LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@hp/shared';
import { withLocale } from '@/i18n/paths';
import { createBrowserClient } from '@/lib/supabase/client';

function useSignOut() {
  const locale = useLocale() as Locale;
  const [pending, setPending] = useState(false);
  const run = async () => {
    setPending(true);
    await signOut(createBrowserClient());
    window.location.assign(withLocale('/', locale));
  };
  return { pending, run };
}

export function SignOutButton() {
  const t = useTranslations('auth');
  const { pending, run } = useSignOut();
  return (
    <Button variant="outline" disabled={pending} onClick={() => void run()}>
      <LogOut strokeWidth={1.75} aria-hidden />
      {t('sign_out')}
    </Button>
  );
}

export function SignOutRow() {
  const t = useTranslations('auth');
  const { pending, run } = useSignOut();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void run()}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors hover:bg-danger/5 focus-visible:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:opacity-60"
    >
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-md bg-danger/10 text-danger">
        <LogOut strokeWidth={1.75} className="size-5" />
      </span>
      <span className="flex-1 text-md font-semibold text-danger">{t('sign_out')}</span>
      <ChevronRight aria-hidden strokeWidth={1.75} className="size-5 text-danger" />
    </button>
  );
}

'use client';
// Hỏi đồng ý cookie thống kê (Nghị định 13/2023). Chỉ hiện khi có PostHog key — không có thì web không đặt cookie thống kê,
// không cần hỏi. Không hiện ở /admin. "Cài đặt cookie" ở footer mở lại qua sự kiện `hp:cookie-settings`.
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { analyticsEnabled, captureUtm, readConsent, resumeAnalytics, writeConsent } from '@/lib/analytics';

const COOKIE_SETTINGS_EVENT = 'hp:cookie-settings';

export function CookieConsent() {
  const t = useTranslations('web.cookie');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    captureUtm();
    if (!analyticsEnabled()) return;
    resumeAnalytics();
    const reopen = () => setOpen(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen);
    if (readConsent() === null) reopen();
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  if (!open || pathname.startsWith('/admin')) return null;

  const choose = (value: 'granted' | 'denied') => {
    writeConsent(value);
    setOpen(false);
  };

  return (
    <section
      aria-label={t('title')}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-4 shadow-card sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md sm:rounded-lg sm:border"
    >
      <h2 className="text-md font-semibold text-fg">{t('title')}</h2>
      <p className="mt-1 text-sm text-muted">
        {t('body')}{' '}
        <Link href="/chinh-sach-bao-mat" className="text-primary underline">
          {t('policy')}
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => choose('granted')}>{t('accept')}</Button>
        <Button variant="outline" onClick={() => choose('denied')}>
          {t('decline')}
        </Button>
      </div>
    </section>
  );
}

/** Nút ở footer để đổi lựa chọn. Ẩn khi web không dùng cookie thống kê. */
export function CookieSettingsButton() {
  const t = useTranslations('web.cookie');
  if (!analyticsEnabled()) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
      className="inline-flex min-h-11 items-center text-sm text-muted hover:text-fg"
    >
      {t('settings')}
    </button>
  );
}

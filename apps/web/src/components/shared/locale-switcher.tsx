'use client';

// Đổi ngôn ngữ, giữ nguyên trang đang xem. Tên ngôn ngữ viết bằng chính ngôn ngữ đó (Tiếng Việt / English / 中文).
import type { Locale } from '@hp/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('web');
  const tCommon = useTranslations('common');
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const change = (locale: Locale) =>
    startTransition(() => {
      router.replace(pathname, { locale });
    });

  return (
    <div role="group" aria-label={t('header.language')} className="flex items-center gap-1">
      {routing.locales.map((locale) => (
        <Button
          key={locale}
          type="button"
          variant="ghost"
          size="sm"
          lang={locale}
          aria-pressed={current === locale}
          disabled={pending}
          className={current === locale ? 'bg-primary-light text-primary' : 'text-muted'}
          onClick={() => change(locale)}
        >
          {tCommon(`locale.${locale}`)}
        </Button>
      ))}
    </div>
  );
}

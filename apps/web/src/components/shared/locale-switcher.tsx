'use client';

// Đổi ngôn ngữ, giữ nguyên trang đang xem. Tên ngôn ngữ viết bằng chính ngôn ngữ đó (Tiếng Việt / English / 中文).
// variant 'pill' (mặc định): nút ghost, ngôn ngữ đang chọn nền primary-light. variant 'inline' (footer điện thoại, style
// Stitch): hàng chữ ngăn bởi dấu "·", ngôn ngữ đang chọn primary đậm gạch chân; vùng chạm vẫn 44.
import type { Locale } from '@hp/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Fragment, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export function LocaleSwitcher({ variant = 'pill', className }: { variant?: 'pill' | 'inline'; className?: string }) {
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

  if (variant === 'inline') {
    return (
      <div role="group" aria-label={t('header.language')} className={cn('flex items-center justify-center gap-1', className)}>
        {routing.locales.map((locale, i) => {
          const selected = current === locale;
          return (
            <Fragment key={locale}>
              {i > 0 ? (
                <span aria-hidden className="text-muted">
                  ·
                </span>
              ) : null}
              <button
                type="button"
                lang={locale}
                aria-pressed={selected}
                disabled={pending}
                onClick={() => change(locale)}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-sm px-2 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
                  selected ? 'font-bold text-primary underline underline-offset-4' : 'font-medium text-muted hover:text-fg',
                )}
              >
                {tCommon(`locale.${locale}`)}
              </button>
            </Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div role="group" aria-label={t('header.language')} className={cn('flex items-center gap-1', className)}>
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

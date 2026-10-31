'use client';

// Ô tìm kiếm của trang chủ trên điện thoại (docs/design/home.md §4.2, §10): cao 48, bo tròn, nền surface trên dải xanh;
// dính trên cùng khi cuộn qua header (sticky top-0, thanh xanh có bóng khi đang dính). Form GET /tim-kiem?q= — chạy cả khi
// tắt JS. Từ 640px ô tìm nằm ở AppHeader nên khối này ẩn.
import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function HubSearch() {
  const t = useTranslations('common.nav');
  const raw = useLocale();
  const locale = routing.locales.find((l) => l === raw) ?? routing.defaultLocale;
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setStuck(!!entry && !entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-0 sm:hidden" />
      <div
        data-stuck={stuck ? '' : undefined}
        className="sticky top-0 z-30 bg-primary px-4 pt-3 pb-3 transition-shadow duration-200 data-stuck:shadow-card sm:hidden"
      >
        <form action={getPathname({ href: '/tim-kiem', locale })} role="search">
          <label className="relative block">
            <span className="sr-only">{t('search')}</span>
            <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
            <input
              name="q"
              type="search"
              enterKeyHint="search"
              maxLength={100}
              placeholder={t('search_placeholder')}
              className={cn(
                'h-12 w-full rounded-full bg-surface pr-4 pl-12 text-md text-fg shadow-card outline-none placeholder:text-muted',
                'focus-visible:ring-3 focus-visible:ring-accent/60',
              )}
            />
          </label>
        </form>
      </div>
    </>
  );
}

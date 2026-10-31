'use client';

// Chip "📍 {khu} ▾" trên header trang chủ → hộp chọn khu (điện thoại: sheet đáy màn hình; desktop: hộp thoại giữa).
// Khu đã chọn quyết định dải "Gần {khu}" (§4.7). Chọn là áp dụng ngay + đóng hộp; lưu ở HomeProvider.
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useHome } from './home-context';

export function SitePicker({ className }: { className?: string }) {
  const t = useTranslations();
  const { sites, site, chooseSite } = useHome();
  const [open, setOpen] = useState(false);
  if (!site) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`${t('common.home.site_label')}: ${site.name}. ${t('common.home.site_change')}`}
          className={cn(
            // Chip cao 28 (py-1); vùng chạm mở rộng lên 44 bằng ::after (§6).
            'relative inline-flex max-w-full items-center gap-1 rounded-full bg-on-primary/15 px-3 py-1 text-sm font-medium text-on-primary outline-none transition-colors',
            'after:absolute after:inset-x-0 after:-inset-y-2 hover:bg-on-primary/25 focus-visible:ring-3 focus-visible:ring-on-primary/60',
            className,
          )}
        >
          <MapPin aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
          <span className="truncate">{site.name}</span>
          <ChevronDown aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent closeLabel={t('common.actions.close')}>
        <DialogHeader>
          <DialogTitle>{t('common.home.site_sheet_title')}</DialogTitle>
          <DialogDescription>{t('common.home.site_sheet_hint')}</DialogDescription>
        </DialogHeader>
        <ul role="radiogroup" aria-label={t('common.home.site_sheet_title')} className="flex flex-col gap-1">
          {sites.map((s) => {
            const selected = s.code === site.code;
            return (
              <li key={s.code}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    chooseSite(s.code);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-left text-md outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                    selected ? 'bg-primary-light font-semibold text-primary' : 'font-medium text-fg hover:bg-surface-2',
                  )}
                >
                  <MapPin aria-hidden strokeWidth={1.75} className={cn('size-5 shrink-0', selected ? 'text-primary' : 'text-muted')} />
                  <span className="flex-1 py-3">{s.name}</span>
                  {selected ? <Check aria-hidden strokeWidth={2} className="size-5 shrink-0" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

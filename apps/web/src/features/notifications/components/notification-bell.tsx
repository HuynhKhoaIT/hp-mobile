'use client';

// Chuông thông báo kèm số chưa đọc (docs/design/home.md §4.1, §10): > 9 → "9+", 0 / khách → không hiện số.
// Hai kiểu: `onPrimary` (header xanh của trang chủ trên điện thoại: nút tròn size-11 nền on-primary/15) và `ghost`
// (header chung). Số tăng khi quay lại tab → chuông lắc nhẹ một lần (tắt khi giảm chuyển động).
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { loadUnreadCount } from '../unread-count';

export function NotificationBell({ variant = 'ghost', className }: { variant?: 'ghost' | 'onPrimary'; className?: string }) {
  const t = useTranslations('common.home');
  const [count, setCount] = useState<number | null>(null);
  const [ring, setRing] = useState(0);
  const last = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const apply = (value: number | null) => {
      if (!active) return;
      if (value !== null && last.current !== null && value > last.current) setRing((r) => r + 1);
      last.current = value;
      setCount(value);
    };
    void loadUnreadCount().then(apply);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadUnreadCount(true).then(apply);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const label = count ? t('notifications_unread', { count }) : t('notifications');
  return (
    <Link
      href="/thong-bao"
      aria-label={label}
      className={cn(
        'relative inline-flex size-11 shrink-0 items-center justify-center outline-none transition-colors focus-visible:ring-3',
        variant === 'onPrimary'
          ? 'rounded-full bg-on-primary/15 text-on-primary hover:bg-on-primary/25 focus-visible:ring-on-primary/60'
          : 'rounded-md text-fg hover:bg-surface-2 focus-visible:ring-ring/50',
        className,
      )}
    >
      <Bell
        key={ring}
        aria-hidden
        strokeWidth={1.75}
        className={cn('size-6', ring > 0 && 'animate-in spin-in-12 duration-500 motion-reduce:animate-none')}
      />
      {count ? (
        <span
          aria-hidden
          className={cn(
            'absolute flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent ring-2',
            // Nút tròn của header xanh: lệch (-4, -4) khỏi góc nút (§10). Nút ghost: bám sát icon.
            variant === 'onPrimary' ? '-top-1 -right-1 ring-primary' : 'top-0.5 right-0.5 ring-surface',
          )}
        >
          {count > 9 ? '9+' : count}
        </span>
      ) : null}
    </Link>
  );
}

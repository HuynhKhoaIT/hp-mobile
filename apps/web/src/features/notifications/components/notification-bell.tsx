'use client';

// Chuông thông báo kèm số chưa đọc (docs/design/home.md §4.1, §10): > 9 → "9+", 0 / khách → không hiện số.
// Hai kiểu: `onPrimary` (header xanh của trang chủ trên điện thoại: nút tròn size-11 nền on-primary/15) và `ghost`
// (header chung). Số từ useUnreadNotificationCount (@hp/core/react, cùng key với /thong-bao): Realtime (DataProvider) và
// focus lại tab làm mới; đánh dấu đã đọc giảm số ngay. Số tăng → chuông lắc nhẹ một lần (tắt khi giảm chuyển động).
import { useUnreadNotificationCount } from '@hp/core/react';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function NotificationBell({ variant = 'ghost', className }: { variant?: 'ghost' | 'onPrimary'; className?: string }) {
  const t = useTranslations('common.home');
  const count = useUnreadNotificationCount().data ?? null;
  const [ring, setRing] = useState(0);
  // Số tăng so với lần trước (không tính lần tải đầu) → lắc chuông. Đặt state khi render theo mẫu "giá trị trước" của React.
  const [last, setLast] = useState<number | null>(count);
  if (count !== last) {
    if (count !== null && last !== null && count > last) setRing((r) => r + 1);
    setLast(count);
  }

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

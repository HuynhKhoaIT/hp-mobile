'use client';

// Khung thanh điều hướng dưới trên điện thoại (< 640px), chỉ phần hiển thị — dùng cho thanh 5 tab của super app (BottomNav)
// và thanh riêng của mini-app (Chợ Pass Đồ: Chợ Pass · Đã lưu · Đăng tin · Chat · Quản lý tin — MiniAppBottomNav).
// Style Stitch: nền surface/95 + mờ nền, viền trên hairline + shadow-bar, cao 64, chừa vùng an toàn dưới. Tab đang mở: primary,
// nét icon đậm hơn. Icon luôn kèm chữ. Nút Đăng (isPost): tròn 52 nền cam (accent) nổi lên trên thanh (-mt-6) + shadow-fab,
// icon trắng on-accent; vùng chạm là cả ô tab (≥ 64). Nút Đăng "thở" chậm khi chưa ở trang đăng (::before nằm sau nút: lớp
// accent + shadow-fab sáng dần + phóng ≤ 1.04, animate-fab-glow 2,8s/chu kỳ từ motion.ambient.glow của @hp/tokens — giống
// app TabBar); giảm chuyển động → tắt hẳn. Số (badge) > 9 → "9+", kèm câu đọc cho trình đọc màn hình (`badgeLabel`).
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type BottomNavItem = {
  key: string;
  href: ComponentProps<typeof Link>['href'];
  label: string;
  Icon: LucideIcon;
  active: boolean;
  isPost?: boolean;
  /** Số trên icon (0 = không hiện). */
  badge?: number;
  /** Câu đọc cho số (vd "2 cuộc trò chuyện chưa đọc"). */
  badgeLabel?: string;
};

export function BottomNavBar({ items, label }: { items: readonly BottomNavItem[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-safe shadow-bar backdrop-blur-md sm:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {items.map(({ key, href, label: text, Icon, active, isPost, badge, badgeLabel }) => (
          <li key={key} className="flex">
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
                active ? 'font-semibold text-primary' : 'font-medium text-muted hover:text-fg',
              )}
            >
              {isPost ? (
                <span
                  className={cn(
                    'relative -mt-6 flex size-13 items-center justify-center rounded-full bg-accent text-on-accent shadow-fab ring-4 ring-surface transition-transform duration-150',
                    'group-active:scale-95 motion-reduce:transition-none motion-reduce:group-active:scale-100',
                    // Quầng thở: thêm một lớp bóng cam phía sau nút; không nhận chạm.
                    !active &&
                      'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-accent before:opacity-0 before:shadow-fab motion-safe:before:animate-fab-glow',
                  )}
                >
                  <Icon strokeWidth={2.5} className="size-7" aria-hidden />
                </span>
              ) : (
                <span className="relative">
                  <Icon strokeWidth={active ? 2.25 : 1.75} className="size-6" aria-hidden />
                  {badge ? (
                    <span
                      aria-hidden
                      className="absolute -top-1.5 -right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent ring-2 ring-surface"
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  ) : null}
                </span>
              )}
              <span className={cn('max-w-full truncate leading-none', isPost && !active && 'text-fg')}>{text}</span>
              {badge && badgeLabel ? <span className="sr-only">{badgeLabel}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

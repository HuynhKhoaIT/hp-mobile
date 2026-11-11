'use client';

// Thanh điều hướng dưới trên điện thoại (< 640px) — giống 5 tab của app: Trang chủ, Khám phá, Đăng (giữa), Tin nhắn (kèm
// số hội thoại chưa đọc), Tôi. Icon luôn kèm chữ. Chừa vùng an toàn dưới (iPhone có thanh Home).
// Style Stitch: nền surface/95 + mờ nền, viền trên hairline + shadow-bar, cao 64. Tab đang mở: primary, nét icon đậm hơn.
// Nút Đăng: tròn 52 nền cam (accent) nổi lên trên thanh (-mt-6) + shadow-fab, icon Plus trắng on-accent;
// vùng chạm là cả ô tab (≥ 64). Nút Đăng "thở" chậm khi chưa ở trang đăng (::before nằm sau nút: lớp accent + shadow-fab
// sáng dần + phóng ≤ 1.04, animate-fab-glow 2,8s/chu kỳ từ motion.ambient.glow của @hp/tokens — giống app TabBar);
// giảm chuyển động → tắt hẳn.
import { useUnreadConversationCount } from '@hp/core/react';
import { Compass, Home, MessageCircle, Plus, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', key: 'home', Icon: Home },
  { href: '/tin', key: 'explore', Icon: Compass },
  { href: '/dang-tin', key: 'post', Icon: Plus },
  { href: '/tin-nhan', key: 'messages', Icon: MessageCircle },
  { href: '/toi', key: 'me', Icon: User },
] as const;

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export function BottomNav() {
  const t = useTranslations('common.nav');
  const tHeader = useTranslations('web.header');
  const pathname = usePathname();
  const unread = useUnreadConversationCount().data ?? 0;
  const tChat = useTranslations('chat.inbox');
  return (
    <nav
      aria-label={tHeader('main_nav')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-safe shadow-bar backdrop-blur-md sm:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {ITEMS.map(({ href, key, Icon }) => {
          const active = isActive(pathname, href);
          const isPost = key === 'post';
          const badge = key === 'messages' && unread > 0 ? unread : 0;
          return (
            <li key={key} className="flex">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
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
                <span className={cn('leading-none', isPost && !active && 'text-fg')}>{t(key)}</span>
                {badge ? <span className="sr-only">{tChat('unread', { count: badge })}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

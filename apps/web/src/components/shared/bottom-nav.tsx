'use client';

// Thanh điều hướng dưới trên điện thoại (< 640px) — giống 5 tab của app: Trang chủ, Khám phá, Đăng (giữa, cam),
// Tin nhắn (kèm số hội thoại chưa đọc), Tôi. Icon luôn kèm chữ. Chừa vùng an toàn dưới (iPhone có thanh Home).
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
    <nav aria-label={tHeader('main_nav')} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-safe sm:hidden">
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, key, Icon }) => {
          const active = isActive(pathname, href);
          const isPost = key === 'post';
          const badge = key === 'messages' && unread > 0 ? unread : 0;
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  active ? 'text-primary' : 'text-muted',
                )}
              >
                {isPost ? (
                  <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-card">
                    <Icon strokeWidth={2} className="size-6" aria-hidden />
                  </span>
                ) : (
                  <span className="relative">
                    <Icon strokeWidth={1.75} className="size-6" aria-hidden />
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
                <span className={isPost ? 'text-fg' : undefined}>{t(key)}</span>
                {badge ? <span className="sr-only">{tChat('unread', { count: badge })}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

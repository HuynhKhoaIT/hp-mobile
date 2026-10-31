'use client';

// Thanh điều hướng dưới trên điện thoại (< 640px) — giống 5 tab của app: Trang chủ, Khám phá, Đăng (giữa, cam),
// Tin nhắn, Tôi. Icon luôn kèm chữ. Chừa vùng an toàn dưới (iPhone có thanh Home).
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
  return (
    <nav aria-label={tHeader('main_nav')} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-safe sm:hidden">
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, key, Icon }) => {
          const active = isActive(pathname, href);
          const isPost = key === 'post';
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
                  <Icon strokeWidth={1.75} className="size-6" aria-hidden />
                )}
                <span className={isPost ? 'text-fg' : undefined}>{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

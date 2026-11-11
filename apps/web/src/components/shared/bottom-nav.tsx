'use client';

// Thanh điều hướng dưới trên điện thoại (< 640px) — giống 5 tab của app: Trang chủ, Khám phá, Đăng (giữa), Tin nhắn (kèm
// số hội thoại chưa đọc), Tôi. Khung hiển thị dùng chung: BottomNavBar (bottom-nav-bar.tsx).
// Trong mini-app (đường dẫn thuộc một tính năng có config.miniApp — Chợ Pass Đồ /pass-do/*): thay bằng thanh riêng của
// mini-app (MiniAppBottomNav: Chợ Pass · Đã lưu · Đăng tin · Chat · Quản lý tin), như mở một ứng dụng con trong super app.
// usePathname chạy cả khi render server → không nháy giữa hai thanh.
import { useUnreadConversationCount } from '@hp/core/react';
import { Compass, Home, MessageCircle, Plus, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MiniAppBottomNav } from '@/features/listing/components/mini-app/mini-app-nav';
import { miniAppConfigOf } from '@/features/listing/mini-app';
import { usePathname } from '@/i18n/navigation';
import { BottomNavBar } from './bottom-nav-bar';

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
  const pathname = usePathname();
  const miniApp = miniAppConfigOf(pathname);
  return miniApp ? <MiniAppBottomNav cfg={miniApp} /> : <SuperAppBottomNav pathname={pathname} />;
}

function SuperAppBottomNav({ pathname }: { pathname: string }) {
  const t = useTranslations('common.nav');
  const tHeader = useTranslations('web.header');
  const tChat = useTranslations('chat.inbox');
  const unread = useUnreadConversationCount().data ?? 0;
  return (
    <BottomNavBar
      label={tHeader('main_nav')}
      items={ITEMS.map(({ href, key, Icon }) => {
        const badge = key === 'messages' && unread > 0 ? unread : 0;
        return {
          key,
          href,
          label: t(key),
          Icon,
          active: isActive(pathname, href),
          isPost: key === 'post',
          badge,
          badgeLabel: badge ? tChat('unread', { count: badge }) : undefined,
        };
      })}
    />
  );
}

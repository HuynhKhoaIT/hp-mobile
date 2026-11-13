'use client';

// Điều hướng riêng của mini-app (Stitch pass_home / saved / manage: thanh dưới "Chợ Pass · Đã lưu · [ĐĂNG TIN] · Chat ·
// Quản lý tin"; Nhà Trọ: "Tìm trọ · …"). Màu theo config.miniApp.theme (data-app-theme — tab đang mở primary của mini-app,
// nút Đăng tin giữ cam accent). Một nguồn mục (useMiniAppItems) cho hai kiểu:
// - MiniAppBottomNav: điện thoại (< 640px), thay thanh 5 tab của super app (BottomNav tự chọn theo đường dẫn); nút Đăng tin
//   cam nổi giữa (BottomNavBar).
// - MiniAppTabStrip: từ 640px — dải tab dưới header mini-app (header chung của site vẫn giữ): viên thuốc, tab đang mở nền
//   primary-light chữ primary; "Đăng tin" là nút cam cuối dải.
// "Đăng tin" → trang đăng tin của mini-app (paths.post, vd /pass-do/dang-tin): form chỉ có danh mục của tính năng, đăng
// xong về "Quản lý tin" — không rời mini-app (khách → proxy.ts chuyển /dang-nhap rồi quay lại).
// Số trên tab Chat = số hội thoại CHƯA ĐỌC thuộc tính năng (conversationFeature) trong các trang hộp thư đã tải
// (useConversations — chỉ khi đã đăng nhập); hội thoại cũ ngoài trang đầu chưa tính (giống hộp thư lọc theo dịch vụ).
import { conversationFeature } from '@hp/core';
import { useConversations, useSession } from '@hp/core/react';
import type { ListingFeature } from '@hp/shared';
import { Heart, ListChecks, MessageCircle, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BottomNavBar, type BottomNavItem } from '@/components/shared/bottom-nav-bar';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { LISTING_FEATURE_CONFIGS } from '../../features';
import { isMiniApp, type MiniAppConfig, miniAppTabOf } from '../../mini-app';

function useFeatureUnread(cfg: MiniAppConfig): number {
  const session = useSession();
  const list = useConversations({ enabled: !!session.userId });
  if (!session.userId) return 0;
  return list.items.filter((c) => c.unread_count > 0 && conversationFeature(c) === cfg.feature).length;
}

function useMiniAppItems(cfg: MiniAppConfig): BottomNavItem[] {
  const t = useTranslations();
  const pathname = usePathname();
  const current = miniAppTabOf(cfg, pathname);
  const unread = useFeatureUnread(cfg);
  const { paths, homeTabKey, HomeIcon } = cfg.miniApp;
  return [
    { key: 'home', href: paths.home, label: t(homeTabKey), Icon: HomeIcon, active: current === 'home' },
    { key: 'saved', href: paths.saved, label: t('listing.mini_app.tabs.saved'), Icon: Heart, active: current === 'saved' },
    {
      key: 'post',
      href: paths.post,
      label: t('listing.mini_app.tabs.post'),
      Icon: Plus,
      active: current === 'post',
      isPost: true,
    },
    {
      key: 'chat',
      href: paths.chat,
      label: t('listing.mini_app.tabs.chat'),
      Icon: MessageCircle,
      active: current === 'chat',
      badge: unread,
      badgeLabel: unread ? t('chat.inbox.unread', { count: unread }) : undefined,
    },
    { key: 'manage', href: paths.manage, label: t('listing.mini_app.tabs.manage'), Icon: ListChecks, active: current === 'manage' },
  ];
}

export function MiniAppBottomNav({ cfg }: { cfg: MiniAppConfig }) {
  const t = useTranslations();
  const items = useMiniAppItems(cfg);
  // Thanh dưới nằm ở layout (ngoài khung trang) → tự gắn màu mini-app; nút Đăng vẫn cam (accent không bị ghi đè).
  return (
    <div data-app-theme={cfg.miniApp.theme} className="contents">
      <BottomNavBar items={items} label={t('listing.mini_app.tabs_a11y', { feature: t(cfg.miniApp.titleKey) })} />
    </div>
  );
}

/**
 * Dải tab desktop (từ 640px) ngay dưới header mini-app. Nhận `feature` (không nhận config — config có component icon, không
 * truyền được từ Server Component) rồi tự tra config.
 */
export function MiniAppTabStrip({ feature, className }: { feature: ListingFeature; className?: string }) {
  const cfg = LISTING_FEATURE_CONFIGS[feature];
  return isMiniApp(cfg) ? <TabStrip cfg={cfg} className={className} /> : null;
}

function TabStrip({ cfg, className }: { cfg: MiniAppConfig; className?: string }) {
  const t = useTranslations();
  const items = useMiniAppItems(cfg);
  const post = items.find((i) => i.isPost);
  return (
    <nav
      aria-label={t('listing.mini_app.tabs_a11y', { feature: t(cfg.miniApp.titleKey) })}
      className={cn('hidden items-center gap-2 rounded-lg border border-border bg-surface p-1.5 shadow-card sm:flex', className)}
    >
      <ul className="flex min-w-0 flex-1 flex-wrap gap-1">
        {items
          .filter((i) => !i.isPost)
          .map(({ key, href, label, Icon, active, badge, badgeLabel }) => (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-md outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                  active ? 'bg-primary-light font-semibold text-primary' : 'font-medium text-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                <Icon aria-hidden strokeWidth={active ? 2.25 : 1.75} className="size-5" />
                {label}
                {badge ? (
                  <span
                    aria-hidden
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent"
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
                {badge && badgeLabel ? <span className="sr-only">{badgeLabel}</span> : null}
              </Link>
            </li>
          ))}
      </ul>
      {post ? (
        <Link
          href={post.href}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-accent px-5 text-md font-semibold text-on-accent shadow-fab outline-none transition-colors hover:bg-accent/90 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Plus aria-hidden strokeWidth={2.25} className="size-5" />
          {post.label}
        </Link>
      ) : null}
    </nav>
  );
}

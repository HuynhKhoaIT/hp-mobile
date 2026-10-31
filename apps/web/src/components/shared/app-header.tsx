// Header khu người dùng: logo · ô tìm kiếm · Đăng tin (cam) · tin nhắn · thông báo · tài khoản.
// Điện thoại (< 640px): chỉ logo + tìm + tài khoản; các mục còn lại ở BottomNav.
import { Bell, MessageCircle, Plus, Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { locale as rootLocale } from 'next/root-params';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPathname, Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { Logo } from './logo';
import { UserMenu, UserMenuSkeleton } from './user-menu';

export async function AppHeader() {
  const t = await getTranslations();
  const raw = await rootLocale();
  const locale = routing.locales.find((l) => l === raw) ?? routing.defaultLocale;
  const searchAction = getPathname({ href: '/tim-kiem', locale });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <Logo />
        <form action={searchAction} role="search" className="hidden flex-1 sm:block">
          <label className="relative block">
            <span className="sr-only">{t('common.nav.search_placeholder')}</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
            <Input name="q" type="search" placeholder={t('common.nav.search_placeholder')} className="rounded-full pl-10" />
          </label>
        </form>
        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="sm:hidden">
            <Link href="/tim-kiem" aria-label={t('common.nav.search_placeholder')}>
              <Search strokeWidth={1.75} />
            </Link>
          </Button>
          <Button asChild variant="accent" className="hidden sm:inline-flex">
            <Link href="/dang-tin">
              <Plus strokeWidth={2} aria-hidden />
              {t('common.actions.post')}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Link href="/tin-nhan" aria-label={t('common.nav.messages')}>
              <MessageCircle strokeWidth={1.75} />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
            <Link href="/thong-bao" aria-label={t('common.nav.notifications')}>
              <Bell strokeWidth={1.75} />
            </Link>
          </Button>
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

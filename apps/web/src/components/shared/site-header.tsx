// Header khu marketing (landing, giới thiệu, pháp lý): logo · "Dùng ngay trên web" · tài khoản.
// Landing đầy đủ ở tuần 11; header người dùng ở app-header.tsx.
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Logo } from './logo';
import { UserMenu, UserMenuSkeleton } from './user-menu';

export async function SiteHeader() {
  const t = await getTranslations();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <nav aria-label={t('web.header.main_nav')} className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
        <Logo />
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/tin">{t('common.nav.explore')}</Link>
          </Button>
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}

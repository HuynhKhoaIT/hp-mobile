// Header tạm của tuần 1: logo + ngôn ngữ + giao diện. Tuần 2 tách header marketing và header người dùng
// (tìm kiếm, Đăng tin, tin nhắn, thông báo, avatar) + bottom nav trên điện thoại.
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from './locale-switcher';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';

export async function SiteHeader() {
  const t = await getTranslations('web.header');
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <nav
        aria-label={t('main_nav')}
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2"
      >
        <Logo />
        <div className="flex flex-wrap items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

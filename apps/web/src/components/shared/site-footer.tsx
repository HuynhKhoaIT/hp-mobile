// Footer: luôn có dòng "Ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát" (apps/web/CLAUDE.md mục 1),
// link pháp lý, đổi ngôn ngữ / giao diện.
import { APP_NAME } from '@hp/shared';
import { getTranslations } from 'next-intl/server';
import { cacheLife } from 'next/cache';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';

const LEGAL = [
  { href: '/gioi-thieu', key: 'about' },
  { href: '/dieu-khoan', key: 'terms' },
  { href: '/chinh-sach-bao-mat', key: 'privacy' },
  { href: '/xoa-tai-khoan', key: 'delete_account' },
  { href: '/lien-he', key: 'contact' },
] as const;

async function copyrightYear() {
  'use cache';
  // Năm thay đổi mỗi năm một lần: cache theo ngày, không làm footer thành dynamic.
  cacheLife('days');
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const t = await getTranslations();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {LEGAL.map(({ href, key }) => (
            <li key={key}>
              <Link href={href} className="inline-flex min-h-11 items-center text-sm text-muted hover:text-fg">
                {t(`web.legal.${key}`)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex flex-col gap-1 text-sm text-muted">
          <p>{t('common.disclaimer')}</p>
          <p>{t('web.footer.rights', { year: await copyrightYear(), appName: APP_NAME })}</p>
        </div>
      </div>
    </footer>
  );
}

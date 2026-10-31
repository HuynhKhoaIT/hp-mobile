// Footer: luôn có dòng "Ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát" (apps/web/CLAUDE.md mục 1),
// link pháp lý, đổi ngôn ngữ / giao diện. Khu (app) chỉ hiện footer đầy đủ từ 640px; điện thoại dùng `MobileDisclaimer`
// (các mục còn lại nằm ở trang "Tôi", giống tab Tôi của app).
import { APP_NAME } from '@hp/shared';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { copyrightYear, LEGAL_LINKS } from './legal-links';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';

export async function SiteFooter({ className }: { className?: string }) {
  const t = await getTranslations();
  return (
    <footer className={cn('border-t border-border bg-surface', className)}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {LEGAL_LINKS.map(({ href, key }) => (
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

/** Điện thoại (< 640px) trong khu (app): chỉ một dòng miễn trừ (bắt buộc), chừa chỗ cho thanh điều hướng dưới. */
export async function MobileDisclaimer() {
  const t = await getTranslations('common');
  return <p className="px-4 pt-4 pb-24 text-center text-xs text-muted sm:hidden">{t('disclaimer')}</p>;
}

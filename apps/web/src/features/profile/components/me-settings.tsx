// Phần cài đặt của trang "Tôi" (khách và người đã đăng nhập) — giống tab Tôi của app: ngôn ngữ, giao diện,
// link pháp lý, dòng miễn trừ + bản quyền. Trên điện thoại đây là nơi duy nhất có các mục này (footer ẩn < 640px).
import { APP_NAME } from '@hp/shared';
import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { copyrightYear, LEGAL_LINKS } from '@/components/shared/legal-links';
import { LocaleSwitcher } from '@/components/shared/locale-switcher';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Link } from '@/i18n/navigation';

export async function MeSettings() {
  const t = await getTranslations();
  return (
    <section aria-labelledby="me-settings" className="flex flex-col gap-4">
      <h2 id="me-settings" className="text-lg font-semibold text-fg">
        {t('web.me.settings')}
      </h2>
      <div className="flex flex-col divide-y divide-border rounded-lg bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <span className="text-md font-medium text-fg">{t('common.settings.language')}</span>
          <LocaleSwitcher />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <span className="text-md font-medium text-fg">{t('web.me.theme')}</span>
          <ThemeToggle />
        </div>
      </div>
      <nav aria-label={t('web.me.about')} className="rounded-lg bg-surface shadow-card">
        <ul className="flex flex-col divide-y divide-border">
          {LEGAL_LINKS.map(({ href, key }) => (
            <li key={key}>
              <Link href={href} className="flex min-h-12 items-center gap-3 px-4 text-md text-fg hover:bg-surface-2">
                <span className="flex-1">{t(`web.legal.${key}`)}</span>
                <ChevronRight aria-hidden strokeWidth={1.75} className="size-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-1 text-center text-sm text-muted">
        <p>{t('common.disclaimer')}</p>
        <p>{t('web.footer.rights', { year: await copyrightYear(), appName: APP_NAME })}</p>
      </div>
    </section>
  );
}

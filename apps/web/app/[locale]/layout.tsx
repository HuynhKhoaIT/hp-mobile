// Layout gốc theo ngôn ngữ (root param `locale`: vi không tiền tố, /en, /zh).
// Font Be Vietnam Pro (vi / en); Noto Sans SC chỉ gắn khi zh. Dark mode theo class (next-themes).
// Tạm noindex toàn site cho tới khi ra mắt (bỏ khi có landing + trang pháp lý — tuần 11).
import '../globals.css';
import { APP_NAME } from '@hp/shared';
import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Be_Vietnam_Pro, Noto_Sans_SC } from 'next/font/google';
import { notFound } from 'next/navigation';
import { locale as rootLocale } from 'next/root-params';
import { SiteFooter } from '@/components/shared/site-footer';
import { SiteHeader } from '@/components/shared/site-header';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
});

// Không preload: chỉ trang zh dùng tới; trình duyệt tải theo unicode-range khi gặp chữ Hán.
const notoSansSc = Noto_Sans_SC({
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-sc',
  display: 'swap',
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('web.meta');
  return {
    title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({ children }: LayoutProps<'/[locale]'>) {
  const locale = await rootLocale();
  // [locale] bắt mọi đoạn đầu URL (/xx/...): locale lạ → 404 thay vì hiện tiếng Việt.
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = await getMessages();
  const isZh = locale === 'zh';

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn('h-full', beVietnamPro.variable, isZh && [notoSansSc.variable, 'lang-zh'])}
    >
      <body className="flex min-h-full flex-col">
        {/* Client chỉ nhận namespace cần cho component tương tác. */}
        <NextIntlClientProvider messages={{ web: messages.web, common: messages.common, errors: messages.errors }}>
          <ThemeProvider>
            <SiteHeader />
            <main className="flex flex-1 flex-col">{children}</main>
            <SiteFooter />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

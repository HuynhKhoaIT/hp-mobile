// Layout gốc theo ngôn ngữ (root param `locale`: vi không tiền tố, /en, /zh): html, font, providers.
// Font Be Vietnam Pro; chữ Hán dùng font CJK của hệ thống (lớp lang-zh, xem --font-zh). Không dùng next/font cho Noto Sans SC:
// CSS của nó (404 @font-face, 372 KB) nằm trong layout gốc nên chặn render ở cả vi / en. Dark mode theo class (next-themes).
// noindex toàn site trừ khi NEXT_PUBLIC_ALLOW_INDEX=true (chỉ production).
import '../globals.css';
import { APP_NAME } from '@hp/shared';
import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Be_Vietnam_Pro } from 'next/font/google';
import { notFound } from 'next/navigation';
import { locale as rootLocale } from 'next/root-params';
import { Suspense } from 'react';
import { CookieConsent } from '@/components/shared/cookie-consent';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { ToastProvider } from '@/components/shared/toast';
import { clientWebMessages } from '@/i18n/client-messages';
import { routing } from '@/i18n/routing';
import { publicEnv } from '@/lib/env';
import { cn } from '@/lib/utils';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
});

// viewport-fit=cover để thanh điều hướng dưới chừa được vùng an toàn của iPhone (pb-safe).
export const viewport: Viewport = { viewportFit: 'cover' };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('web.meta');
  return {
    title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
    description: t('description'),
    robots: publicEnv.allowIndex ? undefined : { index: false, follow: false },
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
      className={cn('h-full', beVietnamPro.variable, isZh && 'lang-zh')}
    >
      <body className="flex min-h-full flex-col">
        {/* Client chỉ nhận namespace cần cho component tương tác. Header / footer ở layout của (marketing) và (app).
            `listing`: thẻ tin của "Xem thêm", chia sẻ, liên hệ (features/listing/components). */}
        <NextIntlClientProvider
          messages={{
            web: clientWebMessages(messages.web),
            common: messages.common,
            errors: messages.errors,
            auth: messages.auth,
            listing: messages.listing,
          }}
        >
          <ThemeProvider>
            <ToastProvider>
              {children}
              {/* Đọc URL ở client: Suspense để không chặn prerender của route động (Cache Components). */}
              <Suspense fallback={null}>
                <CookieConsent />
              </Suspense>
            </ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

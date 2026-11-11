// Gốc khu quản trị (/admin, /en/admin; zh dùng chữ vi cho ns admin): không header / footer marketing, không bottom nav.
// noindex (proxy.ts còn gắn X-Robots-Tag), không nằm trong sitemap. Gửi xuống client ns `admin` — chỉ ở khu này,
// trang công khai không tải chữ admin.
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { clientWebMessages } from '@/i18n/client-messages';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={{
        admin: messages.admin,
        common: messages.common,
        errors: messages.errors,
        auth: messages.auth,
        listing: messages.listing,
        group: messages.group,
        web: clientWebMessages(messages.web),
      }}
    >
      {/* data-area="admin": variant `admin:` (globals.css) tắt hiệu ứng lặp của component dùng chung (vd vệt sáng skeleton). */}
      <div data-area="admin" className="contents">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}

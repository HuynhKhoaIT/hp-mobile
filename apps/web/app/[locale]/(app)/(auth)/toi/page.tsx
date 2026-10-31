// /toi — trang "Tôi" (giống tab Tôi của app). Khách vào được (proxy.ts GUEST_OK): thẻ đăng nhập + cài đặt; đã đăng nhập:
// hồ sơ + lối vào Tin của tôi / Tin đã lưu. Hồ sơ đọc theo request → trong Suspense. /toi/* vẫn cần đăng nhập.
import type { Metadata } from 'next';
import { ChevronRight, FileText, Heart } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { TextLinesSkeleton } from '@/components/shared/skeletons';
import { MyAccount } from '@/features/auth/components/my-account';
import { MeSettings } from '@/features/profile/components/me-settings';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.nav');
  return { title: t('me'), robots: { index: false, follow: false } };
}

export default async function MePage() {
  const t = await getTranslations('listing');
  const links = [
    { href: '/toi/tin-cua-toi', label: t('manage.title'), Icon: FileText },
    { href: '/toi/da-luu', label: t('saved.title'), Icon: Heart },
  ] as const;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Suspense fallback={<TextLinesSkeleton lines={6} />}>
        <MyAccount />
      </Suspense>
      <nav aria-label={t('manage.title')}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {links.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-14 items-center gap-3 rounded-lg bg-surface p-4 text-md font-medium text-fg shadow-card outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Icon aria-hidden strokeWidth={1.75} className="size-6 text-primary" />
                <span className="flex-1">{label}</span>
                <ChevronRight aria-hidden strokeWidth={1.75} className="size-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <MeSettings />
    </section>
  );
}

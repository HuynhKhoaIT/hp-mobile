// /toi — trang "Tôi" (cần đăng nhập; proxy.ts chuyển khách sang /dang-nhap?next=/toi).
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { TextLinesSkeleton } from '@/components/shared/skeletons';
import { MyAccount } from '@/features/auth/components/my-account';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.nav');
  return { title: t('me') };
}

export default function MePage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8">
      <Suspense fallback={<TextLinesSkeleton lines={6} />}>
        <MyAccount />
      </Suspense>
    </section>
  );
}

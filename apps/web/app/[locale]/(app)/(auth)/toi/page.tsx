// /toi — trang "Tôi" (giống tab Tôi của app, style Stitch "Trang cá nhân"). Khách vào được (proxy.ts GUEST_OK): header mời
// đăng nhập + cài đặt; đã đăng nhập: header xanh hồ sơ → dải số liệu → thẻ huy hiệu → lối tắt → khối Tin của tôi (MyAccount)
// rồi "Cài đặt & hỗ trợ" (MeSettings). Hồ sơ đọc theo request → trong Suspense (fallback cùng khung header + dải số).
// Điện thoại: header xanh tràn mép (bo đáy); từ 640px là khối bo góc trong container. /toi/* vẫn cần đăng nhập.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { MyAccount, MyAccountSkeleton } from '@/features/auth/components/my-account';
import { MeSettings } from '@/features/profile/components/me-settings';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.nav');
  return { title: t('me'), robots: { index: false, follow: false } };
}

export default function MePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-8 sm:px-4 sm:pt-6">
      <Suspense fallback={<MyAccountSkeleton />}>
        <MyAccount />
      </Suspense>
      <div className="px-4 sm:px-0">
        <MeSettings />
      </div>
    </section>
  );
}

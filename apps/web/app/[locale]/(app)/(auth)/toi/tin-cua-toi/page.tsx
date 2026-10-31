// /toi/tin-cua-toi — Tin của tôi: tab Đang đăng / Chờ duyệt / Nháp / Đã đóng, menu thao tác từng tin.
// Đọc theo request (cookie phiên + ?tab) → trong <Suspense>; fallback giữ khung tab + skeleton đúng hình dòng tin.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { MyListingsSkeletonRows, MyListingsTabs, MyListingsView } from '@/features/listing/components/my-listings-view';
import { PostListingButton } from '@/features/listing/components/post-listing-button';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('listing.manage');
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function Page({ searchParams }: PageProps<'/[locale]/toi/tin-cua-toi'>) {
  const t = await getTranslations('listing.manage');
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-fg">{t('title')}</h1>
        <PostListingButton />
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <MyListingsTabs current={null} />
            <MyListingsSkeletonRows />
          </div>
        }
      >
        <MyListingsView searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

// /toi/tin-cua-toi — Tin của tôi (style Stitch "Quản lý tin đăng"): tiêu đề có vạch cam + nút Đăng tin, hàng chip trạng thái
// có số (Đang đăng / Chờ duyệt / Nháp / Đã đóng), thẻ quản lý có hàng thao tác nhanh + menu ⋮.
// Đọc theo request (cookie phiên + ?tab) → trong <Suspense>; fallback giữ hàng chip + skeleton đúng hình thẻ.
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
        <h1 className="flex items-center gap-2 text-2xl font-bold text-fg">
          <span aria-hidden className="h-5 w-1.5 shrink-0 rounded-full bg-accent" />
          {t('title')}
        </h1>
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

// /dang-tin — form "Đăng nhanh" (khu đăng nhập: proxy.ts chuyển khách sang /dang-nhap?next=/dang-tin).
// ?feature=pass|room|job|lostFound chọn sẵn tính năng. Đọc theo request (cookie) → nội dung trong <Suspense>.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { ListingFormSkeleton, PostListingView } from '@/features/listing/components/post-listing-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('listing.form');
  return { title: t('title_new'), robots: { index: false, follow: false } };
}

export default function Page({ searchParams }: PageProps<'/[locale]/dang-tin'>) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-6">
      <Suspense fallback={<ListingFormSkeleton />}>
        <PostListingView searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

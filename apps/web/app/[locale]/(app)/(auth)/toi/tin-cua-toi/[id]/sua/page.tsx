// /toi/tin-cua-toi/[id]/sua — sửa tin của tôi: cùng form "Đăng nhanh", điền sẵn từ getMyListing (RLS: chỉ chủ tin).
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { EditListingView, ListingFormSkeleton } from '@/features/listing/components/post-listing-view';

// Cache Components cần ít nhất một giá trị tham số để dựng khung tĩnh (layout dùng usePathname — giống /tin/[slug]).
// id giữ chỗ: chỉ khung (header / footer) được prerender; nội dung luôn đọc theo request trong <Suspense> (cookie phiên).
export function generateStaticParams() {
  return [{ id: '00000000-0000-0000-0000-000000000000' }];
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('listing.form');
  return { title: t('title_edit'), robots: { index: false, follow: false } };
}

export default function Page({ params }: PageProps<'/[locale]/toi/tin-cua-toi/[id]/sua'>) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-6">
      <Suspense fallback={<ListingFormSkeleton />}>
        <EditListingView params={params} />
      </Suspense>
    </section>
  );
}

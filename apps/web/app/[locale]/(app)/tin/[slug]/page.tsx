// /tin/[slug] — chi tiết tin. slug = {tieu-de-khong-dau}-{short_id}; RPC so short_id cuối slug.
// - Slug trên URL khác slug chuẩn (tiêu đề đổi / link cũ) → permanentRedirect (308) tới slug chuẩn.
// - Không có / đã gỡ / chờ duyệt / nháp → notFound() (404, not-found.tsx).
// - Đã bán / đóng / hết hạn ≤ 30 ngày → 200 + banner trạng thái + tin tương tự (ListingDetail).
// - Thôi hiện > 30 ngày (isListingGone) → redirect (307) tới /tin/{slug}/da-go — route handler trả 410 Gone.
//   Next không có API đặt mã 410 cho page (chỉ notFound / forbidden / unauthorized), còn kiểm trong proxy.ts thì thêm một lần
//   gọi DB mỗi lượt xem tin (đã quyết định không làm cho 404). 307 (không 308) vì chủ tin có thể mở lại tin → không để
//   trình duyệt nhớ chuyển hướng vĩnh viễn.
// Đọc `params` NGOÀI Suspense (không có loading.tsx ở segment này) để redirect / 404 xảy ra trước khi stream → đúng mã HTTP
// (với slug đã prerender hoặc đã vào cache; lần ĐẦU vào slug chưa prerender trả 200 + chuyển ở client — quyết định 2026-10-31).
// Dữ liệu cache 300s + tag listing:{id} (features/listing/queries.ts); 20 tin mới nhất prerender lúc build.
import { isListingGone } from '@hp/core';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ListingDetail } from '@/features/listing/components/listing-detail';
import { listingMetadata } from '@/features/listing/metadata';
import { getListingPage, getPrerenderSlugs } from '@/features/listing/queries';
import { permanentRedirect, redirect } from '@/i18n/navigation';

export async function generateStaticParams() {
  return (await getPrerenderSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/[locale]/tin/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const { listing } = await getListingPage(slug);
  if (!listing) {
    const t = await getTranslations('listing.detail');
    return { title: t('not_found_title'), robots: { index: false, follow: true } };
  }
  return listingMetadata(listing);
}

export default async function ListingPage({ params }: PageProps<'/[locale]/tin/[slug]'>) {
  const { slug } = await params;
  const { listing, now } = await getListingPage(slug);
  if (!listing) notFound();
  const locale = await getLocale();
  if (listing.slug !== slug) permanentRedirect({ href: `/tin/${listing.slug}`, locale });
  if (isListingGone(listing, new Date(now))) redirect({ href: `/tin/${listing.slug}/da-go`, locale });
  return <ListingDetail listing={listing} now={now} />;
}

// /tin/[slug] — chi tiết tin. slug = {tieu-de-khong-dau}-{short_id}; RPC so short_id cuối slug.
// - Slug trên URL khác slug chuẩn (tiêu đề đổi / link cũ) → permanentRedirect (308) tới slug chuẩn.
// - Không có / không còn active → notFound() (404, not-found.tsx).
// Đọc `params` NGOÀI Suspense (không có loading.tsx ở segment này) để redirect / 404 xảy ra trước khi stream → đúng mã HTTP.
// Dữ liệu cache 300s + tag listing:{id} (features/listing/queries.ts); 20 tin mới nhất prerender lúc build, còn lại
// render lần đầu rồi lưu (ISR). Tin sold / expired (200 + nhãn, 410 sau 30 ngày): khi RPC trả tin không active (tuần 4).
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ListingDetail } from '@/features/listing/components/listing-detail';
import { listingMetadata } from '@/features/listing/metadata';
import { getListingPage, getPrerenderSlugs } from '@/features/listing/queries';
import { permanentRedirect } from '@/i18n/navigation';

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
  if (listing.slug !== slug) permanentRedirect({ href: `/tin/${listing.slug}`, locale: await getLocale() });
  return <ListingDetail listing={listing} now={now} />;
}

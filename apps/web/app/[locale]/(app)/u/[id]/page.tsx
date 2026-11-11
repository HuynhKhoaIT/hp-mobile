// /u/[id] — hồ sơ công khai (style Stitch "Hồ sơ công khai người khác", khớp app apps/mobile/app/profile/[id].tsx):
// header xanh → thẻ hồ sơ (tên "An N.", khu, tham gia, đánh giá, huy hiệu; Báo cáo / Chặn) → nhóm đang mở → tin đang đăng →
// mẹo an toàn. Mở từ "Xem hồ sơ" ở người đăng tin (PosterCard) và người tạo nhóm (chi tiết nhóm).
// - Dữ liệu chỉ từ view công khai (public_profiles / public_listings / public_groups) với client ẩn danh, cache 600s + tag
//   profile:{id} (features/profile/queries.ts). Không SĐT, không vị trí chính xác, không họ tên đầy đủ.
// - SEO: robots noindex, follow — hồ sơ cá nhân không phải trang đích tìm kiếm (không có trong sitemap.ts theo
//   apps/web/CLAUDE.md mục 6 + web-seo-public.md); vẫn có canonical / hreflang / Open Graph để chia sẻ link. Không JSON-LD
//   (Person cho người dùng thường là dữ liệu cá nhân, không có loại phù hợp trong rule).
// - id không phải UUID / không có / đã xoá / bị khoá → notFound() (404, not-found.tsx). Đọc `params` NGOÀI Suspense (không có
//   loading.tsx ở segment này, giống /tin/[slug], /nhom/[slug]) để 404 xảy ra trước khi stream → đúng mã HTTP.
// - Cache Components cần ít nhất một tham số lúc build: id giữ chỗ (render not-found); hồ sơ thật render theo lượt xem đầu.
import { APP_NAME } from '@hp/shared';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { asLocale } from '@/features/listing/display';
import { getPublicSites } from '@/features/listing/queries';
import { PublicProfileCard, PublicProfileHero } from '@/features/profile/components/public-profile-card';
import { PublicProfileSections } from '@/features/profile/components/public-profile-sections';
import { getPublicProfilePage, PROFILE_LISTINGS_PAGE_SIZE } from '@/features/profile/queries';
import { absoluteUrl, localeAlternates } from '@/i18n/alternates';

const PLACEHOLDER_ID = '00000000-0000-0000-0000-000000000000';

export function generateStaticParams() {
  return [{ id: PLACEHOLDER_ID }];
}

export async function generateMetadata({ params }: PageProps<'/[locale]/u/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const { profile } = await getPublicProfilePage(id);
  const t = await getTranslations();
  if (!profile) return { title: t('common.profile.not_found'), robots: { index: false, follow: true } };
  const locale = asLocale(await getLocale());
  const name = profile.display_name || t('chat.inbox.deleted_user');
  const title = t('web.profile.meta_title', { name });
  const description = t('web.profile.meta_description', { name, app: APP_NAME });
  const path = `/u/${profile.id}`;
  return {
    title,
    description,
    alternates: localeAlternates(path, locale),
    openGraph: { type: 'profile', siteName: APP_NAME, title, description, url: absoluteUrl(path, locale), locale },
    twitter: { card: 'summary' },
    robots: { index: false, follow: true },
  };
}

export default async function PublicProfilePage({ params }: PageProps<'/[locale]/u/[id]'>) {
  const { id } = await params;
  const { profile, listings, groups, now } = await getPublicProfilePage(id);
  if (!profile) notFound();
  const locale = asLocale(await getLocale());
  const sites = await getPublicSites();
  const siteName = sites.find((s) => s.code === profile.site)?.name ?? null;

  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-8 sm:px-4 sm:pt-6">
      <div className="flex flex-col">
        <PublicProfileHero />
        <PublicProfileCard profile={profile} siteName={siteName} locale={locale} />
      </div>
      <PublicProfileSections
        userId={profile.id}
        listings={listings}
        groups={groups}
        now={now}
        pageSize={PROFILE_LISTINGS_PAGE_SIZE}
      />
    </article>
  );
}

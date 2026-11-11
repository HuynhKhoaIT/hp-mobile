// Trang danh sách dùng chung cho /tin (tất cả) và 4 tính năng Listing (/pass-do, /tro, /viec-lam, /that-lac).
// Khác biệt theo tính năng chỉ đến từ config.ts (scopeInfo). Style Stitch (khớp màn danh sách của app):
//   1 header xanh (HeaderDecor như trang chủ / "Tôi"; tràn mép + bo đáy trên điện thoại, khối bo xl từ 640px): ô icon dịch vụ,
//     H1 (theo khu khi lọc) + mô tả SEO của trang, nút Đăng tin; form tìm (ô nổi + khu + khoảng cách) bên trong.
//   2 chip danh mục / tính năng + chip lọc nhanh theo thông số (config.quickFilters) + "Xoá lọc" (ListChips).
//   3 mẹo an toàn riêng tính năng (config.tipKey) khi chưa lọc → tiêu đề có vạch cam ("Tin mới đăng" / "Kết quả cho …") → lưới.
// Render (Cache Components):
// - Fallback của <Suspense> = trang đầu KHÔNG lọc (dữ liệu cache 300s) → nằm trong static shell: HTML có tin thật ngay cả khi
//   tắt JS hoặc với bot chỉ đọc HTML (không phải skeleton).
// - Phần đọc searchParams (bộ lọc, H1 theo khu, kết quả lọc) chạy theo request trong <Suspense> và thay fallback khi xong.
//   Không lọc → nội dung giống hệt fallback. Có từ khoá → không cache + ghi từ khoá (log_search) sau khi trả trang (after()).
// - "Xem thêm" đọc trang tiếp ở trình duyệt.
import { Compass, Inbox, SearchX } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { after } from 'next/server';
import { Suspense } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { HeaderDecor } from '@/components/shared/header-decor';
import { Button } from '@/components/ui/button';
import { getPathname, Link } from '@/i18n/navigation';
import { asLocale } from '../display';
import { activeFilterCount, distanceMeters, type ListFilterState, parseListFilters } from '../filters';
import { getListPage, getPublicSites, LIST_PAGE_SIZE, logSearchTerm } from '../queries';
import { LISTING_FEATURE_CONFIGS } from '../features';
import { type ListScope, scopeInfo } from '../scope';
import { ListChips, ListSearchForm } from './list-filters';
import { ListingGrid } from './listing-grid';
import { LoadMore } from './load-more';
import { PostListingButton } from './post-listing-button';
import { BarHeading, SafetyTip } from './safety-tip';

type RawParams = Record<string, string | string[] | undefined>;

const NO_FILTERS: ListFilterState = { category: null, query: '', site: null, distanceKm: null, attributes: {} };

export function ListingListPage({ scope, searchParams }: { scope: ListScope; searchParams: Promise<RawParams> }) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-6 sm:px-4 sm:pt-6">
      <Suspense fallback={<ListBody scope={scope} filters={NO_FILTERS} />}>
        <ListContent scope={scope} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ListContent({ scope, searchParams }: { scope: ListScope; searchParams: Promise<RawParams> }) {
  const { categories, distanceKm } = scopeInfo(scope);
  const filters = parseListFilters(await searchParams, categories, distanceKm);
  return <ListBody scope={scope} filters={filters} />;
}

async function ListBody({ scope, filters }: { scope: ListScope; filters: ListFilterState }) {
  const { feature, path, categories, seoKey, cardLayout, distanceKm } = scopeInfo(scope);
  const locale = asLocale(await getLocale());
  const t = await getTranslations();

  const [{ page, now }, sites] = await Promise.all([
    getListPage({
      categories: filters.category ? [filters.category] : categories,
      site: filters.site,
      query: filters.query,
      attributes: filters.attributes,
      maxDistanceM: distanceMeters(filters.distanceKm),
    }),
    getPublicSites(),
  ]);
  if (filters.query) {
    const results = page.items.length;
    after(() => logSearchTerm(filters.query, results, filters.category ?? undefined).catch(() => undefined));
  }
  const siteName = sites.find((s) => s.code === filters.site)?.name;
  const heading = siteName ? t(`web.listing.${seoKey}.heading_site`, { site: siteName }) : t(`web.listing.${seoKey}.title`);
  const featureName = feature ? t(`common.feature.${feature}`) : t('listing.list.title_all');
  const filtered = activeFilterCount(filters) > 0;

  const cfg = feature ? LISTING_FEATURE_CONFIGS[feature] : null;
  const HeroIcon = cfg?.Icon ?? Compass;

  return (
    <>
      <div className="relative overflow-hidden rounded-b-xl bg-primary text-on-primary sm:rounded-xl">
        <HeaderDecor />
        <div className="relative flex flex-col gap-4 px-4 pt-4 pb-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className={cfg ? `flex size-10 shrink-0 items-center justify-center rounded-md ${cfg.tone.soft}` : 'flex size-10 shrink-0 items-center justify-center rounded-md bg-on-primary/15'}
            >
              <HeroIcon strokeWidth={1.75} className={cfg ? `size-6 ${cfg.tone.fg}` : 'size-6'} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 className="text-xl font-bold sm:text-2xl">{heading}</h1>
              <p className="line-clamp-2 text-sm text-on-primary/90 sm:text-md">{t(`web.listing.${seoKey}.description`)}</p>
            </div>
            <div className="hidden shrink-0 sm:block">
              <PostListingButton feature={feature} />
            </div>
          </div>
          <ListSearchForm
            action={getPathname({ href: path, locale })}
            filters={filters}
            sites={sites}
            distanceOptions={distanceKm}
            searchPlaceholder={t('listing.list.search_placeholder', { feature: featureName })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 sm:px-0">
        <ListChips path={path} feature={feature} categories={categories} filters={filters} />

        {cfg?.tipKey && !filtered ? <SafetyTip title={t('listing.tip.title')} text={t(cfg.tipKey)} /> : null}

        <div className="flex items-center justify-between gap-3">
          <BarHeading>{filters.query ? t('web.listing.search_results', { query: filters.query }) : t('listing.hub.latest_title')}</BarHeading>
          <div className="sm:hidden">
            <PostListingButton feature={feature} />
          </div>
        </div>

        {page.items.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              title={t('listing.list.empty_search_title')}
              description={t('listing.list.empty_search_body')}
              action={
                <Button asChild variant="outline">
                  <Link href={path}>{t('listing.list.clear_filters')}</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title={t('listing.list.empty_title')}
              description={t('listing.list.empty_body')}
              action={<PostListingButton feature={feature} />}
            />
          )
        ) : (
          <div className="flex flex-col gap-3">
            <ListingGrid items={page.items} now={now} layout={cardLayout} prioritizeFirst />
            <LoadMore
              categories={filters.category ? [filters.category] : categories}
              query={filters.query}
              site={filters.site}
              attributes={filters.attributes}
              maxDistanceM={distanceMeters(filters.distanceKm)}
              pageSize={LIST_PAGE_SIZE}
              initialCursor={page.nextCursor}
              layout={cardLayout}
            />
          </div>
        )}
      </div>
    </>
  );
}

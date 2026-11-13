// Trang danh sách dùng chung cho /tin (tất cả) và 4 tính năng Listing (/pass-do, /tro, /viec-lam, /that-lac).
// Khác biệt theo tính năng chỉ đến từ config.ts (scopeInfo). Style Stitch (khớp màn danh sách của app):
//   1 header xanh (HeaderDecor như trang chủ / "Tôi"; tràn mép + bo đáy trên điện thoại, khối bo xl từ 640px): ô icon dịch vụ,
//     H1 (theo khu khi lọc) + mô tả SEO của trang, nút Đăng tin; form tìm (ô nổi + khu + khoảng cách / giá / sắp xếp) bên trong.
//   2 chip danh mục / tính năng + chip lọc nhanh theo thông số (config.quickFilters) + "Xoá lọc" (ListChips).
//   3 khi chưa lọc: khối mời đăng tin (config.banner — đồ thất lạc "Báo nhặt được / Đăng tin tìm đồ", trọ "Bạn là chủ trọ?")
//     → mẹo an toàn riêng tính năng (config.tipKey) → tiêu đề có vạch cam ("Tin mới đăng" / "Kết quả cho …") → lưới.
// Tính năng có config.home và chưa lọc / sắp xếp → trang chủ mini (cùng thứ tự với app): header + ô tìm → lưới danh
// mục → banner → các dải (FeatureHome) → mẹo an toàn → "Tất cả tin {tính năng}" (chip lọc + lưới + Xem thêm). Có lọc → như trên.
// Tính năng có config.miniApp (Chợ Pass Đồ, Nhà Trọ) → khung gắn data-app-theme + MiniAppList: header + điều hướng riêng của mini-app, trang chủ mini-app khi chưa
// lọc, danh sách đã lọc trong cùng khung khi có lọc (mini-app-list.tsx). Cùng dữ liệu / cache / SEO với danh sách thường.
// Render (Cache Components):
// - Fallback của <Suspense> = trang đầu KHÔNG lọc (dữ liệu cache 300s) → nằm trong static shell: HTML có tin thật ngay cả khi
//   tắt JS hoặc với bot chỉ đọc HTML (không phải skeleton).
// - Phần đọc searchParams (bộ lọc, H1 theo khu, kết quả lọc) chạy theo request trong <Suspense> và thay fallback khi xong.
//   Không lọc → nội dung giống hệt fallback. Có từ khoá → không cache + ghi từ khoá (log_search) sau khi trả trang (after()).
//   Giá nhập tay (mini-app, ?price_min= / ?price_max= ngoài mốc chip) → không cache (hasCustomPrice).
// - "Xem thêm" đọc trang tiếp ở trình duyệt với đúng bộ lọc + thứ tự (cursor mờ của searchListings).
import { Compass } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { after } from 'next/server';
import { Suspense } from 'react';
import { HeaderDecor } from '@/components/shared/header-decor';
import { getPathname } from '@/i18n/navigation';
import { asLocale } from '../display';
import { hasCustomPrice, isFiltered, type ListFilterState, NO_FILTERS, parseListFilters, searchFiltersOf } from '../filters';
import { getListPage, getPublicSites, logSearchTerm } from '../queries';
import { LISTING_FEATURE_CONFIGS } from '../features';
import { appThemeOf, isMiniApp } from '../mini-app';
import { type ListScope, scopeInfo } from '../scope';
import { FeatureHome } from './feature-home';
import { ListChips, ListSearchForm } from './list-filters';
import { ListResults } from './list-results';
import { ListingBanner } from './listing-banner';
import { MiniAppList } from './mini-app/mini-app-list';
import { PostListingButton } from './post-listing-button';
import { BarHeading, SafetyTip } from './safety-tip';

type RawParams = Record<string, string | string[] | undefined>;

export function ListingListPage({ scope, searchParams }: { scope: ListScope; searchParams: Promise<RawParams> }) {
  const { feature } = scopeInfo(scope);
  // Mini-app (config.miniApp): màu chủ đạo riêng cho cả trang (header gradient, chip, nút chính).
  const theme = appThemeOf(feature ? LISTING_FEATURE_CONFIGS[feature] : null);
  return (
    <section data-app-theme={theme} className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-6 sm:px-4 sm:pt-6">
      <Suspense fallback={<ListBody scope={scope} filters={NO_FILTERS} />}>
        <ListContent scope={scope} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ListContent({ scope, searchParams }: { scope: ListScope; searchParams: Promise<RawParams> }) {
  const { categories, filterOptions } = scopeInfo(scope);
  const filters = parseListFilters(await searchParams, categories, filterOptions);
  return <ListBody scope={scope} filters={filters} />;
}

async function ListBody({ scope, filters }: { scope: ListScope; filters: ListFilterState }) {
  const { feature, path, categories, seoKey, cardLayout, distanceKm, filterOptions } = scopeInfo(scope);
  const locale = asLocale(await getLocale());
  const t = await getTranslations();
  // Khoảng cách / giá / cho tặng / thứ tự — giống hệt cho trang đầu và "Xem thêm" (cursor phải đi cùng bộ lọc).
  const extra = searchFiltersOf(filters, filterOptions);
  const listCategories = filters.category ? [filters.category] : categories;

  const [{ page, now }, sites] = await Promise.all([
    getListPage({
      categories: listCategories,
      site: filters.site,
      query: filters.query,
      attributes: filters.attributes,
      ...extra,
      fresh: hasCustomPrice(filters, filterOptions),
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
  const filtered = isFiltered(filters);

  const cfg = feature ? LISTING_FEATURE_CONFIGS[feature] : null;
  if (isMiniApp(cfg)) {
    return (
      <MiniAppList
        cfg={cfg}
        filters={filters}
        sites={sites}
        locale={locale}
        page={page}
        now={now}
        heading={heading}
        listCategories={listCategories}
        extra={extra}
      />
    );
  }
  const HeroIcon = cfg?.Icon ?? Compass;
  // Trang chủ mini (config.home) chỉ khi chưa lọc / sắp xếp.
  const showHome = !!cfg?.home && !filtered;
  const latestTitle = filters.query
    ? t('web.listing.search_results', { query: filters.query })
    : showHome
      ? t('listing.feature_home.latest_title', { feature: featureName })
      : t('listing.hub.latest_title');
  const chips = <ListChips path={path} feature={feature} categories={categories} filters={filters} />;

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
            priceRanges={cfg?.priceRanges}
            sortable={cfg?.sortable}
            searchPlaceholder={t('listing.list.search_placeholder', { feature: featureName })}
          />
        </div>
      </div>

      <div className={showHome ? 'flex flex-col gap-6 px-4 sm:px-0' : 'flex flex-col gap-4 px-4 sm:px-0'}>
        {showHome && cfg ? <FeatureHome cfg={cfg} sites={sites} locale={locale} /> : chips}

        {cfg?.banner && !filtered ? <ListingBanner banner={cfg.banner} feature={cfg.feature} /> : null}

        {cfg?.tipKey && !filtered ? <SafetyTip title={t('listing.tip.title')} text={t(cfg.tipKey)} /> : null}

        <section aria-labelledby="list-latest" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <BarHeading id="list-latest">{latestTitle}</BarHeading>
            <div className="sm:hidden">
              <PostListingButton feature={feature} />
            </div>
          </div>

          {/* Trang chủ mini: chip lọc (danh mục, tình trạng, Cho tặng…) thuộc mục "Tất cả tin". */}
          {showHome ? chips : null}

          <ListResults
            items={page.items}
            nextCursor={page.nextCursor}
            now={now}
            filters={filters}
            extra={extra}
            categories={listCategories}
            path={path}
            feature={feature}
            layout={cardLayout}
            prioritizeFirst={!showHome}
          />
        </section>
      </div>
    </>
  );
}

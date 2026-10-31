// Trang danh sách dùng chung cho /tin (tất cả) và 4 tính năng Listing (/pass-do, /tro, /viec-lam, /that-lac).
// Khác biệt theo tính năng chỉ đến từ config.ts (scopeInfo).
// Render (Cache Components):
// - Fallback của <Suspense> = trang đầu KHÔNG lọc (dữ liệu cache 300s) → nằm trong static shell: HTML có tin thật ngay cả khi
//   tắt JS hoặc với bot chỉ đọc HTML (không phải skeleton).
// - Phần đọc searchParams (bộ lọc, H1 theo khu, kết quả lọc) chạy theo request trong <Suspense> và thay fallback khi xong.
//   Không lọc → nội dung giống hệt fallback. Có từ khoá → không cache + ghi từ khoá (log_search) sau khi trả trang (after()).
// - "Xem thêm" đọc trang tiếp ở trình duyệt.
import { Inbox, SearchX } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { after } from 'next/server';
import { Suspense } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { getPathname, Link } from '@/i18n/navigation';
import { asLocale } from '../display';
import { activeFilterCount, type ListFilterState, parseListFilters } from '../filters';
import { getListPage, getPublicSites, LIST_PAGE_SIZE, logSearchTerm } from '../queries';
import { type ListScope, scopeInfo } from '../scope';
import { ListFilters } from './list-filters';
import { ListingGrid } from './listing-grid';
import { LoadMore } from './load-more';
import { PostListingButton } from './post-listing-button';

type RawParams = Record<string, string | string[] | undefined>;

const NO_FILTERS: ListFilterState = { category: null, query: '', site: null, attributes: {} };

export function ListingListPage({ scope, searchParams }: { scope: ListScope; searchParams: Promise<RawParams> }) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
      <Suspense fallback={<ListBody scope={scope} filters={NO_FILTERS} />}>
        <ListContent scope={scope} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ListContent({ scope, searchParams }: { scope: ListScope; searchParams: Promise<RawParams> }) {
  const filters = parseListFilters(await searchParams, scopeInfo(scope).categories);
  return <ListBody scope={scope} filters={filters} />;
}

async function ListBody({ scope, filters }: { scope: ListScope; filters: ListFilterState }) {
  const { feature, path, categories, seoKey, cardLayout } = scopeInfo(scope);
  const locale = asLocale(await getLocale());
  const t = await getTranslations();

  const [{ page, now }, sites] = await Promise.all([
    getListPage({
      categories: filters.category ? [filters.category] : categories,
      site: filters.site,
      query: filters.query,
      attributes: filters.attributes,
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

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-fg">{heading}</h1>
        <PostListingButton feature={feature} />
      </div>

      <ListFilters
        path={path}
        action={getPathname({ href: path, locale })}
        feature={feature}
        categories={categories}
        filters={filters}
        sites={sites}
        searchPlaceholder={t('listing.list.search_placeholder', { feature: featureName })}
      />

      <h2 className="text-lg font-semibold text-fg">
        {filters.query ? t('web.listing.search_results', { query: filters.query }) : t('listing.hub.latest_title')}
      </h2>

      {page.items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title={t('listing.list.empty_search_title')}
            description={t('listing.list.empty_search_body')}
            action={
              <Button asChild variant="outline">
                <Link href={path}>{t('listing.list.clear_search')}</Link>
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
            pageSize={LIST_PAGE_SIZE}
            initialCursor={page.nextCursor}
            layout={cardLayout}
          />
        </div>
      )}
    </>
  );
}

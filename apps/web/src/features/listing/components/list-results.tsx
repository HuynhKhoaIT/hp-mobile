// Khối kết quả của trang danh sách (dùng chung danh sách thường và trang chủ mini-app): rỗng (đang lọc → "Xoá lọc"; chưa
// lọc → mời đăng tin) │ lưới trang đầu (server render — tắt JS vẫn đọc được) + "Xem thêm" (trang sau ở trình duyệt, cùng bộ
// lọc + thứ tự; đổi bộ lọc → key mới, bỏ trang đã tải + cursor cũ).
import type { PublicListing } from '@hp/core';
import type { ListingCategory, ListingFeature } from '@hp/shared';
import { Inbox, SearchX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { filterQuery, isFiltered, type ListFilterState, searchFiltersOf } from '../filters';
import { LIST_PAGE_SIZE } from '../queries';
import { ListingGrid } from './listing-grid';
import { LoadMore } from './load-more';
import { PostListingButton } from './post-listing-button';

export async function ListResults({
  items,
  nextCursor,
  now,
  filters,
  extra,
  categories,
  path,
  feature,
  layout,
  prioritizeFirst,
}: {
  items: PublicListing[];
  nextCursor: string | null;
  now: number;
  filters: ListFilterState;
  /** Bộ lọc gửi search_listings (searchFiltersOf) — giống trang đầu để cursor khớp. */
  extra: ReturnType<typeof searchFiltersOf>;
  /** Danh mục đang đọc (đã áp chip danh mục). */
  categories: readonly ListingCategory[];
  path: string;
  feature: ListingFeature | null;
  layout: 'grid' | 'row';
  prioritizeFirst: boolean;
}) {
  const t = await getTranslations();
  if (items.length === 0) {
    return isFiltered(filters) ? (
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
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ListingGrid items={items} now={now} layout={layout} prioritizeFirst={prioritizeFirst} />
      <LoadMore
        key={new URLSearchParams(filterQuery(filters)).toString()}
        categories={categories}
        query={filters.query}
        site={filters.site}
        attributes={filters.attributes}
        {...extra}
        pageSize={LIST_PAGE_SIZE}
        initialCursor={nextCursor}
        layout={layout}
      />
    </div>
  );
}

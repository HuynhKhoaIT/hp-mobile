// Trang danh sách dùng chung cho 2 tính năng Group (/ghep-xe, /ghep-tran). Khác biệt theo tính năng chỉ đến từ config.ts.
// Render (Cache Components) giống ListingListPage:
// - Fallback của <Suspense> = trang đầu KHÔNG lọc (dữ liệu cache 60s) → nằm trong static shell: HTML có nhóm thật ngay cả
//   khi tắt JS hoặc với bot chỉ đọc HTML (không phải skeleton).
// - Phần đọc searchParams (bộ lọc, kết quả lọc) chạy theo request trong <Suspense> và thay fallback khi xong.
// - "Xem thêm" đọc trang tiếp ở trình duyệt.
import type { GroupKind } from '@hp/shared';
import { SearchX, Users } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { getPathname, Link } from '@/i18n/navigation';
import { type GroupFilterState, groupFilterCount, NO_GROUP_FILTERS, parseGroupFilters } from '../filters';
import { GROUP_FEATURE_CONFIGS } from '../features';
import { GROUP_PAGE_SIZE, getGroupListPage } from '../queries';
import { CreateGroupButton } from './create-group-button';
import { GroupGrid } from './group-card';
import { GroupFilters } from './group-filters';
import { GroupLoadMore } from './group-load-more';

type RawParams = Record<string, string | string[] | undefined>;

export function GroupListPage({ kind, searchParams }: { kind: GroupKind; searchParams: Promise<RawParams> }) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
      <Suspense fallback={<GroupListBody kind={kind} filters={NO_GROUP_FILTERS} />}>
        <GroupListContent kind={kind} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function GroupListContent({ kind, searchParams }: { kind: GroupKind; searchParams: Promise<RawParams> }) {
  const filters = parseGroupFilters(await searchParams, kind);
  return <GroupListBody kind={kind} filters={filters} />;
}

async function GroupListBody({ kind, filters }: { kind: GroupKind; filters: GroupFilterState }) {
  const cfg = GROUP_FEATURE_CONFIGS[kind];
  const locale = asLocale(await getLocale());
  const t = await getTranslations();
  const { page, now } = await getGroupListPage(kind, filters);
  const filtered = groupFilterCount(filters) > 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-fg">{t(`group.list.title_${kind}`)}</h1>
        <CreateGroupButton kind={kind} />
      </div>

      <GroupFilters config={cfg} action={getPathname({ href: cfg.path, locale })} filters={filters} />

      <h2 className="text-lg font-semibold text-fg">
        {filters.query ? t('web.listing.search_results', { query: filters.query }) : t(`web.group.upcoming_${kind}`)}
      </h2>

      {page.items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title={t('group.list.empty_filter_title')}
            description={t('group.list.empty_filter_body')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild variant="outline">
                  <Link href={cfg.path}>{t('common.actions.clear_filter')}</Link>
                </Button>
                <CreateGroupButton kind={kind} />
              </div>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title={t(`group.list.empty_title_${kind}`)}
            description={t(`group.list.empty_body_${kind}`)}
            action={<CreateGroupButton kind={kind} />}
          />
        )
      ) : (
        <div className="flex flex-col gap-3">
          <GroupGrid items={page.items} now={now} />
          <GroupLoadMore kind={kind} filters={filters} pageSize={GROUP_PAGE_SIZE} initialCursor={page.nextCursor} />
        </div>
      )}
    </>
  );
}

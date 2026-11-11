// Trang danh sách dùng chung cho 2 tính năng Group (/ghep-xe, /ghep-tran). Khác biệt theo tính năng chỉ đến từ config.ts.
// Style Stitch "Ghép xe về quê & Đi làm ca" (khớp GroupBrowser của app):
//   1 header xanh (HeaderDecor như trang tin / trang chủ; tràn mép + bo đáy trên điện thoại, khối bo xl từ 640px): ô icon dịch
//     vụ, H1 + dòng phụ (group.list.subtitle_<kind>), nút Tạo chuyến / Tạo kèo; ô tìm nổi bên trong (GroupSearchForm).
//   2 hàng chip (GroupChips): khoảng giờ + "cả nhóm đã đủ người" · loại con.
//   3 mẹo an toàn riêng tính năng (group.detail.tip_<kind>) khi chưa lọc → tiêu đề có vạch cam → lưới thẻ chuyến.
// Khác Stitch (cố ý): không đếm "45+ chuyến" (phân trang cursor, không có tổng), không ô điểm đón / ca riêng, không banner
// "Tạo chuyến" thứ hai (nút Tạo đã ở header).
// Render (Cache Components) giống ListingListPage:
// - Fallback của <Suspense> = trang đầu KHÔNG lọc (dữ liệu cache 60s) → nằm trong static shell: HTML có nhóm thật ngay cả
//   khi tắt JS hoặc với bot chỉ đọc HTML (không phải skeleton).
// - Phần đọc searchParams (bộ lọc, kết quả lọc) chạy theo request trong <Suspense> và thay fallback khi xong.
// - "Xem thêm" đọc trang tiếp ở trình duyệt.
import type { GroupKind } from '@hp/shared';
import { SearchX } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { HeaderDecor } from '@/components/shared/header-decor';
import { Button } from '@/components/ui/button';
import { BarHeading, SafetyTip } from '@/features/listing/components/safety-tip';
import { asLocale } from '@/features/listing/display';
import { getPathname, Link } from '@/i18n/navigation';
import { type GroupFilterState, groupFilterCount, NO_GROUP_FILTERS, parseGroupFilters } from '../filters';
import { GROUP_FEATURE_CONFIGS } from '../features';
import { GROUP_PAGE_SIZE, getGroupListPage } from '../queries';
import { CreateGroupButton } from './create-group-button';
import { GroupGrid } from './group-card';
import { GroupChips, GroupSearchForm } from './group-filters';
import { GroupLoadMore } from './group-load-more';

type RawParams = Record<string, string | string[] | undefined>;

export function GroupListPage({ kind, searchParams }: { kind: GroupKind; searchParams: Promise<RawParams> }) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-6 sm:px-4 sm:pt-6">
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
      <div className="relative overflow-hidden rounded-b-xl bg-primary text-on-primary sm:rounded-xl">
        <HeaderDecor />
        <div className="relative flex flex-col gap-4 px-4 pt-4 pb-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-md ${cfg.tone.soft}`}>
              <cfg.Icon strokeWidth={1.75} className={`size-6 ${cfg.tone.fg}`} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 className="text-xl font-bold sm:text-2xl">{t(`group.list.title_${kind}`)}</h1>
              <p className="line-clamp-2 text-sm text-on-primary/90 sm:text-md">{t(`group.list.subtitle_${kind}`)}</p>
            </div>
            <div className="hidden shrink-0 sm:block">
              <CreateGroupButton kind={kind} />
            </div>
          </div>
          <GroupSearchForm config={cfg} action={getPathname({ href: cfg.path, locale })} filters={filters} />
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 sm:px-0">
        <GroupChips config={cfg} filters={filters} />

        {!filtered ? <SafetyTip title={t('listing.tip.title')} text={t(`group.detail.tip_${kind}`)} /> : null}

        <div className="flex items-center justify-between gap-3">
          <BarHeading>
            {filters.query ? t('web.listing.search_results', { query: filters.query }) : t(`group.list.upcoming_${kind}`)}
          </BarHeading>
          <div className="sm:hidden">
            <CreateGroupButton kind={kind} />
          </div>
        </div>

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
              icon={cfg.Icon}
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
      </div>
    </>
  );
}

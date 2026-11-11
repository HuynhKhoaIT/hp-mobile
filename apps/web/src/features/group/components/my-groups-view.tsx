// "Nhóm của tôi" (/toi/nhom-cua-toi?tab=upcoming|past) — style Stitch "Nhóm của tôi (MyGroups)", khớp màn MyGroups của app:
//   header xanh (MyGroupsHero: HeaderDecor; tràn mép + bo đáy trên điện thoại, khối bo xl từ 640px) có H1 + dòng phụ + nút cam
//   "Tạo nhóm" (CreateGroupMenu: Tạo chuyến / Tạo kèo) → hàng chip tab đặc (link `?tab=` — chạy khi tắt JS, giống chip "Tin
//   của tôi") → tab Sắp tới: mẹo an toàn (SafetyTip) → tiêu đề có vạch cam (Đã qua: kèm dòng nhắc chấm điểm chủ nhóm) → lưới
//   thẻ (MyGroupItem: GroupCard + badge vai trò + Đánh giá). Trang đầu đọc theo request (cookie phiên — trong <Suspense> của
//   page) bằng listMyGroups (@hp/core, view my_groups), "Xem thêm" đọc trang sau ở trình duyệt. Sắp tới = còn mở / đủ người /
//   đang diễn ra (sớm nhất trước); Đã qua = đã xong / đã huỷ (mới nhất trước). Gồm nhóm mình tạo, đã được nhận và đang chờ
//   duyệt. Rỗng: CTA tìm chuyến xe / tìm kèo.
// Khác Stitch (cố ý): không ô tìm và không số trên chip (listMyGroups không lọc theo chữ, không trả tổng); không tab "Nhóm tôi
// quản lý" (view không lọc theo vai trò — badge "Bạn tạo" thay thế), "Gợi ý tham gia" / "Gợi ý quanh vị trí bạn làm việc"
// (chưa có RPC gợi ý); không ảnh bìa, số thành viên / bài mới / chuyến mỗi ngày (không có dữ liệu — thẻ dùng GroupCard chung);
// không nút "Vào nhóm" (cả thẻ là link tới nhóm); không banner "Mở nhóm" (nhóm luôn công khai; "Tạo nhóm" ở header).
import type { MyGroupsTab } from '@hp/core';
import { Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { HeaderDecor } from '@/components/shared/header-decor';
import { Button } from '@/components/ui/button';
import { BarHeading, SafetyTip } from '@/features/listing/components/safety-tip';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getMyGroupsPage } from '../queries';
import { CreateGroupMenu } from './create-group-menu';
import { GroupCardSkeleton } from './group-card';
import { MY_GROUP_GRID_CLASS, MyGroupItem } from './my-group-item';
import { MyGroupsMore } from './my-groups-more';

export const MY_GROUP_TABS: readonly MyGroupsTab[] = ['upcoming', 'past'];

type RawParams = Record<string, string | string[] | undefined>;

export function parseMyGroupsTab(raw: RawParams): MyGroupsTab {
  const v = Array.isArray(raw.tab) ? raw.tab[0] : raw.tab;
  return (MY_GROUP_TABS as readonly string[]).includes(v ?? '') ? (v as MyGroupsTab) : 'upcoming';
}

/** Header xanh của trang: H1 + dòng phụ + nút "Tạo nhóm". */
export async function MyGroupsHero() {
  const t = await getTranslations('group.mine');
  return (
    <div className="relative overflow-hidden rounded-b-xl bg-primary text-on-primary sm:rounded-xl">
      <HeaderDecor />
      <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-5 sm:p-6">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="text-xl font-bold sm:text-2xl">{t('title')}</h1>
          <p className="line-clamp-2 text-sm text-on-primary/90 sm:text-md">{t('subtitle')}</p>
        </div>
        <CreateGroupMenu />
      </div>
    </div>
  );
}

const CHIP =
  'inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50';

/** Hàng chip tab (link `?tab=`, giống chip "Tin của tôi"); `current = null` khi chưa đọc searchParams (fallback Suspense). */
export async function MyGroupsTabs({ current }: { current: MyGroupsTab | null }) {
  const t = await getTranslations('group.mine');
  return (
    <nav aria-label={t('title')} className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-2 py-0.5">
        {MY_GROUP_TABS.map((tab) => (
          <li key={tab} className="flex">
            <Link
              href={{ pathname: '/toi/nhom-cua-toi', query: { tab } }}
              aria-current={current === tab ? 'page' : undefined}
              className={cn(
                CHIP,
                current === tab
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              {t(`tab_${tab}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export async function MyGroupsView({ searchParams }: { searchParams: Promise<RawParams> }) {
  const tab = parseMyGroupsTab(await searchParams);
  const t = await getTranslations();
  const { result, now } = await getMyGroupsPage(tab);

  let body;
  if (result.error) {
    body = (
      <EmptyState
        title={t('common.states.error_title')}
        description={t.has(`errors.${result.error.code}`) ? t(`errors.${result.error.code}`) : t('errors.unknown')}
        action={
          <Button asChild variant="outline">
            <Link href={{ pathname: '/toi/nhom-cua-toi', query: { tab } }}>{t('common.actions.retry')}</Link>
          </Button>
        }
      />
    );
  } else if (result.data.items.length === 0) {
    body = (
      <EmptyState
        icon={Users}
        title={t(`group.mine.empty_${tab}_title`)}
        description={t(`group.mine.empty_${tab}_body`)}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/ghep-xe">{t('group.mine.find_ride')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ghep-tran">{t('group.mine.find_sport')}</Link>
            </Button>
          </div>
        }
      />
    );
  } else {
    body = (
      <div className="flex flex-col gap-4">
        {tab === 'upcoming' ? <SafetyTip title={t('listing.tip.title')} text={t('group.detail.safety_tip')} /> : null}
        <div className="flex flex-col gap-1">
          <BarHeading>{t(`group.mine.section_${tab}`)}</BarHeading>
          {tab === 'past' ? <p className="text-sm text-muted">{t('group.mine.section_past_hint')}</p> : null}
        </div>
        <ul className={MY_GROUP_GRID_CLASS}>
          {result.data.items.map((g) => (
            <li key={g.id} className="flex flex-col">
              <MyGroupItem group={g} now={now} />
            </li>
          ))}
        </ul>
        <MyGroupsMore key={tab} tab={tab} initialCursor={result.data.nextCursor} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MyGroupsTabs current={tab} />
      {body}
    </div>
  );
}

export function MyGroupsSkeleton() {
  return (
    <div className={MY_GROUP_GRID_CLASS}>
      {Array.from({ length: 4 }, (_, i) => (
        <GroupCardSkeleton key={i} />
      ))}
    </div>
  );
}

// "Tin của tôi" (/toi/tin-cua-toi?tab=active|pending|draft|closed), style Stitch: hàng chip trạng thái có số (link `?tab=` —
// chạy khi tắt JS; số đọc ở trình duyệt, MyListingChips) rồi các thẻ quản lý (MyListingRow: ảnh + badge nổi, giá, hàng thao
// tác nhanh). Danh sách đọc theo request (cookie phiên — trong <Suspense> của page), "Xem thêm" đọc trang sau ở trình duyệt.
// Tab "Chờ duyệt" gồm cả tin bị từ chối, "Đã đóng" gồm đã bán / đã đóng / hết hạn (listMyListings của @hp/core).
import type { MyListingsTab } from '@hp/core';
import { FileText, Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { MY_LISTING_TABS } from '../manage';
import { getMyListingsPage } from '../queries';
import { MyListingChips } from './my-listing-chips';
import { MyListingRow, MyListingSkeletonRows } from './my-listing-row';
import { MyListingsMore } from './my-listings-more';

type RawParams = Record<string, string | string[] | undefined>;

export function parseTab(raw: RawParams): MyListingsTab {
  const v = Array.isArray(raw.tab) ? raw.tab[0] : raw.tab;
  return (MY_LISTING_TABS as readonly string[]).includes(v ?? '') ? (v as MyListingsTab) : 'active';
}

/** Hàng chip (link `?tab=`); `current = null` khi chưa đọc searchParams (fallback Suspense). */
export function MyListingsTabs({ current }: { current: MyListingsTab | null }) {
  return <MyListingChips current={current} />;
}

export async function MyListingsView({ searchParams }: { searchParams: Promise<RawParams> }) {
  const tab = parseTab(await searchParams);
  const t = await getTranslations();
  const { result, now } = await getMyListingsPage(tab);

  return (
    <div className="flex flex-col gap-4">
      <MyListingsTabs current={tab} />
      {result.error ? (
        <EmptyState
          title={t('common.states.error_title')}
          description={t.has(`errors.${result.error.code}`) ? t(`errors.${result.error.code}`) : t('errors.unknown')}
          action={
            <Button asChild variant="outline">
              <Link href={{ pathname: '/toi/tin-cua-toi', query: { tab } }}>{t('common.actions.retry')}</Link>
            </Button>
          }
        />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('listing.manage.empty_title')}
          description={t('listing.manage.empty_body')}
          action={
            <Button asChild variant="accent" className="font-semibold">
              <Link href="/dang-tin">
                <Plus aria-hidden strokeWidth={2} />
                {t('listing.list.post_cta')}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-3">
            {result.data.items.map((l) => (
              <li key={l.id}>
                <MyListingRow listing={l} now={now} />
              </li>
            ))}
          </ul>
          <MyListingsMore key={tab} tab={tab} initialCursor={result.data.nextCursor} />
        </div>
      )}
    </div>
  );
}

export function MyListingsSkeletonRows() {
  return <MyListingSkeletonRows />;
}

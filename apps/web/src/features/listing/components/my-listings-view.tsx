// "Tin của tôi" (/toi/tin-cua-toi?tab=active|pending|draft|closed): tab là link (chạy khi tắt JS), danh sách đọc theo request
// (cookie phiên — trong <Suspense> của page), "Xem thêm" đọc trang sau ở trình duyệt. Tab "Chờ duyệt" gồm cả tin bị từ chối,
// "Đã đóng" gồm đã bán / đã đóng / hết hạn (listMyListings của @hp/core).
import type { MyListingsTab } from '@hp/core';
import { FileText } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getMyListingsPage } from '../queries';
import { MyListingRow } from './my-listing-row';
import { MyListingsMore } from './my-listings-more';

export const MY_LISTING_TABS: readonly MyListingsTab[] = ['active', 'pending', 'draft', 'closed'];

type RawParams = Record<string, string | string[] | undefined>;

export function parseTab(raw: RawParams): MyListingsTab {
  const v = Array.isArray(raw.tab) ? raw.tab[0] : raw.tab;
  return (MY_LISTING_TABS as readonly string[]).includes(v ?? '') ? (v as MyListingsTab) : 'active';
}

export async function MyListingsTabs({ current }: { current: MyListingsTab | null }) {
  const t = await getTranslations('listing.manage');
  return (
    <nav aria-label={t('title')} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 border-b border-border">
        {MY_LISTING_TABS.map((tab) => (
          <li key={tab}>
            <Link
              href={{ pathname: '/toi/tin-cua-toi', query: { tab } }}
              aria-current={current === tab ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center border-b-2 px-3 text-md font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                current === tab ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg',
              )}
            >
              {t(`tab.${tab}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
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
            <Button asChild variant="accent">
              <Link href="/dang-tin">{t('listing.list.post_cta')}</Link>
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
  return (
    <ul className="flex flex-col gap-3">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="flex gap-3 rounded-md bg-surface p-3 shadow-card">
          <Skeleton className="aspect-avatar w-20 shrink-0 rounded-sm sm:w-24" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-6 w-1/3 rounded-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

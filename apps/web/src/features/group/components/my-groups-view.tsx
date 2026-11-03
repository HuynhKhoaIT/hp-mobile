// "Nhóm của tôi" (/toi/nhom-cua-toi?tab=upcoming|past) — cùng cách "Tin của tôi": tab là link (chạy khi tắt JS), trang đầu
// đọc theo request (cookie phiên — trong <Suspense> của page) bằng listMyGroups (@hp/core, view my_groups), "Xem thêm" đọc
// trang sau ở trình duyệt. Sắp tới = còn mở / đủ người / đang diễn ra (sớm nhất trước); Đã qua = đã xong / đã huỷ (mới nhất
// trước). Gồm nhóm mình tạo, đã được nhận và đang chờ duyệt. Rỗng: CTA tìm chuyến xe / tìm kèo.
import type { MyGroupsTab } from '@hp/core';
import { Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getMyGroupsPage } from '../queries';
import { GroupCardSkeleton } from './group-card';
import { MY_GROUP_GRID_CLASS, MyGroupItem } from './my-group-item';
import { MyGroupsMore } from './my-groups-more';

export const MY_GROUP_TABS: readonly MyGroupsTab[] = ['upcoming', 'past'];

type RawParams = Record<string, string | string[] | undefined>;

export function parseMyGroupsTab(raw: RawParams): MyGroupsTab {
  const v = Array.isArray(raw.tab) ? raw.tab[0] : raw.tab;
  return (MY_GROUP_TABS as readonly string[]).includes(v ?? '') ? (v as MyGroupsTab) : 'upcoming';
}

export async function MyGroupsTabs({ current }: { current: MyGroupsTab | null }) {
  const t = await getTranslations('group.mine');
  return (
    <nav aria-label={t('title')} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 border-b border-border">
        {MY_GROUP_TABS.map((tab) => (
          <li key={tab}>
            <Link
              href={{ pathname: '/toi/nhom-cua-toi', query: { tab } }}
              aria-current={current === tab ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center border-b-2 px-3 text-md font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                current === tab ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg',
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

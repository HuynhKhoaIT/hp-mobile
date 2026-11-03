'use client';

// "Xem thêm" của Nhóm của tôi: trang sau đọc ở trình duyệt bằng listMyGroups (@hp/core) với createBrowserClient() —
// cùng cách MyListingsMore. Trùng id (nhóm đổi giờ giữa hai lần tải) → bỏ.
import { listMyGroups, type MyGroup, type MyGroupsTab } from '@hp/core';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import { GroupCardSkeleton } from './group-card';
import { MY_GROUP_GRID_CLASS, MyGroupItem } from './my-group-item';

const PAGE_SIZE = 20;

export function MyGroupsMore({ tab, initialCursor }: { tab: MyGroupsTab; initialCursor: string | null }) {
  const t = useTranslations('listing.list');
  const [items, setItems] = useState<MyGroup[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [cursor, setCursor] = useState(initialCursor);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState('unknown');

  const load = async () => {
    if (!cursor) return;
    setStatus('loading');
    const res = await listMyGroups(createBrowserClient(), { tab, cursor, limit: PAGE_SIZE });
    if (res.error) {
      setErrorCode(res.error.code);
      setStatus('error');
      return;
    }
    setItems((prev) => {
      const seen = new Set(prev.map((g) => g.id));
      return [...prev, ...res.data.items.filter((g) => !seen.has(g.id))];
    });
    setCursor(res.data.nextCursor);
    setFetchedAt(Date.now());
    setStatus('idle');
  };

  if (!cursor && items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 ? (
        <ul className={MY_GROUP_GRID_CLASS}>
          {items.map((g) => (
            <li key={g.id} className="flex flex-col">
              <MyGroupItem group={g} now={fetchedAt} />
            </li>
          ))}
        </ul>
      ) : null}
      {status === 'loading' ? (
        <div className={MY_GROUP_GRID_CLASS}>
          <GroupCardSkeleton />
          <GroupCardSkeleton />
          <p role="status" className="sr-only">
            {t('loading_more')}
          </p>
        </div>
      ) : null}
      {status === 'error' ? <ErrorState code={errorCode} onRetry={() => void load()} /> : null}
      {cursor && status === 'idle' ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="lg" onClick={() => void load()}>
            {t('load_more')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

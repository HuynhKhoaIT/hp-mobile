'use client';

// "Xem thêm" nhóm: trang đầu đã server render (SEO, tắt JS vẫn đọc được); các trang sau đọc ở trình duyệt bằng
// searchGroups (@hp/core) với con trỏ nextCursor "starts_at|id" — giống LoadMore của tin. Hết trang → "Bạn đã xem hết".
import { type PublicGroup, searchGroups } from '@hp/core';
import type { GroupKind } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import { type GroupFilterState, toGroupFilters } from '../filters';
import { GroupGrid, GroupGridSkeleton } from './group-card';

type Props = {
  kind: GroupKind;
  filters: GroupFilterState;
  pageSize: number;
  initialCursor: string | null;
};

export function GroupLoadMore({ kind, filters, pageSize, initialCursor }: Props) {
  const t = useTranslations('group.list');
  const [items, setItems] = useState<PublicGroup[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [cursor, setCursor] = useState(initialCursor);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState<string>('unknown');

  const load = async () => {
    if (!cursor) return;
    setStatus('loading');
    const res = await searchGroups(createBrowserClient(), { kind, ...toGroupFilters(filters), cursor, limit: pageSize });
    if (res.error) {
      setErrorCode(res.error.code);
      setStatus('error');
      return;
    }
    // Nhóm mới tạo giữa hai lần tải có thể trùng: bỏ id đã có.
    setItems((prev) => {
      const seen = new Set(prev.map((g) => g.id));
      return [...prev, ...res.data.items.filter((g) => !seen.has(g.id))];
    });
    setCursor(res.data.nextCursor);
    setFetchedAt(Date.now());
    setStatus('idle');
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 ? <GroupGrid items={items} now={fetchedAt} /> : null}
      {status === 'loading' ? (
        <>
          <GroupGridSkeleton count={3} />
          <p role="status" className="sr-only">
            {t('loading_more')}
          </p>
        </>
      ) : null}
      {status === 'error' ? <ErrorState code={errorCode} onRetry={() => void load()} /> : null}
      {status === 'idle' && cursor ? (
        <div className="flex justify-center pt-3">
          <Button variant="outline" size="lg" onClick={() => void load()}>
            {t('load_more')}
          </Button>
        </div>
      ) : null}
      {!cursor ? <p className="py-6 text-center text-sm text-muted">{t('end')}</p> : null}
    </div>
  );
}

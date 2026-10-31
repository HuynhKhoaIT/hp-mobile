'use client';

// "Xem thêm" của Tin của tôi: trang sau đọc ở trình duyệt bằng listMyListings (@hp/core) với createBrowserClient()
// (cùng cách LoadMore của danh sách công khai — web chưa có TanStack Query).
import { listMyListings, type MyListing, type MyListingsTab } from '@hp/core';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import { MyListingRow } from './my-listing-row';

export function MyListingsMore({ tab, initialCursor }: { tab: MyListingsTab; initialCursor: string | null }) {
  const t = useTranslations('listing.list');
  const [items, setItems] = useState<MyListing[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [cursor, setCursor] = useState(initialCursor);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState('unknown');

  const load = async () => {
    if (!cursor) return;
    setStatus('loading');
    const res = await listMyListings(createBrowserClient(), { tab, cursor, limit: 20 });
    if (res.error) {
      setErrorCode(res.error.code);
      setStatus('error');
      return;
    }
    setItems((prev) => {
      const seen = new Set(prev.map((l) => l.id));
      return [...prev, ...res.data.items.filter((l) => !seen.has(l.id))];
    });
    setCursor(res.data.nextCursor);
    setFetchedAt(Date.now());
    setStatus('idle');
  };

  if (!cursor && items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((l) => (
            <li key={l.id}>
              <MyListingRow listing={l} now={fetchedAt} />
            </li>
          ))}
        </ul>
      ) : null}
      {status === 'error' ? <ErrorState code={errorCode} onRetry={() => void load()} /> : null}
      {cursor && status !== 'error' ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="lg" disabled={status === 'loading'} onClick={() => void load()}>
            {status === 'loading' ? t('loading_more') : t('load_more')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

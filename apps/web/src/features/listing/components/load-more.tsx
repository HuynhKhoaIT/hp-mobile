'use client';

// "Xem thêm": trang đầu đã server render (SEO, tắt JS vẫn đọc được); các trang sau đọc ở trình duyệt bằng
// searchListings (@hp/core) với con trỏ nextCursor. Web chưa có TanStack Query (thêm thư viện cần hỏi) nên gọi hàm thuần
// với createBrowserClient(), giống onboarding-form. Hết trang → dòng "Bạn đã xem hết tin".
import { type PublicListing, searchListings } from '@hp/core';
import type { ListingCategory } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { ListingGridSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import type { AttributeFilter } from '../filters';
import { ListingGrid } from './listing-grid';

type Props = {
  categories: readonly ListingCategory[];
  query: string;
  site: string | null;
  attributes: AttributeFilter;
  pageSize: number;
  initialCursor: string | null;
  layout: 'grid' | 'row';
};

export function LoadMore({ categories, query, site, attributes, pageSize, initialCursor, layout }: Props) {
  const t = useTranslations('listing.list');
  const [items, setItems] = useState<PublicListing[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [cursor, setCursor] = useState(initialCursor);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState<string>('unknown');

  const load = async () => {
    if (!cursor) return;
    setStatus('loading');
    const res = await searchListings(createBrowserClient(), {
      categories: [...categories],
      query: query || undefined,
      site: site ?? undefined,
      attributes: Object.keys(attributes).length > 0 ? { ...attributes } : undefined,
      cursor,
      limit: pageSize,
    });
    if (res.error) {
      setErrorCode(res.error.code);
      setStatus('error');
      return;
    }
    // Tin mới đăng giữa hai lần tải có thể trùng: bỏ id đã có.
    setItems((prev) => {
      const seen = new Set(prev.map((l) => l.id));
      return [...prev, ...res.data.items.filter((l) => !seen.has(l.id))];
    });
    setCursor(res.data.nextCursor);
    setFetchedAt(Date.now());
    setStatus('idle');
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 ? <ListingGrid items={items} now={fetchedAt} layout={layout} /> : null}
      {status === 'loading' ? (
        <>
          <ListingGridSkeleton count={4} layout={layout} />
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

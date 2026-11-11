'use client';

// "Xem thêm" tin đang đăng ở hồ sơ công khai: trang đầu đã render ở server (PublicProfileSections); trang sau đọc ở trình
// duyệt bằng listListingsByOwner (@hp/core, view public_listings) với con trỏ nextCursor — cùng khuôn LoadMore của danh sách
// tin (features/listing/components/load-more.tsx). Lỗi → ErrorState có Thử lại; hết trang → dòng "Bạn đã xem hết tin".
import { listListingsByOwner, type PublicListing } from '@hp/core';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { ListingGridSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { ListingGrid } from '@/features/listing/components/listing-grid';
import { createBrowserClient } from '@/lib/supabase/client';

export function PublicProfileMore({
  ownerId,
  pageSize,
  initialCursor,
}: {
  ownerId: string;
  pageSize: number;
  initialCursor: string;
}) {
  const t = useTranslations('listing.list');
  const [items, setItems] = useState<PublicListing[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorCode, setErrorCode] = useState('unknown');

  const load = async () => {
    if (!cursor) return;
    setStatus('loading');
    const res = await listListingsByOwner(createBrowserClient(), { ownerId, cursor, limit: pageSize });
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

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 ? <ListingGrid items={items} now={fetchedAt} /> : null}
      {status === 'loading' ? (
        <>
          <ListingGridSkeleton count={4} />
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

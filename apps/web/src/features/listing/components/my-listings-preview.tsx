'use client';

// Khối "Tin của tôi" trong trang "Tôi" (style Stitch "Quản lý tin đăng"): tiêu đề vạch cam + "Xem tất cả", hàng chip
// trạng thái chọn tại chỗ (số từ useMyListingStats), tối đa 3 thẻ quản lý của tab đang chọn (useMyListings — hook chung
// @hp/core/react, cùng khoá với app; thao tác trên thẻ làm mới khoá myListings()). Đọc ở trình duyệt: trang /toi giữ
// phần khung prerender, đổi tab không tải lại cả trang. Đang tải → skeleton đúng hình; lỗi → khối lỗi + Thử lại;
// rỗng → empty gọn có CTA Đăng tin.
import type { MyListingsTab } from '@hp/core';
import { useMyListings } from '@hp/core/react';
import { ChevronRight, FileText, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SectionError } from '@/features/home/components/section-error';
import { Link } from '@/i18n/navigation';
import { MyListingChips } from './my-listing-chips';
import { MyListingRow, MyListingSkeletonRows } from './my-listing-row';

const PREVIEW = 3;

export function MyListingsPreview() {
  const t = useTranslations();
  const [tab, setTab] = useState<MyListingsTab>('active');
  const query = useMyListings(tab);
  const items = query.items.slice(0, PREVIEW);
  const more = query.items.length > PREVIEW || query.hasNextPage;
  const allHref = { pathname: '/toi/tin-cua-toi', query: { tab } };

  return (
    <section aria-labelledby="me-listings" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="me-listings" className="flex items-center gap-2 text-lg font-bold text-fg">
          <span aria-hidden className="h-4 w-1.5 shrink-0 rounded-full bg-accent" />
          {t('listing.manage.title')}
        </h2>
        <Link
          href={allHref}
          className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md px-2 text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t('common.home.see_all')}
          <ChevronRight aria-hidden strokeWidth={1.75} className="size-4" />
        </Link>
      </div>

      <MyListingChips current={tab} onSelect={setTab} />

      {query.isPending ? (
        <MyListingSkeletonRows count={2} />
      ) : query.isError ? (
        <SectionError onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <div role="status" className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-center">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-primary-light text-primary">
            <FileText strokeWidth={1.75} className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-md font-semibold text-fg">{t('listing.manage.empty_title')}</p>
            <p className="text-sm text-muted">{t('listing.manage.empty_body')}</p>
          </div>
          <Button asChild variant="accent" className="font-semibold">
            <Link href="/dang-tin">
              <Plus aria-hidden strokeWidth={2} />
              {t('listing.list.post_cta')}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((l) => (
              <li key={l.id}>
                <MyListingRow listing={l} now={query.dataUpdatedAt} />
              </li>
            ))}
          </ul>
          {more ? (
            <Button asChild variant="outline" className="w-full font-semibold text-primary">
              <Link href={allHref}>
                {t('common.home.see_all')}
                <ChevronRight aria-hidden strokeWidth={1.75} />
              </Link>
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}

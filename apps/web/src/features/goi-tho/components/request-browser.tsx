'use client';

// Trang chủ mini-app Gọi thợ — "Việc quanh bạn": ô tìm theo chữ → hàng chip loại thợ (Tất cả · Điện nước · Vệ sinh · Thợ hàn ·
// Thợ điện lạnh · Khác) → lưới thẻ yêu cầu đang mở (useServiceRequestList: cursor, mới nhất trước) → "Xem thêm". Khách xem được
// (noindex); báo giá / đăng yêu cầu thì đăng nhập. Skeleton đúng hình thẻ → rỗng có CTA (đang lọc: "không có yêu cầu phù hợp")
// → lỗi có Thử lại. Gợi ý cho thợ ở đầu danh sách khi chưa lọc. Khớp màn index của app.
import { useServiceRequestList } from '@hp/core/react';
import { Hammer, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { GOI_THO_PATHS, isServiceTrade, TRADES } from '../trades';
import { RequestCard, RequestCardSkeleton } from './request-card';

export function RequestBrowser() {
  const t = useTranslations('tho');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [trade, setTrade] = useState('');
  const filters = useMemo(
    () => ({ ...(isServiceTrade(trade) ? { trade } : {}), ...(query ? { query } : {}) }),
    [trade, query],
  );
  const list = useServiceRequestList(filters);
  const filtered = !!query || !!trade;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:py-6">
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(input.trim());
        }}
      >
        <label htmlFor="goi-tho-search" className="sr-only">
          {t('list.search_placeholder')}
        </label>
        <Input
          id="goi-tho-search"
          type="search"
          value={input}
          maxLength={100}
          placeholder={t('list.search_placeholder')}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button type="submit" variant="outline" className="shrink-0">
          <Search strokeWidth={1.75} aria-hidden />
          <span className="sr-only">{t('list.search_placeholder')}</span>
        </Button>
      </form>

      <div role="group" aria-label={t('form.trade')} className="no-scrollbar -mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 py-0.5">
          {['', ...TRADES].map((code) => (
            <li key={code || 'all'} className="flex shrink-0">
              <ChoiceChip selected={trade === code} className="whitespace-nowrap" onClick={() => setTrade(code)}>
                {code ? t(`trade.${code}`) : t('list.filter_all')}
              </ChoiceChip>
            </li>
          ))}
        </ul>
      </div>

      {filtered ? null : (
        <p role="note" className="rounded-lg border border-primary/30 bg-primary-light p-3 text-md text-fg">
          {t('home.pro_hint')}
        </p>
      )}

      {list.isLoading ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <RequestCardSkeleton />
            </li>
          ))}
        </ul>
      ) : list.isError && list.items.length === 0 ? (
        <ErrorState code={list.error.code} onRetry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        <EmptyState
          icon={Hammer}
          title={t('list.empty_title')}
          description={t(filtered ? 'list.empty_body' : 'list.empty_body')}
          action={
            <Button asChild>
              <Link href={isServiceTrade(trade) ? { pathname: GOI_THO_PATHS.post, query: { trade } } : GOI_THO_PATHS.post}>{t('list.empty_cta')}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.items.map((r) => (
              <li key={r.id}>
                <RequestCard request={r} />
              </li>
            ))}
          </ul>
          {list.hasNextPage ? (
            <div className="flex justify-center">
              <Button type="button" variant="outline" disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                {t('list.load_more')}
              </Button>
            </div>
          ) : (
            <p className="py-2 text-center text-sm text-muted">{t('list.end')}</p>
          )}
        </>
      )}
    </div>
  );
}

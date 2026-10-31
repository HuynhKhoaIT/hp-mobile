'use client';

// Dải tin cuộn ngang của trang chủ (docs/design/home.md §4.7, §4.8, §10): tiêu đề cao 44 (ô icon 32 + tiêu đề + phụ đề,
// "Xem tất cả ›" bên phải), danh sách cuộn ngang có snap đầu thẻ, mép / scroll-padding 16. Thẻ ListingCard layout grid
// rộng 208 (điện thoại) / 232 (≥ 640) / 5 thẻ một màn (≥ 1024, có nút cuộn trái / phải vì chuột không vuốt ngang được).
// Trạng thái: đang tải → 3 thẻ skeleton (desktop 5); lỗi → khối lỗi + Thử lại; rỗng → `empty` hoặc ẩn cả dải.
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ListingCardSkeleton } from '@/components/shared/skeletons';
import { ListingCard } from '@/features/listing/components/listing-card';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { RailData } from '../types';
import type { Loadable } from '../use-loadable';
import { SectionError } from './section-error';

type Href = ComponentProps<typeof Link>['href'];

export type RailProps = {
  id: string;
  title: string;
  subtitle?: string;
  Icon: LucideIcon;
  /** Nền ô icon + màu icon (class đầy đủ). */
  iconBox: string;
  iconFg: string;
  seeAll: Href;
  state: Loadable<RailData>;
  onRetry: () => void;
  /** Dải rỗng: nội dung thay thế; bỏ trống = ẩn cả dải. */
  empty?: ReactNode;
  /** Số thẻ đầu tải ảnh sớm (dải đầu tiên của trang — LCP). */
  priorityCount?: number;
};

const LIST = cn(
  'no-scrollbar -mx-4 -my-1 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 py-1',
  'lg:mx-0 lg:-mr-3 lg:gap-0 lg:scroll-px-0 lg:px-0',
);
const ITEM = 'flex w-52 shrink-0 snap-start flex-col *:flex-1 sm:w-58 lg:w-1/5 lg:pr-3';

export function ListingRail({ id, title, subtitle, Icon, iconBox, iconFg, seeAll, state, onRetry, empty, priorityCount = 0 }: RailProps) {
  const t = useTranslations();
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  const ready = state.status === 'ready' && state.data.items.length > 0;
  useEffect(() => {
    const el = track.current;
    if (!el || !ready) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [measure, ready]);

  if (state.status === 'idle') return null;
  if (state.status === 'ready' && state.data.items.length === 0 && empty === undefined) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  const headingId = `rail-${id}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center gap-3">
        <span aria-hidden className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', iconBox)}>
          <Icon strokeWidth={1.75} className={cn('size-5', iconFg)} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id={headingId} className="line-clamp-2 text-lg leading-snug font-semibold text-fg">
            {title}
          </h2>
          {subtitle ? <p className="text-sm leading-snug text-muted">{subtitle}</p> : null}
        </div>
        {ready && !(edges.start && edges.end) ? (
          <div className="hidden shrink-0 gap-1 lg:flex">
            <RailArrow label={t('web.home.rail_prev')} disabled={edges.start} onClick={() => scrollBy(-1)} Icon={ChevronLeft} />
            <RailArrow label={t('web.home.rail_next')} disabled={edges.end} onClick={() => scrollBy(1)} Icon={ChevronRight} />
          </div>
        ) : null}
        <Link
          href={seeAll}
          aria-label={t('web.home.see_all_label', { title })}
          className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md pl-2 text-md font-medium whitespace-nowrap text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t('common.home.see_all')}
          <ChevronRight aria-hidden strokeWidth={1.75} className="size-5" />
        </Link>
      </div>

      {state.status === 'loading' ? (
        <ul aria-hidden className={LIST}>
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className={cn(ITEM, i > 2 && 'hidden lg:flex')}>
              <ListingCardSkeleton />
            </li>
          ))}
        </ul>
      ) : state.status === 'error' ? (
        <SectionError onRetry={onRetry} />
      ) : state.data.items.length === 0 ? (
        empty
      ) : (
        <ul ref={track} className={LIST}>
          {state.data.items.map((listing, i) => (
            <li key={listing.id} className={ITEM}>
              <ListingCard listing={listing} layout="grid" now={state.data.now} priority={i < priorityCount} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RailArrow({ label, disabled, onClick, Icon }: { label: string; disabled: boolean; onClick: () => void; Icon: LucideIcon }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full border border-border bg-surface text-fg outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon aria-hidden strokeWidth={1.75} className="size-5" />
    </button>
  );
}

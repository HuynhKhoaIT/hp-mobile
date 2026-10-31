'use client';

// Banner trượt của trang chủ (docs/design/home.md §4.4, §6, §10). Dữ liệu: bảng `banners` (placement web_home) — server
// render sẵn (cache 300s, tag `banners`); server lỗi → tải lại ở trình duyệt, vẫn lỗi → khối lỗi + Thử lại. Rỗng → ẩn khối.
// - Ảnh (bucket `banners`) phủ kín khung 16:7; không ảnh → thẻ chữ theo `tone` (primary / accent / màu dịch vụ).
// - Trượt ngang bằng scroll-snap (vuốt trên điện thoại, kéo trackpad), chấm vị trí, nút trước / sau (desktop, bàn phím).
// - Tự chuyển 5 giây; dừng khi rê chuột / focus bên trong, khi người dùng tự vuốt (dừng hẳn), khi khối ra khỏi màn hình
//   hoặc tab ẩn; tắt khi giảm chuyển động. Có nút dừng / chạy (WCAG 2.2.2).
// - Thẻ chữ: khung 16:7, nội dung dài (tiếng Anh) → thẻ cao thêm thay vì cắt chữ; mọi thẻ cao bằng nhau.
import { type Banner, listBanners } from '@hp/core';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import { bannerImageUrl } from '@/lib/images';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { SERVICE_VISUALS } from '../services';
import { useLoadable } from '../use-loadable';
import { SectionError } from './section-error';

const AUTOPLAY_MS = 5000;

type ToneStyle = { box: string; cta: string; deco: 'circles' | keyof typeof SERVICE_VISUALS };

const PRIMARY: ToneStyle = { box: 'bg-primary text-on-primary', cta: 'bg-surface text-fg', deco: 'circles' };

/** tone (check constraint của bảng banners) → class. Dịch vụ: nền nhạt + chữ fg + icon dịch vụ 64 góc phải dưới. */
const TONES: Record<string, ToneStyle> = {
  primary: PRIMARY,
  accent: { box: 'bg-accent text-on-accent', cta: 'bg-surface text-fg', deco: 'circles' },
  pass: { box: 'bg-service-pass-soft text-fg', cta: 'bg-primary text-on-primary', deco: 'pass' },
  room: { box: 'bg-service-room-soft text-fg', cta: 'bg-primary text-on-primary', deco: 'room' },
  job: { box: 'bg-service-job-soft text-fg', cta: 'bg-primary text-on-primary', deco: 'job' },
  'lost-found': { box: 'bg-service-lost-found-soft text-fg', cta: 'bg-primary text-on-primary', deco: 'lostFound' },
  ride: { box: 'bg-service-ride-soft text-fg', cta: 'bg-primary text-on-primary', deco: 'ride' },
  sport: { box: 'bg-service-sport-soft text-fg', cta: 'bg-primary text-on-primary', deco: 'sport' },
};

const reducedQuery = '(prefers-reduced-motion: reduce)';
function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
/** prefers-reduced-motion (server: false — tự chuyển chỉ bắt đầu sau khi hydrate nên không lệch). */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
}

export function BannerCarousel({ initial, className }: { initial: Banner[] | null; className?: string }) {
  const locale = asLocale(useLocale());
  const load = useCallback(() => listBanners(createBrowserClient(), { placement: 'web_home', locale }), [locale]);
  const [state, retry] = useLoadable(`banners:${locale}`, load, initial ? { key: `banners:${locale}`, data: initial } : null);

  if (state.status === 'loading' || state.status === 'idle') return <BannerSkeleton className={className} />;
  if (state.status === 'error') return <SectionError onRetry={retry} className={className} />;
  if (state.data.length === 0) return null;
  return <Carousel banners={state.data} className={className} />;
}

export function BannerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col', className)}>
      <Skeleton className="aspect-banner w-full rounded-xl" />
      <div className="flex h-8 items-center justify-center gap-1.5" aria-hidden>
        <span className="h-1.5 w-5 rounded-full bg-surface-2" />
        <span className="size-1.5 rounded-full bg-surface-2" />
        <span className="size-1.5 rounded-full bg-surface-2" />
      </div>
    </div>
  );
}

function Carousel({ banners, className }: { banners: Banner[]; className?: string }) {
  const t = useTranslations('common.home.banner');
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  const count = banners.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // nút dừng
  const [hold, setHold] = useState(false); // rê chuột / focus bên trong
  const [touched, setTouched] = useState(false); // người dùng tự vuốt → dừng hẳn
  const [visible, setVisible] = useState(true); // trong màn hình + tab đang mở
  const canAutoplay = count > 1 && !reduced;
  const autoplay = canAutoplay && !paused && !hold && !touched && visible;

  // Vị trí hiện tại theo cuộn (vuốt, nút, tự chuyển đều đi qua scroll).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const slides = Array.from(el.children) as HTMLElement[];
        let best = 0;
        slides.forEach((s, i) => {
          if (Math.abs(s.offsetLeft - el.scrollLeft) < Math.abs((slides[best]?.offsetLeft ?? 0) - el.scrollLeft)) best = i;
        });
        setIndex(best);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Dừng khi khối ra khỏi màn hình / tab ẩn.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let inView = true;
    const update = () => setVisible(inView && document.visibilityState === 'visible');
    const io = new IntersectionObserver(([entry]) => {
      inView = !!entry?.isIntersecting;
      update();
    });
    io.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const el = track.current;
      const slide = el?.children[(i + count) % count] as HTMLElement | undefined;
      if (el && slide) el.scrollTo({ left: slide.offsetLeft, behavior: reduced ? 'auto' : 'smooth' });
    },
    [count, reduced],
  );

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(() => goTo(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [autoplay, goTo, index]);

  return (
    <section
      ref={root}
      aria-roledescription="carousel"
      aria-label={t('label')}
      className={cn('group/banner flex flex-col', className)}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHold(false);
      }}
    >
      <div className="relative">
        <ul
          ref={track}
          onTouchStart={() => setTouched(true)}
          onWheel={(e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setTouched(true);
          }}
          className="no-scrollbar relative flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain rounded-xl"
        >
          {banners.map((banner, i) => (
            <li
              key={banner.id}
              role="group"
              aria-roledescription="slide"
              aria-label={t('slide', { current: i + 1, total: count })}
              className="flex w-full shrink-0 snap-start snap-always"
            >
              <Slide banner={banner} priority={i === 0} />
            </li>
          ))}
        </ul>

        {count > 1 ? (
          <>
            <ArrowButton side="prev" label={t('prev')} onClick={() => goTo(index - 1)} />
            <ArrowButton side="next" label={t('next')} onClick={() => goTo(index + 1)} />
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="relative flex h-8 items-center justify-center">
          <div className="flex items-center gap-1.5" aria-hidden>
            {banners.map((b, i) => (
              <span
                key={b.id}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200 motion-reduce:transition-none',
                  i === index ? 'w-5 bg-primary' : 'w-1.5 bg-border',
                )}
              />
            ))}
          </div>
          {canAutoplay ? (
            <button
              type="button"
              onClick={() => {
                setPaused((p) => !p);
                setTouched(false);
              }}
              aria-label={paused || touched ? t('play') : t('pause')}
              className="absolute right-0 flex size-8 items-center justify-center rounded-full text-muted outline-none transition-colors after:absolute after:-inset-1.5 hover:bg-surface-2 hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {paused || touched ? (
                <Play aria-hidden strokeWidth={1.75} className="size-4" />
              ) : (
                <Pause aria-hidden strokeWidth={1.75} className="size-4" />
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ArrowButton({ side, label, onClick }: { side: 'prev' | 'next'; label: string; onClick: () => void }) {
  const Icon = side === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-fg shadow-card outline-none sm:flex',
        'opacity-0 transition-opacity duration-200 group-hover/banner:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50',
        side === 'prev' ? 'left-3' : 'right-3',
      )}
    >
      <Icon aria-hidden strokeWidth={1.75} className="size-6" />
    </button>
  );
}

/** Link nội bộ (/pass-do, /dang-tin, /tin/...) → điều hướng có locale; https:// → tab mới; khác → không bấm được. */
function SlideLink({ href, className, children }: { href: string | null; className: string; children: ReactNode }) {
  if (href && href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  if (href && href.startsWith('https://')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return <div className={className}>{children}</div>;
}

function Slide({ banner, priority }: { banner: Banner; priority: boolean }) {
  const linkClass =
    'group/slide relative flex w-full flex-col outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/60 rounded-xl';

  if (banner.image_path) {
    return (
      <SlideLink href={banner.link_url} className={cn(linkClass, 'aspect-banner overflow-hidden bg-surface-2')}>
        <Image
          src={bannerImageUrl(banner.image_path)}
          alt={banner.title}
          fill
          unoptimized
          priority={priority}
          sizes="(min-width: 1024px) 760px, 100vw"
          className="object-cover"
        />
      </SlideLink>
    );
  }

  const tone = TONES[banner.tone] ?? PRIMARY;
  const service = tone.deco === 'circles' ? null : SERVICE_VISUALS[tone.deco];
  return (
    <SlideLink href={banner.link_url} className={cn(linkClass, 'aspect-banner justify-between gap-3 p-5 sm:p-8', tone.box)}>
      {/* Trang trí: không chặn bấm, không đọc. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        {service ? (
          <service.Icon strokeWidth={1.5} className={cn('absolute right-5 bottom-5 size-16 opacity-90 sm:right-8 sm:bottom-8 sm:size-24', service.fg)} />
        ) : (
          <>
            <span className="absolute -top-10 -right-8 size-36 rounded-full bg-surface/10 sm:-top-16 sm:-right-12 sm:size-56" />
            <span className="absolute -right-4 -bottom-16 size-44 rounded-full bg-surface/10 sm:-right-8 sm:-bottom-24 sm:size-72" />
          </>
        )}
      </span>
      <span className={cn('relative flex max-w-xl flex-col gap-1 sm:gap-2', service ? 'pr-20 sm:pr-28' : 'pr-8')}>
        <span className="line-clamp-2 text-xl font-bold sm:text-3xl">{banner.title}</span>
        {banner.subtitle ? <span className="line-clamp-2 text-sm opacity-90 sm:text-lg">{banner.subtitle}</span> : null}
      </span>
      {banner.cta_label && banner.link_url ? (
        <span
          className={cn(
            'relative inline-flex h-9 items-center self-start rounded-full px-4 text-sm font-semibold whitespace-nowrap shadow-card transition-transform duration-200 sm:h-11 sm:px-6 sm:text-md',
            'group-hover/slide:-translate-y-0.5 motion-reduce:group-hover/slide:translate-y-0',
            tone.cta,
          )}
        >
          {banner.cta_label}
        </span>
      ) : null}
    </SlideLink>
  );
}

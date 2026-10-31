'use client';

// Gallery ảnh tin: cuộn ngang có snap (vuốt trên điện thoại, chạy cả khi chưa có JS), nút trước / sau + bộ đếm "Ảnh x/y".
// Ảnh đầu `priority` (LCP), khung 4:3 cố định để CLS ≈ 0. Chưa có ảnh: trang chi tiết dùng ListingPlaceholder thay vì component này.
// (embla-carousel có trong danh sách thư viện nhưng chưa cài; CSS scroll-snap đủ cho tuần 3.)
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { listingImageUrl } from '@/lib/images';

export function ListingGallery({ images, title }: { images: string[]; title: string }) {
  const t = useTranslations();
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const total = images.length;

  const go = (to: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(total - 1, to));
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="relative overflow-hidden rounded-lg bg-surface-2">
      <ul
        ref={track}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth motion-reduce:scroll-auto"
      >
        {images.map((path, i) => (
          <li key={path} className="relative aspect-card w-full shrink-0 snap-center">
            <Image
              src={listingImageUrl(path, 'full')}
              alt={total > 1 ? `${title} — ${t('listing.detail.image_count', { current: i + 1, total })}` : title}
              fill
              unoptimized
              priority={i === 0}
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover"
            />
          </li>
        ))}
      </ul>
      {total > 1 ? (
        <>
          <p aria-live="polite" className="absolute right-3 bottom-3 rounded-full bg-fg/70 px-3 py-1 text-sm font-medium text-bg">
            {t('listing.detail.image_count', { current: index + 1, total })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('web.listing.prev_image')}
            disabled={index === 0}
            onClick={() => go(index - 1)}
            className="absolute top-1/2 left-3 hidden -translate-y-1/2 rounded-full sm:inline-flex"
          >
            <ChevronLeft strokeWidth={1.75} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('web.listing.next_image')}
            disabled={index === total - 1}
            onClick={() => go(index + 1)}
            className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-full sm:inline-flex"
          >
            <ChevronRight strokeWidth={1.75} />
          </Button>
        </>
      ) : null}
    </div>
  );
}

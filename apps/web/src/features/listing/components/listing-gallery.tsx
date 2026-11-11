'use client';

// Gallery ảnh tin: cuộn ngang có snap (vuốt trên điện thoại, chạy cả khi chưa có JS), nút trước / sau + bộ đếm "Ảnh x/y".
// Ảnh đầu `priority` (LCP), khung 4:3 cố định để CLS ≈ 0. Chưa có ảnh: trang chi tiết dùng ListingPlaceholder thay vì component này.
// (embla-carousel có trong danh sách thư viện nhưng chưa cài; CSS scroll-snap đủ cho tuần 3.)
// Style Stitch (khớp ImageGallery bleed + thumbnails của app): điện thoại tràn mép (-mx-4, không bo), từ 640px bo lg; bộ đếm có
// icon máy ảnh; ≥ 2 ảnh → hàng ảnh nhỏ size-16 bên dưới, bấm để nhảy tới ảnh (ảnh đang xem viền primary, aria-current).
// Khớp ImageGallery của app: `placeholder` (khung 4:3 khi chưa có ảnh — ListingPlaceholder), `overlayTop` (góc trái trên:
// nhãn tình trạng / xác minh — Badge overlay), `overlayBottom` (góc trái dưới, chừa chỗ bộ đếm: giá trọ trên nền surface/90).
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { type ReactNode, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { listingImageUrl } from '@/lib/images';
import { cn } from '@/lib/utils';

export function ListingGallery({
  images,
  title,
  placeholder,
  overlayTop,
  overlayBottom,
}: {
  images: string[];
  title: string;
  /** Nội dung khung khi chưa có ảnh. */
  placeholder?: ReactNode;
  /** Nhãn phủ góc trái trên ảnh. */
  overlayTop?: ReactNode;
  /** Khối phủ góc trái dưới ảnh (chừa chỗ bộ đếm ảnh bên phải). */
  overlayBottom?: ReactNode;
}) {
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
    <div className="-mx-4 flex flex-col gap-3 sm:mx-0">
      <div className="relative overflow-hidden bg-surface-2 sm:rounded-lg">
        {total === 0 ? <div className="aspect-card w-full">{placeholder}</div> : null}
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
            <p
              aria-live="polite"
              className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-sm font-medium text-fg shadow-card"
            >
              <Camera aria-hidden strokeWidth={1.75} className="size-4 text-muted" />
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
        {overlayTop ? (
          <div className="pointer-events-none absolute top-3 right-3 left-3 flex flex-wrap gap-1.5">{overlayTop}</div>
        ) : null}
        {overlayBottom ? (
          <div className={cn('pointer-events-none absolute bottom-3 left-3', total > 1 ? 'right-28' : 'right-3')}>{overlayBottom}</div>
        ) : null}
      </div>
      {total > 1 ? (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 sm:px-0">
          {images.map((path, i) => (
            <li key={path} className="shrink-0">
              <button
                type="button"
                aria-label={t('listing.detail.image_thumb', { current: i + 1, total })}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => go(i)}
                className={cn(
                  'relative block size-16 overflow-hidden rounded-md border-2 outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50',
                  i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <Image src={listingImageUrl(path, 'thumb')} alt="" fill unoptimized sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

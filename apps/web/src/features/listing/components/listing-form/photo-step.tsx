'use client';

// Bước 1: ảnh. Thêm nhiều ảnh một lần (tổng ≤ MAX_LISTING_IMAGES), xoá, "Đặt làm ảnh bìa" (ảnh đầu = bìa).
// Ảnh mới được nén ngay khi chọn (listing-image.ts) và chỉ upload lúc bấm Đăng / Lưu nháp (cần id tin cho path Storage).
// Pass / trọ: nhắc nên có ảnh (form.photos_required) nhưng không chặn.
import { MAX_LISTING_IMAGES } from '@hp/shared';
import { AlertCircle, ImagePlus, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useId, useRef } from 'react';
import { Badge } from '@/components/shared/badge';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { listingImageUrl } from '@/lib/images';
import type { FormPhoto } from './photos';

export function PhotoStep({
  photos,
  preparing,
  error,
  showRequiredHint,
  disabled,
  onAdd,
  onRemove,
  onCover,
}: {
  photos: FormPhoto[];
  preparing: boolean;
  error: string | null;
  showRequiredHint: boolean;
  disabled: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  onCover: (key: string) => void;
}) {
  const t = useTranslations();
  const errorText = useErrorText();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const full = photos.length >= MAX_LISTING_IMAGES;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-fg">
          {t('listing.form.photos_title')}
        </h2>
        <p className="text-md text-muted">{t('listing.form.photos_hint', { max: MAX_LISTING_IMAGES })}</p>
        {showRequiredHint && photos.length === 0 ? (
          <p className="text-md text-fg" role="note">
            {t('listing.form.photos_required')}
          </p>
        ) : null}
      </div>

      <ul aria-labelledby={`${id}-title`} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {photos.map((photo, index) => {
          const label = t('listing.detail.image_count', { current: index + 1, total: photos.length });
          const src = photo.kind === 'existing' ? listingImageUrl(photo.path, 'thumb') : photo.preview;
          return (
            <li key={photo.key} className="relative aspect-avatar overflow-hidden rounded-md bg-surface-2 shadow-card">
              <Image src={src} alt={label} fill unoptimized sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover" />
              {index === 0 ? <Badge tone="primary" className="absolute top-2 left-2">{t('listing.form.cover')}</Badge> : null}
              {photo.kind === 'new' && photo.failed ? (
                <span className="absolute inset-x-0 top-0 flex items-center gap-1 bg-danger p-1 text-xs font-medium text-on-primary">
                  <AlertCircle aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
                  {t('errors.upload_failed')}
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-fg/40 p-1">
                {index > 0 ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    disabled={disabled}
                    aria-label={`${t('listing.form.make_cover')} (${label})`}
                    onClick={() => onCover(photo.key)}
                  >
                    <Star strokeWidth={1.75} />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  disabled={disabled}
                  aria-label={`${t('listing.form.remove_photo')} (${label})`}
                  onClick={() => onRemove(photo.key)}
                >
                  <Trash2 strokeWidth={1.75} />
                </Button>
              </div>
            </li>
          );
        })}
        {!full ? (
          <li className="aspect-avatar">
            <button
              type="button"
              disabled={disabled || preparing}
              onClick={() => input.current?.click()}
              className="flex size-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-surface text-md font-medium text-primary outline-none transition-colors hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <ImagePlus aria-hidden strokeWidth={1.75} className="size-6" />
              {t('listing.form.add_photo')}
            </button>
          </li>
        ) : null}
      </ul>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          // Cho chọn lại cùng file sau khi lỗi.
          e.target.value = '';
          if (files.length > 0) onAdd(files);
        }}
      />
      <p role="status" aria-live="polite" className="sr-only">
        {preparing ? t('web.post.preparing_photos') : ''}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {errorText(error)}
        </p>
      ) : null}
    </div>
  );
}

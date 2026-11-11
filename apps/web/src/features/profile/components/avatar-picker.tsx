'use client';

// Chọn / đổi ảnh đại diện (onboarding bước 2 và trang /toi) — giống app: chọn ảnh → cắt vuông 512 px → WebP ≤ 1 MB →
// uploadAvatar (@hp/core: upload bucket avatars `{uid}/{ts}.webp` + ghi profiles.avatar_url; RLS / policy Storage quyết định quyền).
// Không bắt buộc: lỗi chỉ hiện dưới nút, không chặn bước tiếp theo.
// `compact` (header hồ sơ ở /toi, style Stitch): chính ảnh 64 px là nút đổi ảnh (viền on-primary, chấm máy ảnh góc trái
// dưới), nhãn đọc màn hình = `label` + trạng thái; lỗi hiện bằng toast (nền xanh của header không đặt được chữ đỏ).
import { uploadAvatar } from '@hp/core';
import { Camera, User } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { profileAvatarUrl } from '@/lib/images';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { prepareAvatar } from '../avatar-image';

export function AvatarPicker({
  userId,
  initialValue,
  label,
  hint,
  onChange,
  compact = false,
  className,
}: {
  userId: string;
  /** profiles.avatar_url hiện tại (path trong bucket avatars hoặc URL Google). */
  initialValue: string | null;
  label: string;
  hint?: string;
  onChange?: (value: string) => void;
  /** Kiểu ảnh-là-nút cho header hồ sơ (/toi). */
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations('auth.onboarding');
  const errorText = useErrorText();
  const toast = useToast();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = profileAvatarUrl(value);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPending(true);
    const prepared = await prepareAvatar(file);
    if (prepared.error) {
      setPending(false);
      setError(prepared.error);
      if (compact) toast.show(errorText(prepared.error), 'error');
      return;
    }
    const result = await uploadAvatar(createBrowserClient(), { userId, body: prepared.data.blob, contentType: prepared.data.contentType });
    setPending(false);
    if (result.error) {
      setError(result.error.code);
      if (compact) toast.show(errorText(result.error.code), 'error');
      return;
    }
    setValue(result.data.avatar_url);
    if (result.data.avatar_url) onChange?.(result.data.avatar_url);
  };

  const fileInput = (
    <input
      ref={input}
      id={`${id}-file`}
      type="file"
      accept="image/*"
      className="sr-only"
      tabIndex={-1}
      aria-labelledby={`${id}-label`}
      onChange={(e) => {
        void pick(e.target.files?.[0]);
        // Cho chọn lại cùng một file sau khi lỗi.
        e.target.value = '';
      }}
    />
  );
  const status = (
    <p role="status" aria-live="polite" className="sr-only">
      {pending ? t('avatar_uploading') : ''}
    </p>
  );

  if (compact) {
    const action = pending ? t('avatar_uploading') : value ? t('avatar_change') : t('avatar_pick');
    return (
      <div className={cn('relative', className)}>
        <span id={`${id}-label`} className="sr-only">
          {label}
        </span>
        {fileInput}
        <button
          type="button"
          disabled={pending}
          aria-label={`${label}: ${action}`}
          onClick={() => input.current?.click()}
          className="group relative flex size-16 items-center justify-center rounded-full bg-on-primary/15 outline-none ring-2 ring-on-primary transition-opacity focus-visible:ring-4 focus-visible:ring-on-primary/60 disabled:opacity-70"
        >
          <span className="relative flex size-full items-center justify-center overflow-hidden rounded-full">
            {src ? (
              <Image src={src} alt="" fill unoptimized sizes="64px" className="object-cover" />
            ) : (
              <User aria-hidden strokeWidth={1.75} className="size-8" />
            )}
          </span>
          <span
            aria-hidden
            className="absolute -bottom-0.5 -left-0.5 flex size-6 items-center justify-center rounded-full bg-surface text-primary shadow-card ring-2 ring-primary group-hover:bg-primary-light"
          >
            <Camera strokeWidth={1.75} className={cn('size-3.5', pending && 'animate-pulse motion-reduce:animate-none')} />
          </span>
        </button>
        {status}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p id={`${id}-label`} className="text-md font-medium text-fg">
        {label}
      </p>
      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-primary-light">
          {src ? (
            <Image src={src} alt="" fill unoptimized sizes="80px" className="object-cover" />
          ) : (
            <span aria-hidden className="flex size-full items-center justify-center text-primary">
              <User strokeWidth={1.75} className="size-10" />
            </span>
          )}
        </div>
        {fileInput}
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onClick={() => input.current?.click()}
        >
          <Camera strokeWidth={1.75} aria-hidden />
          {pending ? t('avatar_uploading') : value ? t('avatar_change') : t('avatar_pick')}
        </Button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {status}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {errorText(error)}
        </p>
      ) : null}
    </div>
  );
}

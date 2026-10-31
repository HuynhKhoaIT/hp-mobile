'use client';

// Chọn / đổi ảnh đại diện (onboarding bước 2 và trang /toi) — giống app: chọn ảnh → cắt vuông 512 px → WebP ≤ 1 MB →
// uploadAvatar (@hp/core: upload bucket avatars `{uid}/{ts}.webp` + ghi profiles.avatar_url; RLS / policy Storage quyết định quyền).
// Không bắt buộc: lỗi chỉ hiện dưới nút, không chặn bước tiếp theo.
import { uploadAvatar } from '@hp/core';
import { Camera, User } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { profileAvatarUrl } from '@/lib/images';
import { createBrowserClient } from '@/lib/supabase/client';
import { prepareAvatar } from '../avatar-image';

export function AvatarPicker({
  userId,
  initialValue,
  label,
  hint,
  onChange,
}: {
  userId: string;
  /** profiles.avatar_url hiện tại (path trong bucket avatars hoặc URL Google). */
  initialValue: string | null;
  label: string;
  hint?: string;
  onChange?: (value: string) => void;
}) {
  const t = useTranslations('auth.onboarding');
  const errorText = useErrorText();
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
      return;
    }
    const result = await uploadAvatar(createBrowserClient(), { userId, body: prepared.data.blob, contentType: prepared.data.contentType });
    setPending(false);
    if (result.error) {
      setError(result.error.code);
      return;
    }
    setValue(result.data.avatar_url);
    if (result.data.avatar_url) onChange?.(result.data.avatar_url);
  };

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
      <p role="status" aria-live="polite" className="sr-only">
        {pending ? t('avatar_uploading') : ''}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {errorText(error)}
        </p>
      ) : null}
    </div>
  );
}

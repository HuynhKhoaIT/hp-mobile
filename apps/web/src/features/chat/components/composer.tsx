'use client';

// Composer — ô nhập đáy khung chat (style Stitch, giống apps/mobile/src/ui/Composer.tsx): thanh nền surface viền trên +
// shadow-bar · nút ảnh · ô chữ viên thuốc (nền surface-2 viền border) nhiều dòng tự cao (tới ~5 dòng, rồi cuộn trong ô) ·
// nút gửi tròn nền accent (cam, icon on-accent, shadow-fab khi gửi được). Enter gửi, Shift + Enter xuống dòng (đang gõ bộ gõ tiếng Việt / Trung → không gửi).
// Nút gửi chỉ bật khi có chữ; vượt giới hạn ký tự → báo đỏ dưới ô (không cắt chữ). `error`: lỗi nội dung (có SĐT, từ thô
// tục) — giữ nguyên chữ để sửa. `disabledText` (đã chặn…) thay cả thanh bằng một dòng giải thích + hành động phụ.
import { ImagePlus, SendHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ComposerProps = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onPickImage?: (file: File) => void;
  maxLength: number;
  error?: string;
  disabledText?: string;
  disabledAction?: { label: string; onClick: () => void; pending?: boolean };
};

export function Composer({ value, onChange, onSend, onPickImage, maxLength, error, disabledText, disabledAction }: ComposerProps) {
  const t = useTranslations();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const errorId = useId();
  const tooLong = value.length > maxLength;
  const canSend = value.trim().length > 0 && !tooLong;

  // Tự cao theo nội dung; max-h-32 của CSS chặn trần (sau đó cuộn trong ô).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  if (disabledText) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-border bg-surface px-4 py-3 pb-safe">
        <p className="text-center text-md text-muted">{disabledText}</p>
        {disabledAction ? (
          <Button type="button" variant="outline" size="sm" disabled={disabledAction.pending} onClick={disabledAction.onClick}>
            {disabledAction.label}
          </Button>
        ) : null}
      </div>
    );
  }

  const send = () => {
    if (canSend) onSend();
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-1 border-t border-border bg-surface px-2 py-2 pb-safe shadow-bar">
      <div className="flex items-end gap-1.5">
        {onPickImage ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-primary"
              aria-label={t('chat.thread.attach_image')}
              title={t('chat.thread.attach_image')}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus strokeWidth={1.75} />
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) onPickImage(file);
              }}
            />
          </>
        ) : null}
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            send();
          }}
          placeholder={t('chat.thread.placeholder')}
          aria-label={t('chat.thread.placeholder')}
          aria-describedby={tooLong || error ? `${errorId} ${hintId}` : hintId}
          aria-invalid={tooLong || !!error || undefined}
          className={cn(
            'max-h-32 min-h-11 flex-1 resize-none overflow-y-auto rounded-xl border bg-surface-2 px-4 py-2 text-md text-fg outline-none placeholder:text-disabled',
            'focus-visible:ring-3 focus-visible:ring-ring/30',
            tooLong || error ? 'border-danger' : 'border-border focus-visible:border-primary',
          )}
        />
        <button
          type="button"
          aria-label={t('chat.thread.send')}
          title={t('chat.thread.send')}
          disabled={!canSend}
          onClick={send}
          className={cn(
            'inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent outline-none transition focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 motion-reduce:active:scale-100',
            canSend ? 'shadow-fab hover:opacity-90' : 'opacity-50',
          )}
        >
          <SendHorizontal strokeWidth={1.75} className="size-5" aria-hidden />
        </button>
      </div>
      <p id={hintId} className="sr-only">
        {t('web.chat.composer_hint')}
      </p>
      {tooLong || error ? (
        <p id={errorId} role="alert" className="px-2 text-sm text-danger">
          {tooLong ? t('chat.thread.too_long', { max: maxLength }) : error}
        </p>
      ) : null}
    </div>
  );
}

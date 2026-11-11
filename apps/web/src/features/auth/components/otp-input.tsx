'use client';

// OtpInput — ô mã xác nhận dạng hàng ô số (style Stitch "Nhập mã OTP"), giống app (`src/ui/OtpInput.tsx`). Một <input>
// thật phủ trong suốt lên cả hàng ô → giữ tự điền mã (autocomplete one-time-code), dán cả mã, bàn phím số trên điện
// thoại; các ô chỉ hiển thị (aria-hidden). Ô: flex-1 tối đa w-12, min-h-14, rounded-md, chữ text-2xl đậm primary.
// Trạng thái: đã nhập (viền primary/40), ô đang nhập khi input có focus (viền primary + vòng ring + vạch con trỏ đứng yên),
// trống (viền border), lỗi (viền danger), tắt (mờ 50%). Chữ input 16px để iOS không tự phóng to.
import { type ComponentProps, useState } from 'react';
import { cn } from '@/lib/utils';

export function OtpInput({
  value,
  onValueChange,
  length,
  invalid = false,
  disabled = false,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'maxLength' | 'type'> & {
  value: string;
  /** Chỉ nhận chữ số (đã lọc), tối đa `length`. */
  onValueChange: (digits: string) => void;
  length: number;
  invalid?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const digits = value.slice(0, length);

  return (
    <div className={cn('relative flex justify-center gap-2', disabled && 'opacity-50', className)}>
      {Array.from({ length }, (_, i) => {
        const char = digits[i];
        const active = focused && !disabled && i === digits.length;
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              'flex min-h-14 max-w-12 flex-1 items-center justify-center rounded-md bg-surface text-2xl font-bold shadow-card transition-colors',
              invalid
                ? 'border-2 border-danger text-danger'
                : active
                  ? 'border-2 border-primary ring-3 ring-primary/20'
                  : char
                    ? 'border-2 border-primary/40 text-primary'
                    : 'border border-border',
            )}
          >
            {char ?? (active ? <span className="h-6 w-0.5 rounded-full bg-primary" /> : <span className="size-1.5 rounded-full bg-border" />)}
          </span>
        );
      })}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={length}
        value={digits}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 w-full cursor-text text-md opacity-0 caret-transparent outline-none"
        {...props}
      />
    </div>
  );
}

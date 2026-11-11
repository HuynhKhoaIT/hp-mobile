'use client';

// Chọn 1–5 sao (đánh giá chủ nhóm, đánh giá sau khi trả đồ thất lạc) — khớp StarRating của app.
// Radiogroup đúng chuẩn ARIA: một điểm dừng Tab (roving tabindex), ← / → / ↑ / ↓ đổi số sao, Home / End về 1 / 5; mỗi sao
// có nhãn `starLabel(n)` (vd "3 sao – Bình thường"); nơi gọi hiện chữ mức điểm dưới hàng sao (không chỉ dựa vào màu).
import { Star } from 'lucide-react';
import { type KeyboardEvent, useRef } from 'react';
import { cn } from '@/lib/utils';

const SCORES = [1, 2, 3, 4, 5] as const;

export function StarRatingInput({
  value,
  onChange,
  labelledBy,
  starLabel,
  disabled = false,
}: {
  /** 0 = chưa chọn. */
  value: number;
  onChange: (score: number) => void;
  /** id phần tử đặt tên cho nhóm sao. */
  labelledBy: string;
  starLabel: (score: number) => string;
  disabled?: boolean;
}) {
  const stars = useRef<(HTMLButtonElement | null)[]>([]);

  const pick = (n: number, focus = false) => {
    onChange(n);
    if (focus) stars.current[n - 1]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = value || 1;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? Math.min(5, current + (value ? 1 : 0))
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? Math.max(1, current - 1)
          : e.key === 'Home'
            ? 1
            : e.key === 'End'
              ? 5
              : null;
    if (next === null) return;
    e.preventDefault();
    pick(next, true);
  };

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-required className="flex gap-1" onKeyDown={onKeyDown}>
      {SCORES.map((n) => {
        const checked = value === n;
        const filled = n <= value;
        return (
          <button
            key={n}
            ref={(el) => {
              stars.current[n - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={starLabel(n)}
            tabIndex={checked || (!value && n === 1) ? 0 : -1}
            disabled={disabled}
            onClick={() => pick(n)}
            className="inline-flex size-12 items-center justify-center rounded-md outline-none transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:scale-100"
          >
            <Star aria-hidden strokeWidth={1.75} className={cn('size-8', filled ? 'fill-warning text-warning' : 'text-muted')} />
          </button>
        );
      })}
    </div>
  );
}

'use client';

// Chọn khu trong form lọc (GET). Có JS: đổi là gửi form ngay; tắt JS: người dùng bấm nút Tìm — vẫn lọc được.
// Dùng <select> gốc của trình duyệt (form GET, bàn phím, trình đọc màn hình sẵn có); chưa có Select của shadcn trong dự án.
import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export function SiteSelect({
  sites,
  value,
  label,
  anyLabel,
  className,
}: {
  sites: { code: string; name: string }[];
  value: string | null;
  label: string;
  anyLabel: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        name="site"
        defaultValue={value ?? ''}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="min-h-12 w-full appearance-none rounded-sm border border-border bg-surface pr-10 pl-3 text-md text-fg outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <option value="">{anyLabel}</option>
        {sites.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

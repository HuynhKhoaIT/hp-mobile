'use client';

// Ô chọn trong form lọc (GET): khu làm việc, khoảng cách tới khu. Có JS: đổi là gửi form ngay; tắt JS: người dùng bấm nút
// Tìm — vẫn lọc được. Dùng <select> gốc của trình duyệt (form GET, bàn phím, trình đọc màn hình sẵn có); chưa có Select
// của shadcn trong dự án.
import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export function FilterSelect({
  name,
  options,
  value,
  label,
  anyLabel,
  className,
  selectClassName,
}: {
  /** Tên tham số URL. */
  name: string;
  options: { value: string; label: string }[];
  value: string | null;
  label: string;
  /** Lựa chọn "tất cả" (giá trị rỗng → bỏ tham số). */
  anyLabel: string;
  className?: string;
  /** Ghi đè kiểu ô chọn (vd viên thuốc trên header mini-app). */
  selectClassName?: string;
}) {
  const id = useId();
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value ?? ''}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={cn(
          'min-h-12 w-full appearance-none rounded-sm border border-border bg-surface pr-10 pl-3 text-md text-fg outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30',
          selectClassName,
        )}
      >
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
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

export function SiteSelect({
  sites,
  ...rest
}: {
  sites: { code: string; name: string }[];
  value: string | null;
  label: string;
  anyLabel: string;
  className?: string;
  selectClassName?: string;
}) {
  return <FilterSelect name="site" options={sites.map((s) => ({ value: s.code, label: s.name }))} {...rest} />;
}

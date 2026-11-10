'use client';

// FilterBar — ô tìm + bộ chọn lọc của trang admin. Là form GET thật (tắt JS vẫn lọc được); có JS thì điều hướng
// client (giữ locale), đổi ô chọn là lọc ngay. Bộ lọc nằm trên URL, đổi lọc → về trang 1 (bỏ `page`).
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useTransition } from 'react';
import { SELECT_CLASS } from '@/components/admin/field-styles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import type { Query } from '@/features/admin/lib/params';
import { cn } from '@/lib/utils';

export type FilterField =
  | { type: 'search'; name: string; label: string; placeholder?: string }
  | { type: 'select'; name: string; label: string; allLabel?: string; options: { value: string; label: string }[] }
  | { type: 'date'; name: string; label: string };


export function FilterBar({
  fields,
  values,
  keep = {},
  className,
}: {
  fields: FilterField[];
  /** Giá trị hiện tại (từ searchParams). */
  values: Query;
  /** Tham số giữ nguyên khi lọc (vd `tab`, `sort`). */
  keep?: Query;
  className?: string;
}) {
  const t = useTranslations('admin.filters');
  const id = useId();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const active = fields.some((f) => values[f.name]);

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const query: Query = { ...keep };
    for (const [k, v] of data.entries()) {
      if (typeof v === 'string' && v.trim()) query[k] = v.trim();
    }
    startTransition(() => router.push({ pathname, query }));
  };

  return (
    <form
      method="get"
      role="search"
      aria-label={t('label')}
      aria-busy={pending}
      className={cn('flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-end', className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      {Object.entries(keep).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {fields.map((f) => {
        const fid = `${id}-${f.name}`;
        return (
          <div key={f.name} className={cn('flex min-w-0 flex-col gap-1', f.type === 'search' ? 'sm:min-w-64 sm:flex-1' : 'sm:w-48')}>
            <label htmlFor={fid} className="text-sm font-medium text-muted">
              {f.label}
            </label>
            {f.type === 'search' ? (
              <div className="relative">
                <Search strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
                <Input id={fid} name={f.name} type="search" defaultValue={values[f.name] ?? ''} placeholder={f.placeholder} className="pl-10" />
              </div>
            ) : f.type === 'date' ? (
              <Input id={fid} name={f.name} type="date" defaultValue={values[f.name] ?? ''} onChange={(e) => e.currentTarget.form && submit(e.currentTarget.form)} />
            ) : (
              <select
                id={fid}
                name={f.name}
                defaultValue={values[f.name] ?? ''}
                className={SELECT_CLASS}
                onChange={(e) => e.currentTarget.form && submit(e.currentTarget.form)}
              >
                <option value="">{f.allLabel ?? t('all')}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {t('apply')}
        </Button>
        {active ? (
          <Button asChild variant="ghost">
            <Link href={{ pathname, query: keep }}>
              <X strokeWidth={1.75} aria-hidden />
              {t('clear')}
            </Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

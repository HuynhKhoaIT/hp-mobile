// StatusTabs — tab trạng thái kèm số đếm, toàn bộ là link (bộ lọc trên URL, đổi tab về trang 1). Server / client đều dùng được.
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { hrefWith, type Query } from '@/features/admin/lib/params';
import { cn } from '@/lib/utils';

export type StatusTab = { value: string; label: string; count?: number };

export function StatusTabs({
  basePath,
  query,
  param,
  tabs,
  current,
  defaultValue,
}: {
  basePath: string;
  query: Query;
  /** Tên tham số URL (vd `status`, `tab`). */
  param: string;
  tabs: StatusTab[];
  current: string;
  /** Tab mặc định không ghi lên URL. */
  defaultValue: string;
}) {
  const t = useTranslations('admin.table');
  return (
    <nav aria-label={t('tabs')} className="border-b border-border">
      <ul className="-mb-px flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const active = tab.value === current;
          return (
            <li key={tab.value} className="shrink-0">
              <Link
                href={hrefWith(basePath, query, { [param]: tab.value === defaultValue ? null : tab.value })}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-2 border-b-2 px-3 text-md font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg',
                )}
              >
                {tab.label}
                {tab.count !== undefined ? (
                  <span
                    className={cn(
                      'inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                      active ? 'bg-primary text-on-primary' : 'bg-surface-2 text-muted',
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

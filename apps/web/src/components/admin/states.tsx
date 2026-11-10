// Khối trạng thái dùng chung trang admin: khung trang, skeleton bảng, "chỉ quản trị viên", thẻ số liệu.
import type { LucideIcon } from 'lucide-react';
import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Khung nội dung trang admin (lề, khoảng cách giống /admin/moderation). */
export function AdminPage({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-6 lg:px-8">{children}</div>;
}

/** Skeleton đúng hình: thanh lọc + bảng N dòng. */
export function TableSkeleton({ rows = 8, filters = true }: { rows?: number; filters?: boolean }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {filters ? <Skeleton className="h-24 w-full rounded-md" /> : null}
      <Skeleton className="h-14 w-full rounded-md" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

/** Đầu trang skeleton (loading.tsx). */
export function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-full max-w-xl" />
    </div>
  );
}

/** Moderator mở trang / tab chỉ dành cho admin (server + RLS vẫn chặn; đây chỉ là thông báo rõ ràng). */
export function AdminOnlyState() {
  const t = useTranslations('admin.access');
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface px-4 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-warning/15 text-fg">
        <ShieldAlert className="size-8" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="text-lg font-semibold text-fg">{t('admin_only_title')}</p>
      <p className="max-w-sm text-md text-muted">{t('admin_only_body')}</p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  Icon,
  tone = 'primary',
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  Icon: LucideIcon;
  tone?: 'primary' | 'warning' | 'success' | 'danger' | 'neutral';
  href?: string | { pathname: string; query?: Record<string, string> };
}) {
  const toneClass = {
    primary: 'bg-primary-light text-primary',
    warning: 'bg-warning/15 text-fg',
    success: 'bg-success/15 text-success',
    danger: 'bg-danger/10 text-danger',
    neutral: 'bg-surface-2 text-muted',
  }[tone];
  const body = (
    <>
      <span className="flex items-center gap-3">
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-md', toneClass)}>
          <Icon strokeWidth={1.75} className="size-5" aria-hidden />
        </span>
        <span className="text-md font-medium text-muted">{label}</span>
      </span>
      <span className="text-3xl font-bold text-fg tabular-nums">{value}</span>
      {hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </>
  );
  const cls = 'flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-card';
  return href ? (
    <Link
      href={href}
      className={cn(cls, 'transition-colors duration-150 outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50')}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// Tổng quan (tạm): số tin chờ duyệt / đã duyệt / đã từ chối + lối vào hàng chờ. Thống kê đầy đủ (người dùng mới,
// báo cáo, lượt truy cập — apps/web/CLAUDE.md mục 10) thêm ở bản sau qua RPC admin_stats.
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getPendingCounts } from '../../moderation/queries';

export async function OverviewStats() {
  const t = await getTranslations('admin.overview');
  const counts = await getPendingCounts();
  if (!counts) return <ErrorState />;
  const cards = [
    { key: 'pending', value: counts.pending, Icon: Clock, tone: 'bg-warning/15 text-fg', href: { pathname: '/admin/moderation' as const } },
    {
      key: 'approved',
      value: counts.approved,
      Icon: CheckCircle2,
      tone: 'bg-success/15 text-success',
      href: { pathname: '/admin/moderation' as const, query: { status: 'approved' } },
    },
    {
      key: 'rejected',
      value: counts.rejected,
      Icon: XCircle,
      tone: 'bg-danger/10 text-danger',
      href: { pathname: '/admin/moderation' as const, query: { status: 'rejected' } },
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ key, value, Icon, tone, href }) => (
          <li key={key}>
            <Link
              href={href}
              className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-card transition-colors duration-150 outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex items-center gap-3">
                <span className={cn('flex size-10 items-center justify-center rounded-md', tone)}>
                  <Icon strokeWidth={1.75} className="size-5" aria-hidden />
                </span>
                <span className="text-md font-medium text-muted">{t(key)}</span>
              </span>
              <span className="text-3xl font-bold text-fg tabular-nums">{value}</span>
              {key === 'pending' ? <span className="text-sm text-muted">{t('pending_hint')}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-md text-muted">{t('more_soon')}</p>
        <Button asChild>
          <Link href="/admin/moderation">{t('open_queue')}</Link>
        </Button>
      </div>
    </div>
  );
}

export function OverviewStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-36 w-full rounded-lg" />
      ))}
    </div>
  );
}

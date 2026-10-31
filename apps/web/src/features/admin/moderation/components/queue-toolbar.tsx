// Thanh lọc hàng chờ (server): tab trạng thái kèm số đếm + chip lọc theo lý do. Toàn bộ là link (bộ lọc nằm trên URL,
// chia sẻ / tải lại giữ nguyên); đổi bộ lọc về trang 1.
import { MODERATION_REASONS, MODERATION_STATUSES, type ModerationReason, type ModerationStatus } from '@hp/shared';
import type { ModerationCounts } from '@hp/core';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { queueHref } from '../labels';

export async function QueueToolbar({
  status,
  reason,
  counts,
}: {
  status: ModerationStatus;
  reason: ModerationReason | null;
  counts: ModerationCounts;
}) {
  const t = await getTranslations('admin.moderation');
  const tReason = await getTranslations('listing.manage.reason');
  return (
    <div className="flex flex-col gap-3">
      <nav aria-label={t('tabs_label')} className="border-b border-border">
        <ul className="-mb-px flex gap-1 overflow-x-auto no-scrollbar">
          {MODERATION_STATUSES.map((s) => {
            const active = s === status;
            return (
              <li key={s} className="shrink-0">
                <Link
                  href={queueHref({ status: s, reason })}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-2 border-b-2 px-3 text-md font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg',
                  )}
                >
                  {t(`tabs.${s}`)}
                  <span
                    className={cn(
                      'inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                      active ? 'bg-primary text-on-primary' : 'bg-surface-2 text-muted',
                    )}
                  >
                    {counts[s]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <nav aria-label={t('filter_label')}>
        <ul className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[null, ...MODERATION_REASONS].map((r) => {
            const active = r === reason;
            return (
              <li key={r ?? 'all'} className="shrink-0">
                <Link
                  href={queueHref({ status, reason: r })}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    active ? 'border-primary bg-primary-light text-primary' : 'border-border bg-surface text-fg hover:bg-surface-2',
                  )}
                >
                  {r ? tReason(r) : t('filter_all')}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

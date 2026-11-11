'use client';

// Hộp tóm tắt trong header xanh của /toi/huy-hieu (giống BadgeSummary của app): nền on-primary/15 viền on-primary/20 bo lg —
// "Đã có n/4 huy hiệu" (hoặc "Chưa có…") + viên "n đang chờ duyệt" → thanh 4 vạch (đã có: cam · chờ duyệt: on-primary/60 ·
// chưa: on-primary/25 — trang trí, aria-hidden; chữ đã nói rõ) → dòng gợi ý → viên "Đã xác minh SĐT" khi có huy hiệu phone.
// Dữ liệu riêng → đọc ở trình duyệt (cùng query với BadgeRequestView, TanStack gộp request). Đang tải: khối chờ; lỗi /
// hết phiên: ẩn (thân trang hiện lỗi + thử lại).
import { useMyBadgeRequests, useMyProfile } from '@hp/core/react';
import { Check, Info, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { type BadgeStatus, badgeStates } from './badge-state';

const SEGMENT: Record<BadgeStatus, string> = {
  owned: 'bg-accent',
  pending: 'bg-on-primary/60',
  rejected: 'bg-on-primary/25',
  none: 'bg-on-primary/25',
};

const BOX = 'flex flex-col gap-2 rounded-lg border border-on-primary/20 bg-on-primary/15 p-3';
const PILL = 'inline-flex items-center gap-1 rounded-full bg-on-primary/20 px-2.5 py-0.5 text-sm font-semibold';

export function BadgeSummary() {
  const t = useTranslations();
  const profile = useMyProfile();
  const requests = useMyBadgeRequests();

  if (!profile.isLoading && !profile.userId) return null;
  if (profile.isLoading || requests.isPending) {
    return (
      <div aria-hidden className={BOX}>
        <div className="flex items-center gap-2">
          <span className="size-8 rounded-full bg-on-primary/15" />
          <span className="h-5 w-1/2 rounded-full bg-on-primary/15" />
        </div>
        <span className="h-1.5 w-full rounded-full bg-on-primary/15" />
        <span className="h-4 w-3/4 rounded-full bg-on-primary/15" />
      </div>
    );
  }
  if (profile.isError || requests.isError || !profile.data) return null;

  const badges = profile.data.badges ?? [];
  const states = badgeStates(badges, requests.data);
  const owned = states.filter((s) => s.status === 'owned').length;
  const pending = states.filter((s) => s.status === 'pending').length;
  const total = states.length;

  return (
    <div className={BOX}>
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-on-primary/20">
          <ShieldCheck strokeWidth={1.75} className="size-4.5" />
        </span>
        <p className="min-w-0 flex-1 text-md font-semibold">
          {owned > 0 ? t('common.badge_request.summary_count', { count: owned, total }) : t('common.badge_request.summary_none')}
        </p>
        {pending > 0 ? <span className={PILL}>{t('common.badge_request.summary_pending', { count: pending })}</span> : null}
      </div>
      <div aria-hidden className="flex gap-1.5">
        {states.map((s) => (
          <span key={s.badge} className={cn('h-1.5 flex-1 rounded-full', SEGMENT[s.status])} />
        ))}
      </div>
      <p className="flex items-start gap-2 text-sm text-on-primary/90">
        <Info aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
        {owned === total ? t('common.badge_request.summary_all') : t('common.badge_request.summary_hint')}
      </p>
      {badges.includes('phone') ? (
        <span className={cn(PILL, 'self-start')}>
          <Check aria-hidden strokeWidth={1.75} className="size-3.5" />
          {t('listing.owner_badge.phone')}
        </span>
      ) : null}
    </div>
  );
}

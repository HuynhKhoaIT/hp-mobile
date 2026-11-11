// GroupCard — thẻ nhóm ghép dùng chung danh sách /ghep-xe, /ghep-tran, "Xem thêm" và Nhóm của tôi. Hợp đồng hình ảnh với app
// (apps/mobile/src/ui/GroupCard.tsx — đổi một bên thì đổi cả hai, cùng tên prop). Style Stitch "Ghép xe về quê & Đi làm ca":
//   1 dải đầu thẻ nền surface-2: ô icon dịch vụ nhỏ + badge loại (primary) + badge thêm (vai trò ở Nhóm của tôi) | viên trạng
//     thái bên phải — còn chỗ: chấm xanh + "Còn N chỗ" (kèo khai đội có sẵn còn thiếu người: "Đã có 6/7 người · cần thêm 1"),
//     trạng thái khác: nhãn trạng thái (Đã đủ người / Đã tới giờ / Đang diễn ra / Đã huỷ) theo tone GROUP_STATUS_TONE
//   2 tiêu đề 2 dòng   3 tuyến dạng timeline: chấm primary (điểm đi) — vạch — chấm cam (điểm đến); ghép trận: ghim + sân (tên
//     trong danh mục nếu có venue_id, không thì chữ tự nhập)   4 giờ diễn ra (ngày + giờ) | chi phí / người (đậm, primary)
//     hoặc "Miễn phí"   5 hàng avatar thành viên (+N) · "Tạo bởi {tên rút gọn}"
// Không giá vé / chọn ghế / gọi điện / nhắn tài xế trên thẻ (Stitch có — sản phẩm không có các tính năng đó).
// Cả thẻ là một link tới /nhom/{slug}. Không 'use client', không async: render được ở Server Component (SSR danh sách)
// lẫn Client Component (trang tiếp theo của "Xem thêm").
import type { PublicGroup } from '@hp/core';
import { groupDisplayStatus, groupLineup, groupMembersPreview } from '@hp/shared';
import { Clock, MapPin, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge, type BadgeTone } from '@/components/shared/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { GROUP_STATUS_TONE, groupFeeText, groupStatusKey, groupTimeText, groupVenueText } from '../display';
import { GROUP_FEATURE_CONFIGS } from '../features';
import { MemberAvatars } from './member-avatars';

export type GroupCardProps = {
  group: PublicGroup;
  /**
   * Mốc "bây giờ" (ms) cho nhãn "Đã tới giờ" = thời điểm đọc dữ liệu (queries.ts / "Xem thêm"). Bắt buộc ở web:
   * Cache Components không cho new Date() khi prerender và component phải thuần. App không cần prop này.
   */
  now: number;
  /** Badge thêm sau badge trạng thái (vd. vai trò của mình ở /toi/nhom-cua-toi). Không được chứa phần tử bấm được. */
  extraBadge?: ReactNode;
};

/** Viên trạng thái ở dải đầu thẻ (chấm + chữ) — chữ success / warning giữ fg trên nền nhạt (đủ 4,5:1), như Badge. */
const PILL: Record<BadgeTone, { box: string; dot: string; text: string }> = {
  neutral: { box: 'bg-surface', dot: 'bg-muted', text: 'text-fg' },
  primary: { box: 'bg-primary-light', dot: 'bg-primary', text: 'text-primary' },
  success: { box: 'bg-success/15', dot: 'bg-success', text: 'text-fg' },
  warning: { box: 'bg-warning/15', dot: 'bg-warning', text: 'text-fg' },
  danger: { box: 'bg-danger/15', dot: 'bg-danger', text: 'text-danger' },
};

export function GroupCard({ group, now, extraBadge }: GroupCardProps) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const cfg = GROUP_FEATURE_CONFIGS[group.kind];
  const status = groupDisplayStatus(group, new Date(now));
  const members = groupMembersPreview(group.members);
  const seatsLeft = group.seats_left ?? Math.max(0, group.seats_total - group.seats_taken);
  const lineup = groupLineup(group.kind, group.attributes, group.seats_total, group.seats_taken);
  const seatsText =
    lineup && lineup.need > 0
      ? `${t('group.card.lineup', { have: lineup.have, total: lineup.total })} · ${t('group.card.lineup_need', { count: lineup.need })}`
      : seatsLeft > 0
        ? t('group.card.seats_left', { count: seatsLeft })
        : t('group.card.seats_full');
  const statusText = t(`group.status.${groupStatusKey(group, status)}`);
  const pill = PILL[GROUP_STATUS_TONE[status]];
  const destination = cfg.hasDestination ? group.destination_text : null;

  return (
    <Link
      href={`/nhom/${group.slug ?? ''}`}
      className={cn(
        'group flex h-full flex-col rounded-lg border border-border bg-surface shadow-card outline-none transition duration-150',
        'hover:-translate-y-0.5 hover:border-primary/20 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg border-b border-border bg-surface-2 px-3.5 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <span aria-hidden className={cn('flex size-7 shrink-0 items-center justify-center rounded-sm', cfg.tone.soft)}>
            <cfg.Icon strokeWidth={1.75} className={cn('size-4', cfg.tone.fg)} />
          </span>
          <Badge tone="primary">{t(`group.sub_kind.${group.sub_kind}`)}</Badge>
          {extraBadge}
        </div>
        <p className={cn('flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold', pill.box, pill.text)}>
          <span aria-hidden className={cn('size-2 shrink-0 rounded-full', pill.dot)} />
          {status === 'open' ? (
            <>
              <span className="sr-only">{statusText}: </span>
              {seatsText}
            </>
          ) : (
            statusText
          )}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <h3 lang={group.lang} className="line-clamp-2 text-md leading-snug font-semibold text-fg">
          {group.title}
        </h3>

        {destination ? (
          <div className="flex gap-3">
            <span aria-hidden className="flex flex-col items-center py-1.5">
              <span className="size-2.5 rounded-full bg-primary" />
              <span className="my-1 w-0.5 flex-1 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-accent" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-md font-semibold text-fg">
              <p className="line-clamp-1">
                <span className="sr-only">{t('group.detail.from')}: </span>
                {group.origin_text}
              </p>
              <p className="line-clamp-1">
                <span className="sr-only">{t('group.detail.to')}: </span>
                {destination}
              </p>
            </div>
          </div>
        ) : (
          <p className="flex items-start gap-2 text-md font-semibold text-fg">
            <MapPin aria-hidden strokeWidth={1.75} className="mt-0.5 size-4.5 shrink-0 text-primary" />
            <span className="line-clamp-2 min-w-0">
              <span className="sr-only">{cfg.hasDestination ? t('group.detail.from') : t('group.detail.venue')}: </span>
              {cfg.hasDestination ? group.origin_text : groupVenueText(group)}
            </span>
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-fg">
            <Clock aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-primary" />
            <time dateTime={group.starts_at} className="line-clamp-1">
              {groupTimeText(group, locale)}
            </time>
          </p>
          <p className="text-lg font-bold text-primary">{groupFeeText(group, t, locale)}</p>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
          {members.length > 0 ? (
            <MemberAvatars
              members={members}
              total={group.seats_taken}
              moreLabel={(count) => t('group.card.members_more', { count })}
            />
          ) : (
            <Users aria-hidden strokeWidth={1.75} className="size-5 text-muted" />
          )}
          <span className="line-clamp-1 min-w-0 text-sm text-muted">
            {t('group.card.by_host', { name: group.host_name ?? '' })}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Skeleton đúng hình GroupCard (đổi bố cục thẻ → sửa cả đây và app). */
export function GroupCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface shadow-card">
      <div className="flex justify-between rounded-t-lg border-b border-border bg-surface-2 px-3.5 py-2.5">
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="flex flex-col gap-3 p-3.5">
        <Skeleton className="h-5 w-11/12" />
        <div className="flex gap-3">
          <Skeleton className="h-14 w-2.5 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 py-0.5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-6 w-1/3" />
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  );
}

/** Lưới thẻ nhóm: 1 cột điện thoại, 2 cột tablet, 3 cột desktop. */
export const GROUP_GRID_CLASS = 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3';

export function GroupGrid({ items, now }: { items: PublicGroup[]; now: number }) {
  return (
    <ul className={GROUP_GRID_CLASS}>
      {items.map((group) => (
        <li key={group.id} className="flex flex-col *:flex-1">
          <GroupCard group={group} now={now} />
        </li>
      ))}
    </ul>
  );
}

export function GroupGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={GROUP_GRID_CLASS}>
      {Array.from({ length: count }, (_, i) => (
        <GroupCardSkeleton key={i} />
      ))}
    </div>
  );
}

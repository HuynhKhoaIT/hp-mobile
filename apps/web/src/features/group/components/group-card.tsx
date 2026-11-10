// GroupCard — thẻ nhóm ghép dùng chung danh sách /ghep-xe, /ghep-tran và "Xem thêm". Hợp đồng hình ảnh với app
// (apps/mobile/src/ui/GroupCard.tsx — đổi một bên thì đổi cả hai, cùng tên prop). Thứ tự thông tin:
//   1 badge loại (sub_kind) + badge trạng thái (groupDisplayStatus)   2 tiêu đề 2 dòng (16 medium)
//   3 giờ diễn ra (ngày + giờ)   4 điểm đi   5 điểm đến (ghép xe) — ghép trận: dòng 4 là sân (tên trong danh mục nếu
//   có venue_id, không thì chữ tự nhập), không có dòng 5. Nhãn "Đang diễn ra" khi cron đã đổi sang in_progress.
//   6 "Còn N chỗ" (số nhiều) · chi phí / người hoặc "Miễn phí" — kèo khai đội có sẵn (attributes.players_have →
//     groupLineup) còn thiếu người: "Đã có 6/7 người · cần thêm 1" thay cho "Còn N chỗ" (đủ → "Đã đủ chỗ", như app)
//   7 hàng avatar thành viên (+N) · "Tạo bởi {tên rút gọn}"
// Ô icon dịch vụ (nền service-<kind>-soft) bên trái tiêu đề thay cho ảnh bìa (nhóm không có ảnh).
// Cả thẻ là một link tới /nhom/{slug}. Không 'use client', không async: render được ở Server Component (SSR danh sách)
// lẫn Client Component (trang tiếp theo của "Xem thêm").
import type { PublicGroup } from '@hp/core';
import { groupDisplayStatus, groupLineup, groupMembersPreview } from '@hp/shared';
import { CircleDot, Clock, MapPin, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Badge } from '@/components/shared/badge';
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

function InfoLine({ icon, children, className }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <p className={cn('flex min-w-0 items-start gap-2 text-sm text-fg', className)}>
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <span className="line-clamp-1 min-w-0">{children}</span>
    </p>
  );
}

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
  const iconClass = 'size-4';

  return (
    <Link
      href={`/nhom/${group.slug ?? ''}`}
      className={cn(
        'group flex h-full flex-col gap-2 rounded-md bg-surface p-3 shadow-card outline-none transition-transform duration-150',
        'hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-md', cfg.tone.soft)}>
          <cfg.Icon aria-hidden strokeWidth={1.75} className={cn('size-6', cfg.tone.fg)} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap gap-1">
            <Badge>{t(`group.sub_kind.${group.sub_kind}`)}</Badge>
            <Badge tone={GROUP_STATUS_TONE[status]}>{t(`group.status.${groupStatusKey(group, status)}`)}</Badge>
            {extraBadge}
          </div>
          <h3 lang={group.lang} className="line-clamp-2 text-md font-medium text-fg">
            {group.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <InfoLine icon={<Clock aria-hidden strokeWidth={1.75} className={iconClass} />}>
          <time dateTime={group.starts_at}>{groupTimeText(group, locale)}</time>
        </InfoLine>
        <InfoLine
          icon={
            cfg.hasDestination ? (
              <CircleDot aria-hidden strokeWidth={1.75} className={iconClass} />
            ) : (
              <MapPin aria-hidden strokeWidth={1.75} className={iconClass} />
            )
          }
        >
          <span className="sr-only">{cfg.hasDestination ? t('group.detail.from') : t('group.detail.venue')}: </span>
          {cfg.hasDestination ? group.origin_text : groupVenueText(group)}
        </InfoLine>
        {cfg.hasDestination && group.destination_text ? (
          <InfoLine icon={<MapPin aria-hidden strokeWidth={1.75} className={iconClass} />}>
            <span className="sr-only">{t('group.detail.to')}: </span>
            {group.destination_text}
          </InfoLine>
        ) : null}
      </div>

      <p className="flex flex-wrap items-baseline gap-x-2 text-md">
        <span className={cn('font-semibold', seatsLeft > 0 ? 'text-fg' : 'text-muted')}>
          {seatsText}
        </span>
        <span aria-hidden className="text-muted">
          ·
        </span>
        <span className="font-bold text-fg">{groupFeeText(group, t, locale)}</span>
      </p>

      <div className="mt-auto flex items-center gap-2 border-t border-border pt-2">
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
    </Link>
  );
}

/** Skeleton đúng hình GroupCard (đổi bố cục thẻ → sửa cả đây và app). */
export function GroupCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface p-3 shadow-card">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 shrink-0 rounded-md" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-5 w-11/12" />
        </div>
      </div>
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-6 w-2/5" />
      <div className="flex items-center gap-2 border-t border-border pt-2">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-4 w-1/3" />
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

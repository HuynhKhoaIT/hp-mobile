// StatusBadge — trạng thái có màu + chữ (không chỉ màu). Dùng Badge chung nên nhìn giống badge trạng thái ở app / web.
// Trạng thái tin: tone theo STATUS_TONE của "Tin của tôi"; các loại còn lại: chờ / mở → vàng, xong / duyệt → xanh,
// từ chối / cấm / huỷ → đỏ, bỏ qua / đã xoá → xám. Chữ do nơi gọi truyền vào (đã qua t()).
import type { BadgeRequestStatus, KeywordAction, ReportStatus, UserState, VenueStatus } from '@hp/core';
import type { GroupStatus, ListingStatus, ModerationStatus } from '@hp/shared';
import { Badge, type BadgeTone } from '@/components/shared/badge';
import { STATUS_TONE } from '@/features/listing/manage';

const TONES = {
  queue: { pending: 'warning', approved: 'success', rejected: 'danger' } satisfies Record<ModerationStatus, BadgeTone>,
  report: { open: 'warning', reviewing: 'primary', resolved: 'success', dismissed: 'neutral' } satisfies Record<ReportStatus, BadgeTone>,
  badge: { pending: 'warning', approved: 'success', rejected: 'danger' } satisfies Record<BadgeRequestStatus, BadgeTone>,
  venue: { pending: 'warning', approved: 'success', rejected: 'danger' } satisfies Record<VenueStatus, BadgeTone>,
  group: { open: 'success', full: 'primary', in_progress: 'primary', completed: 'neutral', cancelled: 'danger' } satisfies Record<
    GroupStatus,
    BadgeTone
  >,
  user: { active: 'success', suspended: 'warning', banned: 'danger', deleted: 'neutral' } satisfies Record<UserState, BadgeTone>,
  keyword: { reject: 'danger', review: 'warning' } satisfies Record<KeywordAction, BadgeTone>,
  toggle: { on: 'success', off: 'neutral' } satisfies Record<'on' | 'off', BadgeTone>,
} as const;

type Kinds = typeof TONES;
type StatusProps =
  | { kind: 'listing'; status: ListingStatus; label: string }
  | { [K in keyof Kinds]: { kind: K; status: keyof Kinds[K]; label: string } }[keyof Kinds];

export function StatusBadge(props: StatusProps) {
  const tone: BadgeTone =
    props.kind === 'listing' ? STATUS_TONE[props.status] : (TONES[props.kind] as Record<string, BadgeTone>)[props.status as string] ?? 'neutral';
  return <Badge tone={tone}>{props.label}</Badge>;
}

// StatusBadge — trạng thái có màu + chữ (không chỉ màu). Dùng Badge chung nên nhìn giống badge trạng thái ở app / web.
// Trạng thái tin: tone theo STATUS_TONE của "Tin của tôi"; trạng thái hàng chờ: pending vàng, approved xanh, rejected đỏ.
import type { ListingStatus, ModerationStatus } from '@hp/shared';
import { Badge, type BadgeTone } from '@/components/shared/badge';
import { STATUS_TONE } from '@/features/listing/manage';

const QUEUE_TONE: Record<ModerationStatus, BadgeTone> = { pending: 'warning', approved: 'success', rejected: 'danger' };

export function StatusBadge(
  props: { kind: 'listing'; status: ListingStatus; label: string } | { kind: 'queue'; status: ModerationStatus; label: string },
) {
  const tone = props.kind === 'listing' ? STATUS_TONE[props.status] : QUEUE_TONE[props.status];
  return <Badge tone={tone}>{props.label}</Badge>;
}

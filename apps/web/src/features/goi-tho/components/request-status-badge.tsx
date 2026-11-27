// Nhãn trạng thái yêu cầu / báo giá của mini-app Gọi thợ: luôn có chữ (không chỉ màu). Tone khớp app (RequestStatusBadge).
import type { ServiceQuoteDisplayStatus, ServiceRequestDisplayStatus } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { Badge, type BadgeTone } from '@/components/shared/badge';

export const REQUEST_STATUS_TONE: Record<ServiceRequestDisplayStatus, BadgeTone> = {
  open: 'success',
  assigned: 'primary',
  completed: 'neutral',
  cancelled: 'danger',
  expired: 'neutral',
};

export const QUOTE_STATUS_TONE: Record<ServiceQuoteDisplayStatus, BadgeTone> = {
  submitted: 'warning',
  accepted: 'success',
  declined: 'neutral',
  withdrawn: 'neutral',
};

export function RequestStatusBadge({ status }: { status: ServiceRequestDisplayStatus }) {
  const t = useTranslations('tho');
  return <Badge tone={REQUEST_STATUS_TONE[status]}>{t(`status.${status}`)}</Badge>;
}

export function QuoteStatusBadge({ status }: { status: ServiceQuoteDisplayStatus }) {
  const t = useTranslations('tho');
  return <Badge tone={QUOTE_STATUS_TONE[status]}>{t(`quote_status.${status}`)}</Badge>;
}

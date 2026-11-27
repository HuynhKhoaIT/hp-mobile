// Nhãn trạng thái yêu cầu / báo giá của mini-app Gọi thợ: luôn có chữ (không chỉ màu). Tone khớp web (request-status-badge).
import type { ServiceQuoteDisplayStatus, ServiceRequestDisplayStatus } from '@hp/shared';
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeTone } from '@/ui';

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
  const { t } = useTranslation('tho');
  return <Badge label={t(`status.${status}`)} tone={REQUEST_STATUS_TONE[status]} />;
}

export function QuoteStatusBadge({ status }: { status: ServiceQuoteDisplayStatus }) {
  const { t } = useTranslation('tho');
  return <Badge label={t(`quote_status.${status}`)} tone={QUOTE_STATUS_TONE[status]} />;
}

// Thẻ một huy hiệu xác minh ở màn Huy hiệu (style Stitch "Huy hiệu & Xác minh (BadgeRequestCard)"): ô icon size-11 bo md
// (đang chọn: nền primary-light + icon primary; đã có: nền success/15 + icon success; còn lại surface-2 + muted) → tên đậm
// (đang chọn: chữ primary; đã có: dấu BadgeCheck) + dòng "dành cho ai" → hộp giấy tờ cần có (surface-2, icon FileText) →
// lý do khi bị từ chối → vạch ngăn → nhãn trạng thái (Badge luôn có chữ) + ngày gửi | viên "Đang chọn" / "Chọn huy hiệu này".
// Chưa xin / bị từ chối → cả thẻ là nút chọn (Card `selected`: viền 2 primary khi chọn); đã có / chờ duyệt → thẻ tĩnh.
// Viên bên phải chỉ là hình (ẩn với trình đọc màn hình) — thẻ đọc "tên, trạng thái" + trạng thái chọn.
// Khác Stitch (cố ý): không ruy băng "Phổ biến nhất - Khuyên dùng" (không có dữ liệu xếp hạng huy hiệu); không chấm nhấp
// nháy "Đang hoàn thiện hồ sơ" (giữ màn tĩnh, Reduce Motion) — nhãn trạng thái thay thế.
import type { RequestableBadge } from '@hp/shared';
import { BadgeCheck, Briefcase, Check, FileText, HardHat, House, type LucideIcon, Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatDate } from '@/lib/format';
import { Badge, type BadgeTone, Card, Col, Divider, Icon, Row, Skeleton, Text, type TextTone } from '@/ui';
import { type BadgeState, type BadgeStatus, canRequestBadge } from '../hooks';

/** Icon theo huy hiệu — trọ / sân / việc dùng cùng icon dịch vụ (House, Trophy, Briefcase) như web. */
export const BADGE_ICON: Record<RequestableBadge, LucideIcon> = {
  worker: HardHat,
  landlord: House,
  venue: Trophy,
  employer: Briefcase,
};

const STATUS: Record<BadgeStatus, { key: string; tone: BadgeTone }> = {
  owned: { key: 'badge_request.owned', tone: 'success' },
  pending: { key: 'badge_request.status_pending', tone: 'warning' },
  rejected: { key: 'badge_request.status_rejected', tone: 'danger' },
  none: { key: 'badge_request.status_none', tone: 'neutral' },
};

export type BadgeRequestCardProps = {
  state: BadgeState;
  /** Huy hiệu đang chọn để gửi giấy tờ (một thẻ một lúc). */
  selected: boolean;
  onSelect: () => void;
};

export function BadgeRequestCard({ state, selected, onSelect }: BadgeRequestCardProps) {
  const { t } = useTranslation();
  const name = t(`listing:owner_badge.${state.badge}`);
  const status = STATUS[state.status];
  const statusLabel = t(status.key);
  const requestable = canRequestBadge(state.status);
  const owned = state.status === 'owned';
  const active = requestable && selected;
  const tile = active ? 'bg-primary-light' : owned ? 'bg-success/15' : 'bg-surface-2';
  const iconTone: TextTone = active ? 'primary' : owned ? 'success' : 'muted';

  const body = (
    <Col gap={3}>
      <Row gap={3} align="start">
        <View className={`size-11 items-center justify-center rounded-md ${tile}`}>
          <Icon icon={BADGE_ICON[state.badge]} tone={iconTone} />
        </View>
        <Col gap={1} className="flex-1">
          <Row gap={1} align="center">
            <Text variant="label" weight="bold" tone={active ? 'primary' : 'default'} className="shrink">
              {name}
            </Text>
            {owned ? <Icon icon={BadgeCheck} tone="success" size={18} /> : null}
          </Row>
          <Text variant="caption" tone="muted">
            {t(`badge_request.for_${state.badge}`)}
          </Text>
        </Col>
      </Row>

      <View className="flex-row items-start gap-2 rounded-md bg-surface-2 px-3 py-2">
        <Icon icon={FileText} tone={active ? 'primary' : 'muted'} size={18} />
        <Text variant="caption" className="flex-1">
          {t(`badge_request.doc_hint_${state.badge}`)}
        </Text>
      </View>

      {state.status === 'rejected' && state.reason ? (
        <Text variant="caption" tone="danger">
          {t('badge_request.reason', { reason: state.reason })}
        </Text>
      ) : null}

      <Divider />
      <Row gap={2} justify="between" align="center">
        <Col gap={1} align="start" className="flex-1">
          <Badge label={statusLabel} tone={status.tone} />
          {state.requestedAt ? (
            <Text variant="caption" tone="muted">
              {t('badge_request.requested_on', { date: formatDate(state.requestedAt) })}
            </Text>
          ) : null}
        </Col>
        {requestable ? <SelectPill selected={selected} /> : null}
      </Row>
    </Col>
  );

  if (!requestable) return <Card>{body}</Card>;
  return (
    <Card selected={selected} onPress={onSelect} accessibilityLabel={`${name}, ${statusLabel}`}>
      {body}
    </Card>
  );
}

/** Viên "Đang chọn" (primary đặc + dấu ✓) / "Chọn huy hiệu này" (viền) — hình, cả thẻ mới là vùng chạm. */
function SelectPill({ selected }: { selected: boolean }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`flex-row items-center gap-1 rounded-full border px-3 py-1.5 ${
        selected ? 'border-primary bg-primary' : 'border-border bg-surface'
      }`}
    >
      <Text variant="caption" weight="semibold" tone={selected ? 'onPrimary' : 'primary'}>
        {t(selected ? 'badge_request.selected' : 'badge_request.select')}
      </Text>
      {selected ? <Icon icon={Check} tone="onPrimary" size={16} /> : null}
    </View>
  );
}

export function BadgeRequestCardSkeleton() {
  return (
    <Card>
      <Col gap={3}>
        <Row gap={3} align="start">
          <Skeleton className="size-11 rounded-md" />
          <Col gap={2} className="flex-1">
            <Skeleton className="h-5 w-1/2 rounded-sm" />
            <Skeleton className="h-4 w-4/5 rounded-sm" />
          </Col>
        </Row>
        <Skeleton className="h-9 w-full rounded-md" />
        <Divider />
        <Row justify="between">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </Row>
      </Col>
    </Card>
  );
}

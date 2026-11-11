// Chi tiết nhóm (ride / sport) — dùng cho cả `group/[id]` (điều hướng nội bộ, push) và `nhom/[slug]` (Universal Link).
// Style Stitch "Chi tiết chuyến xe & Đặt ghế" — một bố cục chung, khác nhau theo config tính năng (chữ trong config.labels):
//   1 thẻ tóm tắt: badge loại (primary) + trạng thái + cách tham gia → tiêu đề → chi phí lớn màu primary ("/người" chữ nhỏ;
//     Miễn phí) → giờ hẹn (ngày giờ + còn bao lâu) → số chỗ (đếm ngược khi có người vào) → đội hình (kèo khai đội có sẵn)
//   2 banner đã huỷ / đã tới giờ → đánh giá chủ nhóm (thành viên, sau giờ hẹn) → gợi ý nhắc giờ (chủ nhóm / thành viên)
//   3 "Lộ trình" (ghép xe: điểm đi → điểm đến) / "Sân chơi" (kèo: tên + địa chỉ sân trong danh mục) — tiêu đề có vạch
//   4 yêu cầu chờ duyệt (chủ nhóm — khối viền cam, Nhận / Từ chối) → thành viên (avatar + chỗ còn)
//   5 người tạo nhóm → thông tin thêm (GROUP_ATTRIBUTE_FIELDS) → ghi chú → mẹo an toàn riêng tính năng (config.labels.tip)
// Thanh dính đáy (GroupCtaBar, StickyCta elevated): chi phí + chỗ còn bên trái, Tham gia / Xin tham gia bên phải; vai trò
// khác: trạng thái của mình + Chat nhóm / Rời / Huỷ nhóm.
// Khác Stitch (cố ý): không sơ đồ chọn ghế, chọn điểm đón, giá "cam kết", thanh toán QR, gọi điện / Zalo, bản đồ, quãng
// đường / thời gian đi, thẻ nhân viên — app không có các tính năng / dữ liệu đó; chỗ tính theo số chỗ, lời nhắn gửi kèm
// yêu cầu tham gia (sheet). Chưa có bản đồ (chờ key Goong): RouteSummary thay cho MapView.
import type { AppError, PublicGroup } from '@hp/core';
import { groupDisplayStatus, type GroupKind, groupLineup } from '@hp/shared';
import { AlarmClock, Clock, type LucideIcon, SearchX, UserCheck, Users } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { formatDate, formatRelative } from '@/lib/format';
import {
  Badge,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  GROUP_STATUS_TONE,
  Icon,
  Notice,
  RouteSummary,
  SectionHeader,
  SkeletonGroupDetail,
  Text,
  Ticker,
  useGroupTexts,
} from '@/ui';
import { canRateGroup, useGroupViewer } from '../hooks';
import { backOrHome } from '../navigation';
import type { GroupFeatureConfig } from '../types';
import { GroupAttributeList } from './GroupAttributeList';
import { GroupCtaBar } from './GroupCtaBar';
import { GroupRatingCard } from './GroupRatingCard';
import { HostCard } from './HostCard';
import { MembersRow } from './MembersRow';
import { RequestsList } from './RequestsList';

/** Phần cần của kết quả useGroup / useGroupBySlug. */
export type GroupQueryState = {
  data: PublicGroup | undefined;
  isLoading: boolean;
  error: AppError | null;
  refetch: () => unknown;
};

/** Mã lỗi coi như "nhóm không còn" (id sai dạng → invalid_input). */
const NOT_FOUND = new Set(['not_found', 'invalid_input']);

/** Ba trạng thái của màn chi tiết + nội dung khi có dữ liệu (kể cả dữ liệu tạm từ cache danh sách). */
export function GroupDetailState({ query, configs }: { query: GroupQueryState; configs: Record<GroupKind, GroupFeatureConfig> }) {
  const { t } = useTranslation('group');
  if (query.data) return <GroupDetailBody group={query.data} config={configs[query.data.kind]} />;
  if (query.isLoading) {
    return (
      <ScrollView className="flex-1" contentContainerClassName="pb-6">
        <SkeletonGroupDetail />
      </ScrollView>
    );
  }
  if (!query.error || NOT_FOUND.has(query.error.code)) {
    return (
      <EmptyState
        icon={SearchX}
        title={t('detail.not_found_title')}
        description={t('detail.not_found_body')}
        action={{ label: t('detail.back_to_list'), onPress: backOrHome }}
      />
    );
  }
  return <ErrorState code={query.error.code} onRetry={() => void query.refetch()} />;
}

function GroupDetailBody({ group, config }: { group: PublicGroup; config: GroupFeatureConfig }) {
  const { t } = useTranslation('group');
  const texts = useGroupTexts();
  const viewer = useGroupViewer(group);
  const status = groupDisplayStatus(group);
  const isRoute = config.form.place === 'route';
  const isMember = viewer.role === 'host' || viewer.role === 'member';
  const live = status === 'open' || status === 'full';
  const venueAddress = !isRoute ? group.venue_address : null;
  const lineup = groupLineup(group.kind, group.attributes, group.seats_total, group.seats_taken);
  const fee = group.fee_per_person > 0 ? texts.fee(group) : t('detail.fee_free');
  const cut = group.fee_per_person > 0 ? fee.lastIndexOf('/') : -1;

  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-6" showsVerticalScrollIndicator={false}>
        <Card className="gap-3">
          <View className="flex-row flex-wrap gap-1">
            <Badge label={t(`sub_kind.${group.sub_kind}`)} tone="primary" />
            <Badge label={texts.status(group)} tone={GROUP_STATUS_TONE[status]} />
            <Badge label={t(group.requires_approval ? 'card.needs_approval' : 'card.instant')} />
          </View>
          <Text variant="heading" accessibilityRole="header" selectable>
            {group.title}
          </Text>
          <Text variant="heading" weight="bold" tone="primary" accessibilityLabel={`${t('detail.fee')}: ${fee}`}>
            {cut > 0 ? fee.slice(0, cut) : fee}
            {cut > 0 ? (
              <Text variant="body" weight="semibold" tone="muted">
                {fee.slice(cut)}
              </Text>
            ) : null}
          </Text>
          <Divider />
          <InfoRow icon={Clock} label={t('detail.time')}>
            <Text variant="label" className="text-right">
              {formatDate(group.starts_at, 'datetime')}
            </Text>
            <Text variant="caption" tone="muted" className="text-right">
              {formatRelative(group.starts_at)}
            </Text>
          </InfoRow>
          <InfoRow icon={Users} label={t('detail.seats')}>
            <Ticker
              text={t('detail.seats_value', { taken: group.seats_taken, total: group.seats_total })}
              variant="label"
              className="text-right"
            />
          </InfoRow>
          {lineup ? (
            <InfoRow icon={UserCheck} label={t('detail.lineup')}>
              <Ticker
                text={
                  lineup.need > 0
                    ? t('detail.lineup_value', { have: lineup.have, total: lineup.total, count: lineup.need })
                    : t('detail.lineup_full', { total: lineup.total })
                }
                variant="label"
                className="text-right"
              />
            </InfoRow>
          ) : null}
        </Card>

        {status === 'cancelled' ? (
          <Notice tone="danger" text={t('detail.cancelled_note')} />
        ) : status === 'started' || status === 'completed' ? (
          <Notice text={t('detail.started_note')} />
        ) : null}

        {!viewer.loading && canRateGroup(viewer.role, status) ? <GroupRatingCard group={group} /> : null}

        {isMember && live ? (
          <View accessibilityRole="text" className="-my-2 flex-row items-start gap-2 px-1">
            <Icon icon={AlarmClock} tone="muted" size={16} />
            <Text variant="caption" tone="muted" className="flex-1">
              {t('detail.reminder_hint', { minutes: config.reminderMinutes })}
            </Text>
          </View>
        ) : null}

        <View className="gap-2">
          <SectionHeader title={t(config.labels.placeTitle)} bar="primary" />
          <Card className="gap-1">
            <RouteSummary
              from={(!isRoute && group.venue_name) || group.origin_text}
              to={isRoute ? group.destination_text : null}
              fromLabel={t(isRoute ? 'detail.from' : 'detail.venue')}
              toLabel={t('detail.to')}
            />
            {/* Địa chỉ sân (danh mục venues) thẳng hàng dưới tên sân (icon 20 + gap-3 = pl-8). */}
            {venueAddress ? (
              <Text variant="caption" tone="muted" selectable className="pl-8">
                {venueAddress}
              </Text>
            ) : null}
          </Card>
        </View>

        {viewer.role === 'host' && live ? <RequestsList group={group} /> : null}

        <MembersRow group={group} />

        <HostCard group={group} />

        <GroupAttributeList group={group} />

        <View className="gap-2">
          <SectionHeader title={t('detail.description')} bar="primary" />
          <Card>
            {group.description ? <Text selectable>{group.description}</Text> : <Text tone="muted">{t('detail.no_description')}</Text>}
          </Card>
        </View>

        <Notice variant="bordered" tone="warning" title={t('listing:tip.title')} text={t(config.labels.tip)} />
      </ScrollView>

      <GroupCtaBar group={group} role={viewer.role} loading={viewer.loading} chat={config.detail.ctas.includes('chat')} />
    </>
  );
}

/** Một dòng thông tin: icon primary + nhãn bên trái, giá trị (một hoặc nhiều dòng) bên phải. */
function InfoRow({ icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <View className="min-h-11 flex-row items-start gap-3 py-1">
      <Icon icon={icon} tone="primary" />
      <Text tone="muted" className="flex-1">
        {label}
      </Text>
      <View className="flex-1 items-end">{children}</View>
    </View>
  );
}

// Ghép xe về quê — chỉ là config cho engine features/group (quy tắc vàng). Bản đồ / gợi ý địa chỉ chờ key Goong:
// điểm đến gõ tay hoặc chọn nhanh RIDE_PLACES (@hp/shared, có toạ độ để lọc bán kính).
import { GROUP_RULES, GROUP_SUB_KINDS } from '@hp/shared';
import type { GroupFeatureConfig } from '@/features/group/types';

export const rideConfig: GroupFeatureConfig<'ride'> = {
  kind: 'ride',
  subKinds: GROUP_SUB_KINDS.ride,
  color: 'ride',
  labels: {
    title: 'list.title_ride',
    detailTitle: 'detail.title_ride',
    searchPlaceholder: 'list.search_placeholder_ride',
    emptyTitle: 'list.empty_title_ride',
    emptyBody: 'list.empty_body_ride',
    create: 'list.create_ride',
  },
  card: { estimatedHeight: 230 },
  form: {
    titleKey: 'form.title_ride',
    subKindLabelKey: 'form.sub_kind_label_ride',
    startsAtLabelKey: 'form.starts_at_label_ride',
    seatsLabelKey: 'form.seats_label_ride',
    feeHintKey: 'form.fee_hint_ride',
    descriptionHintKey: 'form.description_hint_ride',
    submitKey: 'form.submit_ride',
    successTitleKey: 'form.success_title_ride',
    titlePlaceholderKey: null,
    place: 'route',
    defaultSeats: 3,
    lineup: false,
    // Đi xe với người lạ: mặc định chủ xe duyệt từng người.
    defaultRequiresApproval: true,
  },
  detail: { ctas: ['join', 'chat'] },
  reminderMinutes: GROUP_RULES.reminderMinutes,
};

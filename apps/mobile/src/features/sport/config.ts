// Ghép trận (bóng đá, cầu lông, pickleball) — chỉ là config cho engine features/group (quy tắc vàng).
// Sân: chọn trong danh mục venues (form.place = 'venue') hoặc tự gõ; góp sân mới chờ duyệt. Bản đồ chờ key Goong.
import { GROUP_RULES, GROUP_SUB_KINDS } from '@hp/shared';
import type { GroupFeatureConfig } from '@/features/group/types';

export const sportConfig: GroupFeatureConfig<'sport'> = {
  kind: 'sport',
  subKinds: GROUP_SUB_KINDS.sport,
  color: 'sport',
  labels: {
    title: 'list.title_sport',
    detailTitle: 'detail.title_sport',
    searchPlaceholder: 'list.search_placeholder_sport',
    emptyTitle: 'list.empty_title_sport',
    emptyBody: 'list.empty_body_sport',
    create: 'list.create_sport',
  },
  card: { estimatedHeight: 230 },
  form: {
    titleKey: 'form.title_sport',
    subKindLabelKey: 'form.sub_kind_label_sport',
    startsAtLabelKey: 'form.starts_at_label_sport',
    seatsLabelKey: 'form.seats_label_sport',
    feeHintKey: 'form.fee_hint_sport',
    descriptionHintKey: 'form.description_hint_sport',
    submitKey: 'form.submit_sport',
    successTitleKey: 'form.success_title_sport',
    titlePlaceholderKey: 'form.title_placeholder_sport',
    place: 'venue',
    defaultSeats: 4,
    // Đội 7 đã có 5, chỉ cần thêm 2 → khai sẵn đội hình.
    lineup: true,
    // Rủ thêm người chơi sau ca: vào ngay cho nhanh.
    defaultRequiresApproval: false,
  },
  detail: { ctas: ['join', 'chat'] },
  reminderMinutes: GROUP_RULES.reminderMinutes,
};

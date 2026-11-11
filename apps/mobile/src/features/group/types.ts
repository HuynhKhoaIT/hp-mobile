// Hình dạng config của một tính năng Group (ride, sport) — quy tắc vàng: 2 tính năng dùng chung engine features/group,
// khác nhau chỉ ở config.ts. Config không biểu diễn được điều cần → mở rộng type này + engine để cả hai cùng hưởng
// (.claude/rules/mobile-features.md). Trường attributes theo kind lấy từ GROUP_ATTRIBUTE_FIELDS của @hp/shared
// (không khai báo lại); sub kind từ GROUP_SUB_KINDS.
import type { GroupKind, GroupSubKind } from '@hp/shared';
import type { ServiceKey } from '@/ui';

/** Key i18n (ns group) của một tính năng — mỗi tính năng một bộ chữ riêng (vd "Tạo chuyến" / "Tạo kèo"). */
export type GroupLabels = {
  /** Tiêu đề màn danh sách. */
  title: string;
  /** Tiêu đề màn chi tiết. */
  detailTitle: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyBody: string;
  /** Nút tạo nhóm (FAB + CTA khi rỗng). */
  create: string;
  /** Dòng phụ dưới tiêu đề header xanh của danh sách. */
  subtitle: string;
  /** Tiêu đề khối danh sách (vạch cam) khi chưa tìm / lọc ("Chuyến sắp khởi hành"). */
  upcoming: string;
  /** Tiêu đề khối địa điểm ở chi tiết ("Lộ trình" / "Sân chơi") — cũng là tiêu đề khối địa điểm của form. */
  placeTitle: string;
  /** Mẹo an toàn riêng tính năng (đầu danh sách + chi tiết). */
  tip: string;
};

export type GroupFormConfig = {
  /** Tiêu đề màn form. */
  titleKey: string;
  /** Dòng phụ dưới tiêu đề header xanh của form. */
  subtitleKey: string;
  /** Tiêu đề khối "số chỗ + chi phí" ("Chỗ trống & chi phí" / "Người chơi & chi phí"). */
  seatsSectionKey: string;
  subKindLabelKey: string;
  startsAtLabelKey: string;
  seatsLabelKey: string;
  feeHintKey: string;
  descriptionHintKey: string;
  submitKey: string;
  successTitleKey: string;
  /** Gợi ý tiêu đề; null = không có ví dụ riêng. */
  titlePlaceholderKey: string | null;
  /**
   * 'route': điểm đi (mặc định cổng khu) + điểm đến bắt buộc, chọn nhanh RIDE_PLACES; tiêu đề để trống → "A → B".
   * 'venue': chọn sân trong danh mục (venues, lọc theo môn + khu; lưu venue_id + tên sân vào origin_text) hoặc tự gõ
   * tên sân (venue_id null); góp sân mới (chờ duyệt). Tiêu đề bắt buộc.
   */
  place: 'route' | 'venue';
  /** Số chỗ mặc định khi mở form. */
  defaultSeats: number;
  /**
   * Đội đã có sẵn người (kèo: attributes.players_have, tính cả chủ nhóm): công tắc + Stepper ngay dưới "số người cần
   * thêm", xem trước "Đội đủ N người". Thẻ / chi tiết hiện đội hình qua groupLineup() của @hp/shared.
   */
  lineup: boolean;
  /** Mặc định "Duyệt người tham gia". */
  defaultRequiresApproval: boolean;
};

export type GroupFeatureConfig<K extends GroupKind = GroupKind> = {
  kind: K;
  /** Loại con — chip lọc ở danh sách + chip chọn ở form (thứ tự hiển thị). */
  subKinds: readonly GroupSubKind<K>[];
  /** Màu + icon dịch vụ (t.serviceColors.<color>). */
  color: Extract<ServiceKey, 'ride' | 'sport'>;
  labels: GroupLabels;
  card: {
    /** Chiều cao ước lượng một thẻ (px) — đổi "còn 5 item" thành ngưỡng onEndReached (FlashList v2 tự đo item). */
    estimatedHeight: number;
  };
  form: GroupFormConfig;
  /** CTA ở chi tiết: 'join' tham gia / xin tham gia · 'chat' chat nhóm (chủ nhóm + thành viên đã được nhận). */
  detail: { ctas: readonly ('join' | 'chat')[] };
  /** Nhắc trước giờ hẹn (cron remind_groups → push; khớp GROUP_RULES.reminderMinutes) — hiện gợi ý ở chi tiết. */
  reminderMinutes: number;
};

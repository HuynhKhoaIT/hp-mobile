// Kiểu cấu hình của một tính năng Group (ride / sport). Quy tắc vàng: 2 tính năng dùng chung features/group; khác biệt
// CHỈ nằm trong features/<x>/config.ts (kind, đường dẫn, icon, màu dịch vụ, có điểm đến hay không, JSON-LD).
// Thêm tính năng = thêm kind ở @hp/shared (GROUP_KINDS, GROUP_SUB_KINDS) + một config.ts + một dòng trong features.ts.
// Chữ theo kind: khoá có hậu tố `_<kind>` trong ns group (list.title_ride, form.submit_sport…) và web.group.<kind>.*.
import type { GroupKind, GroupSubKind } from '@hp/shared';
import type { LucideIcon } from 'lucide-react';

export type GroupFeaturePath = '/ghep-xe' | '/ghep-tran';

export type GroupFeatureConfig = {
  kind: GroupKind;
  /** Đường dẫn tiếng Việt cố định của danh sách (.claude/rules/web-routing-rsc.md — không đổi khi chưa hỏi). */
  path: GroupFeaturePath;
  /** Form tạo nhóm (khu đăng nhập). */
  createPath: `/tao-nhom/${GroupKind}`;
  subKinds: readonly GroupSubKind[];
  /** Icon lucide (strokeWidth 1.75) — khớp app: ride Car, sport Trophy. */
  Icon: LucideIcon;
  /** Class đầy đủ (Tailwind quét được): nền nhạt, màu icon / chữ, chấm màu đặc. */
  tone: { soft: string; fg: string; dot: string };
  /** Ghép xe có điểm đi → điểm đến; ghép trận chỉ có sân (lưu ở origin_text). */
  hasDestination: boolean;
  /**
   * Đội đã có sẵn người (attributes.players_have, tính cả chủ nhóm): form có công tắc + ô số cạnh "số người cần thêm";
   * thẻ / chi tiết hiện đội hình qua groupLineup() của @hp/shared. Khớp app (config.form.lineup).
   */
  hasLineup: boolean;
  /** JSON-LD trang chi tiết (.claude/rules/web-seo-public.md). null = không có loại phù hợp. */
  jsonLd: 'event' | null;
};

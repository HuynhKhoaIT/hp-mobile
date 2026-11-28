// Nhắn Zalo bán tự động của staff (admin web): staff soạn tin cho lead / người dùng, DB ghi nhận + trừ hạn mức, web mở
// link zalo.me để staff dán tin và bấm Gửi. Hợp đồng với migration 20261129090000_zalo_outreach (RPC reserve_zalo_message,
// zalo_status, bảng zalo_messages) — ZALO_LIMITS khớp các hằng trong SQL; đổi một bên → đổi bên kia.
import { z } from 'zod';

/** Đối tượng nhận tin: lead marketing (SĐT) hoặc người dùng (SĐT trong hồ sơ). */
export const ZALO_TARGETS = ['lead', 'user'] as const;
export type ZaloTarget = (typeof ZALO_TARGETS)[number];

/** Loại tin: khung tin soạn sẵn `admin.zalo.template.<kind>` (staff sửa lại trước khi gửi). */
export const ZALO_KINDS = [
  'lead_reply',
  'listing_notice',
  'warning',
  'custom',
  'service_followup',
  'rating_request',
  'accepted_customer',
  'accepted_pro',
] as const;
export type ZaloKind = (typeof ZALO_KINDS)[number];

/** Tin báo tự động khi khách chốt báo giá (Edge Function zalo-notify): không có trong hộp thoại nhắn tay, chỉ có mẫu để admin sửa. */
export const ZALO_NOTICE_KINDS = ['accepted_customer', 'accepted_pro'] as const satisfies readonly ZaloKind[];

/** Loại tin theo ngữ cảnh mở hộp thoại: lead / người dùng (chung) và chăm sóc sau đơn Gọi thợ (CSKH). */
export const ZALO_GENERAL_KINDS = ['lead_reply', 'listing_notice', 'warning', 'custom'] as const satisfies readonly ZaloKind[];
export const ZALO_CSKH_KINDS = ['service_followup', 'rating_request', 'custom'] as const satisfies readonly ZaloKind[];

/** Lý do chưa gửi được (RPC trả `ok: false`). */
export const ZALO_BLOCK_REASONS = ['limit_reached', 'waiting'] as const;
export type ZaloBlockReason = (typeof ZALO_BLOCK_REASONS)[number];

/**
 * Giới hạn nhắn Zalo cá nhân (tránh Zalo hạn chế tài khoản của staff). Cùng giá trị với SQL:
 * hạn mức ngày chọn ngẫu nhiên trong [dailyMin, dailyMax]; giữa 2 tin nghỉ ngẫu nhiên [delayMin, delayMax] giây.
 */
export const ZALO_LIMITS = {
  dailyMin: 15,
  dailyMax: 30,
  delayMinSeconds: 60,
  delayMaxSeconds: 180,
  contentMax: 2000,
  historyLimit: 20,
} as const;

/** Staff ghi nhận 1 tin (RPC reserve_zalo_message). SĐT không đi qua client: server tra theo đối tượng. */
export const ReserveZaloMessageInput = z.object({
  targetType: z.enum(ZALO_TARGETS, 'invalid_input'),
  targetId: z.uuid('invalid_input'),
  kind: z.enum(ZALO_KINDS, 'invalid_input'),
  content: z.string('invalid_input').trim().min(1, 'required').max(ZALO_LIMITS.contentMax, 'too_long'),
});
export type ReserveZaloMessageInput = z.input<typeof ReserveZaloMessageInput>;

/** Trạng thái quét QR kết nối Zalo (bảng zalo_qr_sessions) và trạng thái tài khoản Zalo đã kết nối (zalo_accounts). */
export const ZALO_QR_STATUSES = ['waiting_scan', 'scanned', 'confirmed', 'expired', 'declined', 'error'] as const;
export type ZaloQrStatus = (typeof ZALO_QR_STATUSES)[number];
export const ZALO_ACCOUNT_STATUSES = ['connected', 'expired'] as const;
export type ZaloAccountStatus = (typeof ZALO_ACCOUNT_STATUSES)[number];

/** Nhật ký tin (view zalo_message_log): kiểu gửi (manual = staff tự dán, auto = Edge Function gửi) và trạng thái gửi. */
export const ZALO_MODES = ['manual', 'auto'] as const;
export type ZaloMode = (typeof ZALO_MODES)[number];
export const ZALO_DELIVERY_STATUSES = ['recorded', 'sending', 'sent', 'failed'] as const;
export type ZaloDeliveryStatus = (typeof ZALO_DELIVERY_STATUSES)[number];

/** Edge Function zalo-connect: tạo phiên QR (`start`) hoặc ngắt kết nối (`disconnect`). */
export const ZaloConnectInput = z.object({ action: z.enum(['start', 'disconnect'], 'invalid_input') });
export type ZaloConnectInput = z.input<typeof ZaloConnectInput>;

/** Lịch sử tin đã ghi nhận cho một đối tượng. */
export const ListZaloMessagesInput = z.object({
  targetType: z.enum(ZALO_TARGETS, 'invalid_input'),
  targetId: z.uuid('invalid_input'),
});
export type ListZaloMessagesInput = z.input<typeof ListZaloMessagesInput>;

// ── Cấu hình hạn mức + mẫu tin do admin chỉnh (migration 20261129130000_zalo_settings) ─────────────────────────
// ZALO_LIMITS ở trên là giá trị MẶC ĐỊNH ban đầu; giá trị đang dùng nằm ở bảng zalo_settings.

/** Cận an toàn của cấu hình (khớp CHECK của zalo_settings): không cho đặt mức dễ làm Zalo khoá tài khoản. */
export const ZALO_SETTINGS_BOUNDS = { dailyMin: 1, dailyMax: 50, delayMin: 30, delayMax: 900 } as const;

/** Admin đổi hạn mức ngày [dailyMin, dailyMax] tin và thời gian nghỉ [delayMin, delayMax] giây (RPC save_zalo_settings). */
export const SaveZaloSettingsInput = z
  .object({
    dailyMin: z.number('invalid_input').int('invalid_input').min(ZALO_SETTINGS_BOUNDS.dailyMin, 'invalid_input').max(ZALO_SETTINGS_BOUNDS.dailyMax, 'invalid_input'),
    dailyMax: z.number('invalid_input').int('invalid_input').min(ZALO_SETTINGS_BOUNDS.dailyMin, 'invalid_input').max(ZALO_SETTINGS_BOUNDS.dailyMax, 'invalid_input'),
    delayMin: z.number('invalid_input').int('invalid_input').min(ZALO_SETTINGS_BOUNDS.delayMin, 'invalid_input').max(ZALO_SETTINGS_BOUNDS.delayMax, 'invalid_input'),
    delayMax: z.number('invalid_input').int('invalid_input').min(ZALO_SETTINGS_BOUNDS.delayMin, 'invalid_input').max(ZALO_SETTINGS_BOUNDS.delayMax, 'invalid_input'),
  })
  .refine((v) => v.dailyMax >= v.dailyMin && v.delayMax >= v.delayMin, 'invalid_input');
export type SaveZaloSettingsInput = z.input<typeof SaveZaloSettingsInput>;

/**
 * Admin chọn Zalo CSKH (tài khoản Zalo đã kết nối của một staff) + bật / tắt tự báo khi chốt báo giá (RPC save_zalo_auto).
 * Bật thì bắt buộc có tài khoản gửi.
 */
export const SaveZaloAutoInput = z
  .object({ enabled: z.boolean('invalid_input'), senderId: z.uuid('invalid_input').nullable() })
  .refine((v) => !v.enabled || v.senderId !== null, 'invalid_input');
export type SaveZaloAutoInput = z.input<typeof SaveZaloAutoInput>;

/** Biến dùng được trong mẫu tin: {{name}} người nhận, {{app}} tên app, {{title}} tiêu đề đơn (chăm sóc sau dịch vụ). */
export const ZALO_TEMPLATE_VARS = ['name', 'app', 'title'] as const;
export type ZaloTemplateVar = (typeof ZALO_TEMPLATE_VARS)[number];

/** Admin lưu mẫu tin cho một loại tin (RPC save_zalo_template). */
export const SaveZaloTemplateInput = z.object({
  kind: z.enum(ZALO_KINDS, 'invalid_input'),
  content: z.string('invalid_input').trim().min(1, 'required').max(ZALO_LIMITS.contentMax, 'too_long'),
});
export type SaveZaloTemplateInput = z.input<typeof SaveZaloTemplateInput>;

/** Admin bỏ mẫu tuỳ chỉnh, quay về mặc định (RPC reset_zalo_template). */
export const ResetZaloTemplateInput = z.object({ kind: z.enum(ZALO_KINDS, 'invalid_input') });
export type ResetZaloTemplateInput = z.input<typeof ResetZaloTemplateInput>;

/**
 * Thay biến `{{name}}`, `{{app}}`, `{{title}}` (cho phép khoảng trắng trong ngoặc) bằng giá trị. Biến lạ giữ nguyên để admin /
 * staff nhìn thấy lỗi gõ; biến thiếu giá trị → chuỗi rỗng.
 */
export function renderZaloTemplate(template: string, vars: Partial<Record<ZaloTemplateVar, string>>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (whole, key: string) =>
    (ZALO_TEMPLATE_VARS as readonly string[]).includes(key) ? (vars[key as ZaloTemplateVar] ?? '') : whole,
  );
}

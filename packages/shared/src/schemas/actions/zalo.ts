// Nhắn Zalo bán tự động của staff (admin web): staff soạn tin cho lead / người dùng, DB ghi nhận + trừ hạn mức, web mở
// link zalo.me để staff dán tin và bấm Gửi. Hợp đồng với migration 20261129090000_zalo_outreach (RPC reserve_zalo_message,
// zalo_status, bảng zalo_messages) — ZALO_LIMITS khớp các hằng trong SQL; đổi một bên → đổi bên kia.
import { z } from 'zod';

/** Đối tượng nhận tin: lead marketing (SĐT) hoặc người dùng (SĐT trong hồ sơ). */
export const ZALO_TARGETS = ['lead', 'user'] as const;
export type ZaloTarget = (typeof ZALO_TARGETS)[number];

/** Loại tin: khung tin soạn sẵn `admin.zalo.template.<kind>` (staff sửa lại trước khi gửi). */
export const ZALO_KINDS = ['lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request'] as const;
export type ZaloKind = (typeof ZALO_KINDS)[number];

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

/** Lịch sử tin đã ghi nhận cho một đối tượng. */
export const ListZaloMessagesInput = z.object({
  targetType: z.enum(ZALO_TARGETS, 'invalid_input'),
  targetId: z.uuid('invalid_input'),
});
export type ListZaloMessagesInput = z.input<typeof ListZaloMessagesInput>;

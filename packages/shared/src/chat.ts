// Chat 1-1 + báo cáo / chặn (migration 20261102090000_chat). Dùng chung app, web, Edge Function.
/** Giới hạn tin nhắn (CHECK của messages.body) và phân trang. */
export const CHAT = {
  bodyMax: 2000,
  pageSize: 30,
  /** Ảnh chat: nén cạnh dài + chất lượng, ≤ 2 MB (bucket chat-images). */
  imageLongEdgePx: 1280,
  imageQuality: 0.8,
  imageMaxBytes: 2 * 1024 * 1024,
  /** Signed URL ảnh chat (bucket riêng tư). */
  signedUrlSeconds: 3600,
  /** Gửi sự kiện "đang gõ" tối đa mỗi 3 giây; ẩn sau 5 giây không có sự kiện mới. */
  typingThrottleMs: 3000,
  typingTimeoutMs: 5000,
  /** unread_count trả về tối đa (hiện "99+"). */
  unreadCap: 99,
} as const;

/** Kênh Broadcast riêng tư cho "đang gõ" (policy realtime.messages chỉ cho member). */
export const conversationTopic = (conversationId: string) => `conversation:${conversationId}`;

// Đối tượng / lý do báo cáo: REPORT_TARGETS, REPORT_REASONS ở enums.ts (CHECK reports.target_type / reason).

/** Trạng thái báo cáo (CHECK reports.status). */
export const REPORT_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_DETAIL_MAX = 500;

/** Path ảnh chat (đuôi theo content type). */
export function chatImagePath(conversationId: string, messageId: string, contentType: 'image/webp' | 'image/jpeg'): string {
  return `${conversationId}/${messageId}.${contentType === 'image/webp' ? 'webp' : 'jpg'}`;
}

/** "99+" khi vượt ngưỡng; 0 → null (không hiện chấm). */
export function unreadBadge(count: number | null | undefined): string | null {
  if (!count || count <= 0) return null;
  return count >= CHAT.unreadCap ? `${CHAT.unreadCap}+` : String(count);
}

/**
 * uuid v4 cho id tin nhắn sinh ở client. Dùng crypto của nền tảng khi có (web, Node), không thì Math.random
 * (Hermes cũ) — đủ cho id tin nhắn: trùng chỉ làm lần gửi đó báo conflict, không lộ dữ liệu.
 */
export function newUuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Mã lỗi khi tin nhắn bị lọc (trigger trg_messages_before_insert) — key ns errors. */
export const CHAT_CONTENT_ERRORS = ['message_has_phone', 'message_profanity'] as const;
export type ChatContentError = (typeof CHAT_CONTENT_ERRORS)[number];
export const isChatContentError = (code: string | null | undefined): code is ChatContentError =>
  (CHAT_CONTENT_ERRORS as readonly string[]).includes(code ?? '');

/**
 * Có số điện thoại VN trong tin nhắn? Cùng thuật toán với SQL has_phone_number (nguồn sự thật ở DB; client chỉ
 * báo sớm): bỏ dấu cách / . - _ ( ) / , * nằm giữa hai chữ số, rồi tìm 0 | 84 | +84 + 9–10 chữ số đứng riêng.
 */
export function hasPhoneNumber(text: string | null | undefined): boolean {
  if (!text) return false;
  const joined = text.replace(/(?<=\d)[\s._()/,*-]+(?=[\d+])/g, '');
  return /(^|\D)(\+?84|0)[1-9]\d{8,9}(\D|$)/.test(joined);
}

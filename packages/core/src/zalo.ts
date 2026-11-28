// Nhắn Zalo bán tự động của staff (web /admin) — migration 20261129090000_zalo_outreach.
// Client theo phiên STAFF (không service role): RPC kiểm is_staff(), ghi nhật ký zalo_messages + audit `zalo.send` trong cùng
// transaction. SĐT không đi qua client: reserve_zalo_message tra theo lead / hồ sơ và chỉ trả link zalo.me.
//   getZaloStatus        — hạn mức hôm nay (RPC zalo_status)
//   reserveZaloMessage   — ghi nhận 1 tin + trừ hạn mức → { ok: true, zalo_url } | { ok: false, reason } (hết lượt / đang nghỉ)
//   listZaloMessages     — lịch sử tin của một đối tượng (staff đọc bảng zalo_messages)
// Lỗi: forbidden (không phải staff), invalid_input, not_found, no_phone.
import type { Json } from '@hp/db';
import {
  ListZaloMessagesInput,
  ReserveZaloMessageInput,
  ZALO_BLOCK_REASONS,
  ZALO_LIMITS,
  type ZaloBlockReason,
  type ZaloKind,
  type ZaloTarget,
} from '@hp/shared';
import { type Client, fail, fromSupabase, ok, type Result } from './result';

/** Hạn mức nhắn Zalo hôm nay của staff (giờ VN). */
export type ZaloStatus = {
  quota: number;
  sent: number;
  remaining: number;
  /** Số giây còn phải nghỉ trước tin kế tiếp (0 = gửi được). */
  wait_seconds: number;
  next_allowed_at: string | null;
  can_send: boolean;
  reason: ZaloBlockReason | null;
};

export type ReserveZaloResult =
  | { ok: true; message_id: string; zalo_url: string; status: ZaloStatus }
  | { ok: false; reason: ZaloBlockReason; status: ZaloStatus };

export type ZaloMessage = {
  id: string;
  staff_id: string;
  staff_name: string | null;
  target_type: ZaloTarget;
  target_id: string;
  kind: ZaloKind;
  content: string;
  created_at: string;
};

const isRecord = (v: Json | undefined): v is { [key: string]: Json | undefined } => !!v && typeof v === 'object' && !Array.isArray(v);
const asInt = (v: Json | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const asReason = (v: Json | undefined): ZaloBlockReason | null =>
  typeof v === 'string' && (ZALO_BLOCK_REASONS as readonly string[]).includes(v) ? (v as ZaloBlockReason) : null;

/** jsonb của RPC → ZaloStatus (thiếu / sai kiểu → null, không đoán). */
function toStatus(v: Json | undefined): ZaloStatus | null {
  if (!isRecord(v)) return null;
  const quota = asInt(v.quota);
  const sent = asInt(v.sent);
  const remaining = asInt(v.remaining);
  const wait = asInt(v.wait_seconds);
  if (quota === null || sent === null || remaining === null || wait === null || typeof v.can_send !== 'boolean') return null;
  return {
    quota,
    sent,
    remaining,
    wait_seconds: wait,
    next_allowed_at: typeof v.next_allowed_at === 'string' ? v.next_allowed_at : null,
    can_send: v.can_send,
    reason: asReason(v.reason),
  };
}

export async function getZaloStatus(client: Client): Promise<Result<ZaloStatus>> {
  const res = await client.rpc('zalo_status');
  if (res.error) return fromSupabase<ZaloStatus>({ data: null, error: res.error });
  const status = toStatus(res.data);
  return status ? ok(status) : fail('unknown');
}

/** Ghi nhận 1 tin. `ok: false` không phải lỗi: UI hiện đếm ngược / hết lượt từ `status`. */
export async function reserveZaloMessage(client: Client, input: ReserveZaloMessageInput): Promise<Result<ReserveZaloResult>> {
  const parsed = ReserveZaloMessageInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const { targetType, targetId, kind, content } = parsed.data;
  const res = await client.rpc('reserve_zalo_message', { p_target_type: targetType, p_target_id: targetId, p_kind: kind, p_content: content });
  if (res.error) return fromSupabase<ReserveZaloResult>({ data: null, error: res.error });
  const v = res.data;
  if (!isRecord(v)) return fail('unknown');
  const status = toStatus(v.status);
  if (!status) return fail('unknown');
  if (v.ok === true) {
    return typeof v.message_id === 'string' && typeof v.zalo_url === 'string'
      ? ok({ ok: true, message_id: v.message_id, zalo_url: v.zalo_url, status })
      : fail('unknown');
  }
  const reason = asReason(v.reason);
  return reason ? ok({ ok: false, reason, status }) : fail('unknown');
}

/** Tin đã ghi nhận cho một lead / người dùng (mới nhất trước, ≤ ZALO_LIMITS.historyLimit), kèm tên staff gửi. */
export async function listZaloMessages(client: Client, input: ListZaloMessagesInput): Promise<Result<ZaloMessage[]>> {
  const parsed = ListZaloMessagesInput.safeParse(input);
  if (!parsed.success) return fail('invalid_input');
  const res = await client
    .from('zalo_messages')
    .select('id, staff_id, target_type, target_id, kind, content, created_at')
    .eq('target_type', parsed.data.targetType)
    .eq('target_id', parsed.data.targetId)
    .order('created_at', { ascending: false })
    .limit(ZALO_LIMITS.historyLimit);
  if (res.error) return fromSupabase<ZaloMessage[]>({ data: null, error: res.error });

  const ids = [...new Set(res.data.map((m) => m.staff_id))];
  const names = new Map<string, string | null>();
  if (ids.length > 0) {
    const profiles = await client.from('profiles').select('id, full_name').in('id', ids);
    if (!profiles.error) for (const p of profiles.data) names.set(p.id, p.full_name);
  }
  return ok(
    res.data.map((m) => ({
      id: m.id,
      staff_id: m.staff_id,
      staff_name: names.get(m.staff_id) ?? null,
      target_type: m.target_type as ZaloTarget,
      target_id: m.target_id,
      kind: m.kind as ZaloKind,
      content: m.content,
      created_at: m.created_at,
    })),
  );
}

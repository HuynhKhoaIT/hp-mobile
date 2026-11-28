'use server';

// Nhắn Zalo bán tự động (moderator+): hạn mức hôm nay, ghi nhận 1 tin, lịch sử tin của một đối tượng. RPC reserve_zalo_message
// kiểm hạn mức + thời gian nghỉ, ghi zalo_messages và audit `zalo.send` trong cùng transaction (không ghi lại ở đây); SĐT chỉ
// được tra ở DB và trả về dưới dạng link zalo.me. Không revalidate: dữ liệu chỉ hiện trong hộp thoại.
import {
  disconnectZalo,
  fail,
  getLatestZaloQr,
  getZaloAccount,
  getZaloStatus,
  listZaloMessages,
  ok,
  reserveZaloMessage,
  sendZaloMessage,
  startZaloConnect,
  type ReserveZaloResult,
  type ZaloAccount,
  type ZaloMessage,
  type ZaloQrSession,
  type ZaloSendResult,
  type ZaloStatus,
} from '@hp/core';
import type { ListZaloMessagesInput, ReserveZaloMessageInput, ZaloQrStatus } from '@hp/shared';
import type { ActionResult } from '@/lib/action-result';
import { asRecord, refreshAdmin, withStaff } from '../lib/server';

/** Tài khoản Zalo đã kết nối + lần quét QR gần nhất của người đang đăng nhập (trang Kết nối Zalo, hộp thoại Nhắn Zalo). */
export type ZaloConnection = { account: ZaloAccount | null; qr: ZaloQrSession | null };

export async function getZaloConnectionAction(): Promise<ActionResult<ZaloConnection>> {
  return withStaff('moderator', async (s) => {
    const [account, qr] = await Promise.all([getZaloAccount(s.supabase), getLatestZaloQr(s.supabase)]);
    if (account.error) return fail(account.error.code, account.error.message);
    return ok({ account: account.data, qr: qr.error ? null : qr.data });
  });
}

/** Tạo mã QR kết nối Zalo (Edge Function zalo-connect; có thể mất vài giây — trang gọi đặt maxDuration). */
export async function startZaloConnectAction(): Promise<ActionResult<{ qrId: string; status: ZaloQrStatus; image: string }>> {
  return withStaff('moderator', (s) => startZaloConnect(s.supabase));
}

export async function disconnectZaloAction(): Promise<ActionResult<null>> {
  const result = await withStaff('moderator', (s) => disconnectZalo(s.supabase));
  if (result.ok) refreshAdmin();
  return result;
}

/** Gửi ngay bằng Zalo đã kết nối (Edge Function zalo-send). `ok: false` = hết lượt / đang nghỉ. */
export async function sendZaloAutoAction(raw: unknown): Promise<ActionResult<ZaloSendResult>> {
  const v = asRecord(raw);
  return withStaff('moderator', (s) =>
    sendZaloMessage(s.supabase, { targetType: v.targetType, targetId: v.targetId, kind: v.kind, content: v.content } as ReserveZaloMessageInput),
  );
}

export async function getZaloStatusAction(): Promise<ActionResult<ZaloStatus>> {
  return withStaff('moderator', (s) => getZaloStatus(s.supabase));
}

export async function reserveZaloMessageAction(raw: unknown): Promise<ActionResult<ReserveZaloResult>> {
  const v = asRecord(raw);
  return withStaff('moderator', (s) =>
    reserveZaloMessage(s.supabase, { targetType: v.targetType, targetId: v.targetId, kind: v.kind, content: v.content } as ReserveZaloMessageInput),
  );
}

export async function listZaloMessagesAction(raw: unknown): Promise<ActionResult<ZaloMessage[]>> {
  const v = asRecord(raw);
  return withStaff('moderator', (s) => listZaloMessages(s.supabase, { targetType: v.targetType, targetId: v.targetId } as ListZaloMessagesInput));
}

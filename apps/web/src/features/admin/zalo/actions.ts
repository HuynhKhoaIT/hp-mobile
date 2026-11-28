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
  listZaloTemplates,
  ok,
  reserveZaloMessage,
  resetZaloTemplate,
  saveZaloAuto,
  saveZaloSettings,
  saveZaloTemplate,
  sendZaloMessage,
  startZaloConnect,
  type ReserveZaloResult,
  type ZaloAccount,
  type ZaloMessage,
  type ZaloQrSession,
  type ZaloSendResult,
  type ZaloStatus,
  type ZaloTemplate,
} from '@hp/core';
import type {
  ListZaloMessagesInput,
  ReserveZaloMessageInput,
  ResetZaloTemplateInput,
  SaveZaloAutoInput,
  SaveZaloSettingsInput,
  SaveZaloTemplateInput,
  ZaloQrStatus,
} from '@hp/shared';
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

// ── Cấu hình hạn mức + mẫu tin (admin ghi; moderator chỉ đọc mẫu để soạn tin) ────────────────────────────────────────────
// RPC save_zalo_settings / save_zalo_template / reset_zalo_template kiểm is_admin() và ghi audit trong cùng transaction.

/** Mẫu tin tuỳ chỉnh (hộp thoại Nhắn Zalo dùng để soạn sẵn). */
export async function getZaloTemplatesAction(): Promise<ActionResult<ZaloTemplate[]>> {
  return withStaff('moderator', (s) => listZaloTemplates(s.supabase));
}

export async function saveZaloSettingsAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  const r = await withStaff('admin', (s) =>
    saveZaloSettings(s.supabase, { dailyMin: v.dailyMin, dailyMax: v.dailyMax, delayMin: v.delayMin, delayMax: v.delayMax } as SaveZaloSettingsInput),
  );
  if (r.ok) refreshAdmin();
  return r;
}

/** Chọn Zalo CSKH + bật / tắt tự báo khi chốt báo giá (RPC save_zalo_auto kiểm is_admin() và ghi audit). */
export async function saveZaloAutoAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  const r = await withStaff('admin', (s) => saveZaloAuto(s.supabase, { enabled: v.enabled, senderId: v.senderId } as SaveZaloAutoInput));
  if (r.ok) refreshAdmin();
  return r;
}

export async function saveZaloTemplateAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  const r = await withStaff('admin', (s) => saveZaloTemplate(s.supabase, { kind: v.kind, content: v.content } as SaveZaloTemplateInput));
  if (r.ok) refreshAdmin();
  return r;
}

export async function resetZaloTemplateAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  const r = await withStaff('admin', (s) => resetZaloTemplate(s.supabase, { kind: v.kind } as ResetZaloTemplateInput));
  if (r.ok) refreshAdmin();
  return r;
}

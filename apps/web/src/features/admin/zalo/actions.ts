'use server';

// Nhắn Zalo bán tự động (moderator+): hạn mức hôm nay, ghi nhận 1 tin, lịch sử tin của một đối tượng. RPC reserve_zalo_message
// kiểm hạn mức + thời gian nghỉ, ghi zalo_messages và audit `zalo.send` trong cùng transaction (không ghi lại ở đây); SĐT chỉ
// được tra ở DB và trả về dưới dạng link zalo.me. Không revalidate: dữ liệu chỉ hiện trong hộp thoại.
import {
  getZaloStatus,
  listZaloMessages,
  reserveZaloMessage,
  type ReserveZaloResult,
  type ZaloMessage,
  type ZaloStatus,
} from '@hp/core';
import type { ListZaloMessagesInput, ReserveZaloMessageInput } from '@hp/shared';
import type { ActionResult } from '@/lib/action-result';
import { asRecord, withStaff } from '../lib/server';

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

// Chat 1-1 + chat nhóm (migration 20261102090000_chat, 20261103100000_group_lifecycle_chat). Hội thoại tạo qua RPC; tin nhắn insert qua PostgREST + RLS;
// ảnh ở bucket riêng tư chat-images (signed URL); realtime: postgres_changes trên messages + Broadcast "đang gõ".
import type { Database, Tables } from '@hp/db';
import { CHAT, chatImagePath, conversationTopic, SendMessageInput } from '@hp/shared';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { type Client, clampLimit, fail, fromSupabase, ok, type Result, toAppError } from './result';
import type { Page } from './social';

export type ConversationSummary = Database['public']['Functions']['list_conversations']['Returns'][number];
export type Message = Tables<'messages'>;
/** Tin nhắn trong cache client: thêm trạng thái gửi (optimistic) và ảnh cục bộ khi chưa upload xong. */
export type ChatMessage = Message & { status?: 'sending' | 'failed'; localImageUri?: string | null };

/** Mở (hoặc lấy lại) hội thoại với chủ tin. Lỗi: auth_required, banned, not_found, cannot_chat_self, blocked. */
export async function startListingConversation(client: Client, listingId: string): Promise<Result<string>> {
  return fromSupabase<string>(await client.rpc('start_listing_conversation', { p_listing_id: listingId }), true);
}

/** Hộp thư: mới nhất trước, cursor = thời điểm tin cuối (hoặc lúc tạo) của dòng cuối trang. */
export async function listConversations(
  client: Client,
  opts: { cursor?: string | null; limit?: number } = {},
): Promise<Result<Page<ConversationSummary>>> {
  const limit = clampLimit(opts.limit);
  const res = fromSupabase(await client.rpc('list_conversations', { p_limit: limit, p_cursor: opts.cursor ?? undefined }));
  if (res.error) return res;
  const items = res.data ?? [];
  const last = items.at(-1);
  return ok({ items, nextCursor: items.length === limit && last ? (last.last_message_at ?? last.created_at) : null });
}

/** Một hội thoại (header màn chat). */
export async function getConversation(client: Client, conversationId: string): Promise<Result<ConversationSummary>> {
  const res = fromSupabase(await client.rpc('list_conversations', { p_limit: 1, p_conversation_id: conversationId }));
  if (res.error) return res;
  const row = res.data?.[0];
  return row ? ok(row) : fail('not_found');
}

/** Chat nhóm của một nhóm (chỉ chủ nhóm / thành viên accepted thấy — RLS conversations). Không phải member → null. */
export async function getGroupConversationId(client: Client, groupId: string): Promise<Result<string | null>> {
  const res = fromSupabase<{ id: string } | null>(
    await client.from('conversations').select('id').eq('context_type', 'group').eq('context_id', groupId).maybeSingle(),
  );
  return res.error ? res : ok(res.data?.id ?? null);
}

export type ConversationMember = Database['public']['Functions']['list_conversation_members']['Returns'][number];

/** Thành viên hội thoại (chat nhóm: tên "An N." + avatar người gửi). Không phải member → rỗng. */
export async function listConversationMembers(client: Client, conversationId: string): Promise<Result<ConversationMember[]>> {
  const res = fromSupabase<ConversationMember[]>(await client.rpc('list_conversation_members', { p_conversation_id: conversationId }));
  return res.error ? res : ok(res.data ?? []);
}

/** Tin nhắn mới nhất trước (client đảo ngược khi hiện). Cursor = created_at của tin cũ nhất trang. */
export async function listMessages(
  client: Client,
  opts: { conversationId: string; cursor?: string | null; limit?: number },
): Promise<Result<Page<Message>>> {
  const limit = clampLimit(opts.limit, CHAT.pageSize);
  let q = client
    .from('messages')
    .select('*')
    .eq('conversation_id', opts.conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.cursor) q = q.lt('created_at', opts.cursor);
  const res = fromSupabase(await q);
  if (res.error) return res;
  const items = res.data ?? [];
  return ok({ items, nextCursor: items.length === limit ? (items.at(-1)?.created_at ?? null) : null });
}

/**
 * Gửi tin. `id` do client sinh; gửi lại cùng id sau lỗi mạng → bản đã lưu (không trùng).
 * Lỗi: invalid_input / too_long / required, forbidden (không phải member, bị chặn, bị cấm), rate_limited.
 */
export async function sendMessage(client: Client, input: SendMessageInput): Promise<Result<Message>> {
  const parsed = SendMessageInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'invalid_input');
  const v = parsed.data;
  const res = await client
    .from('messages')
    .insert({ id: v.id, conversation_id: v.conversationId, body: v.body || null, image_path: v.imagePath ?? null })
    .select('*')
    .single();
  if (res.error && toAppError(res.error).code === 'conflict') {
    return fromSupabase<Message>(await client.from('messages').select('*').eq('id', v.id).maybeSingle(), true);
  }
  return fromSupabase<Message>(res, true);
}

/** Upload ảnh (đã nén ≤ 2 MB) trước khi gửi: path `{conversationId}/{messageId}.webp`. Upload lại cùng path coi như xong. */
export async function uploadChatImage(
  client: Client,
  v: { conversationId: string; messageId: string; body: ArrayBuffer | Blob; contentType: 'image/webp' | 'image/jpeg' },
): Promise<Result<string>> {
  const path = chatImagePath(v.conversationId, v.messageId, v.contentType);
  const up = await client.storage.from('chat-images').upload(path, v.body, { contentType: v.contentType, upsert: false });
  if (up.error) {
    const status = String((up.error as { statusCode?: string | number }).statusCode ?? '');
    if (status === '409' || /exists/i.test(up.error.message)) return ok(path);
    return fail(status === '413' ? 'file_too_large' : status === '403' ? 'forbidden' : 'upload_failed');
  }
  return ok(path);
}

/** Signed URL (1 giờ) cho nhiều ảnh chat. `transform` = false khi project không có Image Transformation. */
export async function chatImageUrls(
  client: Client,
  paths: string[],
  opts: { transform?: boolean } = {},
): Promise<Result<Record<string, string>>> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return ok({});
  const bucket = client.storage.from('chat-images');
  if (opts.transform === false) {
    const res = await bucket.createSignedUrls(unique, CHAT.signedUrlSeconds);
    if (res.error) return fail('not_found');
    return ok(Object.fromEntries(res.data.flatMap((r) => (r.path && r.signedUrl ? [[r.path, r.signedUrl]] : []))));
  }
  // createSignedUrls chưa nhận transform → ký từng ảnh (song song, ≤ 1 trang tin nhắn)
  const entries = await Promise.all(
    unique.map(async (p) => {
      const r = await bucket.createSignedUrl(p, CHAT.signedUrlSeconds, { transform: { width: 800, quality: 75 } });
      return r.data ? ([p, r.data.signedUrl] as const) : null;
    }),
  );
  return ok(Object.fromEntries(entries.filter((e): e is readonly [string, string] => e !== null)));
}

/** Đánh dấu đã đọc hội thoại (+ thông báo new_message của nó). */
export async function markConversationRead(client: Client, conversationId: string): Promise<Result<null>> {
  const res = await client.rpc('mark_conversation_read', { p_conversation_id: conversationId });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

/** Số hội thoại có tin chưa đọc (chấm đỏ tab Chat). */
export async function countUnreadConversations(client: Client): Promise<Result<number>> {
  const res = fromSupabase<number>(await client.rpc('count_unread_conversations'));
  return res.error ? res : ok(res.data ?? 0);
}

/** Tắt / bật thông báo của một hội thoại (dòng của chính mình). */
export async function setConversationMuted(
  client: Client,
  v: { conversationId: string; userId: string; muted: boolean },
): Promise<Result<null>> {
  const res = await client
    .from('conversation_members')
    .update({ muted: v.muted })
    .match({ conversation_id: v.conversationId, user_id: v.userId });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

// ── Realtime ────────────────────────────────────────────────────────────────────

/**
 * Nghe tin nhắn mới. Có `conversationId` → lọc theo hội thoại (màn chat); không có → mọi hội thoại của mình
 * (hộp thư, RLS lọc). Trả hàm huỷ — gọi khi rời màn để giữ ≤ 5 kênh / thiết bị.
 */
export function subscribeToMessages(
  client: Client,
  v: { conversationId?: string; onInsert: (message: Message) => void },
): () => void {
  const channel = client
    .channel(v.conversationId ? `messages:${v.conversationId}` : 'messages:inbox')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        ...(v.conversationId ? { filter: `conversation_id=eq.${v.conversationId}` } : {}),
      },
      (payload) => v.onInsert(payload.new as Message),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

/** "Đang gõ" qua Broadcast riêng tư `conversation:{id}` (chỉ member). Không ghi DB. */
export function joinTypingChannel(
  client: Client,
  v: { conversationId: string; userId: string; onTyping: (userId: string) => void },
): { sendTyping: () => void; leave: () => void } {
  const channel: RealtimeChannel = client
    .channel(conversationTopic(v.conversationId), { config: { private: true, broadcast: { self: false } } })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      const from = (payload as { userId?: string } | undefined)?.userId;
      if (from && from !== v.userId) v.onTyping(from);
    })
    .subscribe();
  let last = 0;
  return {
    sendTyping: () => {
      const now = Date.now();
      if (now - last < CHAT.typingThrottleMs) return;
      last = now;
      void channel.send({ type: 'broadcast', event: 'typing', payload: { userId: v.userId } });
    },
    leave: () => {
      void client.removeChannel(channel);
    },
  };
}

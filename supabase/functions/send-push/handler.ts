// send-push — DB webhook (trg_notifications_push) khi có notification mới → push Expo tới mọi máy của người nhận.
// Bỏ qua: đã push / đã đọc, người nhận không có token (web-only), đã tắt nhóm này, đã xoá tài khoản, tin nhắn cùng
// hội thoại đã push trong COLLAPSE_SECONDS. Sau khi gửi: ghi notifications.pushed_at, xoá token Expo báo
// DeviceNotRegistered. Trường hợp "bỏ qua" trả 200 (webhook không cần thử lại). Log không có nội dung / token.
import { isPushEnabled } from '../../../packages/shared/src/notifications.ts';
import { AppError, handler } from '../_shared/http.ts';
import { buildMessages, COLLAPSE_SECONDS, deadTokens, type NotificationRow, sendExpo } from '../_shared/push.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const sendPush = handler({ auth: 'webhook' }, async ({ req, admin, log }) => {
  const body = (await req.json()) as { notification_id?: unknown };
  const id = typeof body.notification_id === 'string' && UUID.test(body.notification_id) ? body.notification_id : null;
  if (!id) throw new AppError('invalid_input', 400);

  // admin (service role): đọc notification + push_tokens của người khác — client không có quyền này.
  const { data: n, error } = await admin
    .from('notifications')
    .select('id, user_id, type, title_key, body_key, params, data, pushed_at, read_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!n) return { skipped: 'not_found' };
  if (n.pushed_at || n.read_at) return { skipped: 'already_handled' };

  const { data: p } = await admin
    .from('profiles')
    .select('push_tokens, locale, notification_prefs, deleted_at')
    .eq('id', n.user_id)
    .maybeSingle();
  const tokens: string[] = p?.push_tokens ?? [];
  if (!p || p.deleted_at || tokens.length === 0) return { skipped: 'no_tokens' };
  if (!isPushEnabled(p.notification_prefs, n.type)) return { skipped: 'disabled' };

  // Gộp tin nhắn: cùng hội thoại đã push trong 1 phút → người nhận đã được báo, không rung tiếp.
  const conversationId = (n.data as { params?: { id?: string } } | null)?.params?.id;
  if (n.type === 'new_message' && conversationId) {
    const since = new Date(Date.now() - COLLAPSE_SECONDS * 1000).toISOString();
    const { count } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', n.user_id)
      .eq('type', 'new_message')
      .eq('data->params->>id', conversationId)
      .gte('pushed_at', since);
    if ((count ?? 0) > 0) return { skipped: 'collapsed' };
  }

  const messages = buildMessages(n as NotificationRow, p.locale, tokens);
  if (messages.length === 0) return { skipped: 'no_template' };
  const tickets = await sendExpo(messages, {
    url: Deno.env.get('EXPO_PUSH_URL') || undefined,
    accessToken: Deno.env.get('EXPO_ACCESS_TOKEN') || undefined,
  });

  await admin.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', n.id);
  const dead = deadTokens(messages, tickets);
  if (dead.length > 0) {
    await admin.from('profiles').update({ push_tokens: tokens.filter((t) => !dead.includes(t)) }).eq('id', n.user_id);
  }
  log('push_sent', {
    type: n.type,
    devices: messages.length,
    failed: tickets.filter((t) => t.status === 'error').length,
    removed: dead.length,
  });
  return { sent: messages.length, removed: dead.length };
});

// Push qua Expo (dùng ở send-push). Logic thuần (dựng tin, đọc kết quả) tách khỏi I/O để test bằng deno test.
// Template: _shared/i18n.ts (ns `push` theo profiles.locale, thiếu → vi). Payload data = { screen, params } đúng
// NOTIFICATION_SCREENS — app mở màn bằng notificationTarget().
import { interpolate } from '../../../packages/shared/src/notifications.ts';
import { pushTemplate } from './i18n.ts';

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Gộp tin nhắn: đã push cho cùng hội thoại trong khoảng này → không push nữa (người nhận đã được báo). */
export const COLLAPSE_SECONDS = 60;

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title_key: string;
  body_key: string | null;
  params: Record<string, unknown> | null;
  data: Record<string, unknown> | null;
};

export type ExpoMessage = {
  to: string;
  title: string;
  body?: string;
  data: Record<string, unknown>;
  sound: 'default';
  channelId: 'default';
  /** Android: thông báo cùng hội thoại thay nhau thay vì chồng lên. */
  collapseId?: string;
  threadId?: string;
};

export type ExpoTicket = { status: 'ok'; id: string } | { status: 'error'; message?: string; details?: { error?: string } };

/** id hội thoại / tin… dùng để gộp push trên máy (Android collapseId, iOS threadId). */
export function collapseKey(n: NotificationRow): string | undefined {
  const id = (n.data?.params as { id?: unknown } | undefined)?.id;
  return typeof id === 'string' ? `${n.type}:${id}` : undefined;
}

/** Dựng tin push cho mọi token của người nhận. Thiếu template tiêu đề → không gửi (trả mảng rỗng). */
export function buildMessages(n: NotificationRow, locale: string | null, tokens: string[]): ExpoMessage[] {
  const titleTpl = pushTemplate(locale, n.title_key);
  if (!titleTpl) return [];
  const params = n.params ?? {};
  const title = interpolate(titleTpl, params).slice(0, 120);
  const bodyTpl = n.body_key ? pushTemplate(locale, n.body_key) : null;
  const body = bodyTpl ? interpolate(bodyTpl, params).slice(0, 240) : undefined;
  const key = collapseKey(n);
  return tokens.map((to) => ({
    to,
    title,
    ...(body ? { body } : {}),
    data: { ...(n.data ?? {}), notification_id: n.id },
    sound: 'default',
    channelId: 'default',
    ...(key ? { collapseId: key, threadId: key } : {}),
  }));
}

/** Token Expo báo hỏng (DeviceNotRegistered) → xoá khỏi profiles.push_tokens. */
export function deadTokens(messages: ExpoMessage[], tickets: ExpoTicket[]): string[] {
  return messages.flatMap((m, i) => {
    const t = tickets[i];
    return t && t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? [m.to] : [];
  });
}

/** Gửi lên Expo (≤ 100 tin / lần — một người tối đa 5 token nên một lần là đủ). */
export async function sendExpo(
  messages: ExpoMessage[],
  opts: { url?: string; accessToken?: string; fetchImpl?: typeof fetch } = {},
): Promise<ExpoTicket[]> {
  if (messages.length === 0) return [];
  const res = await (opts.fetchImpl ?? fetch)(opts.url || EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(opts.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) throw new Error(`expo_push_http_${res.status}`);
  const json = (await res.json()) as { data?: ExpoTicket[] };
  return json.data ?? [];
}

// deno test --allow-all supabase/functions — logic thuần của push (không gọi mạng).
import { deepStrictEqual as assertEquals } from 'node:assert/strict';
import { pushTemplate } from './i18n.ts';
import { buildMessages, collapseKey, deadTokens, type ExpoTicket, type NotificationRow, sendExpo } from './push.ts';

const msg: NotificationRow = {
  id: 'n1',
  user_id: 'u1',
  type: 'new_message',
  title_key: 'new_message.title',
  body_key: 'new_message.body',
  params: { sender_name: 'An N.', preview: 'Còn hàng không ạ?' },
  data: { screen: 'chat', params: { id: 'c1' } },
};

Deno.test('pushTemplate: theo locale, thiếu → vi, khoá lạ → null', () => {
  assertEquals(pushTemplate('en', 'new_message.image'), 'Sent a photo');
  assertEquals(pushTemplate('fr', 'new_message.image'), 'Đã gửi một ảnh');
  assertEquals(pushTemplate('vi', 'nope.title'), null);
});

Deno.test('buildMessages: điền tham số, data giữ deep link, gộp theo hội thoại', () => {
  const [m] = buildMessages(msg, 'vi', ['ExponentPushToken[a]']);
  assertEquals(m.title, 'An N.');
  assertEquals(m.body, 'Còn hàng không ạ?');
  assertEquals(m.data, { screen: 'chat', params: { id: 'c1' }, notification_id: 'n1' });
  assertEquals(m.collapseId, 'new_message:c1');
  assertEquals(collapseKey({ ...msg, data: {} }), undefined);
  assertEquals(buildMessages({ ...msg, title_key: 'missing.title' }, 'vi', ['ExponentPushToken[a]']), []);
  assertEquals(buildMessages(msg, 'vi', ['ExponentPushToken[a]', 'ExponentPushToken[b]']).length, 2);
});

Deno.test('buildMessages: listing_rejected tiếng Trung', () => {
  const [m] = buildMessages(
    { ...msg, type: 'listing_rejected', title_key: 'listing_rejected.title', body_key: 'listing_rejected.body', params: { title: '风扇' } },
    'zh',
    ['ExponentPushToken[a]'],
  );
  assertEquals(m.body?.includes('风扇'), true);
});

Deno.test('deadTokens: chỉ DeviceNotRegistered', () => {
  const messages = buildMessages(msg, 'vi', ['ExponentPushToken[a]', 'ExponentPushToken[b]', 'ExponentPushToken[c]']);
  const tickets: ExpoTicket[] = [
    { status: 'ok', id: 't1' },
    { status: 'error', details: { error: 'DeviceNotRegistered' } },
    { status: 'error', details: { error: 'MessageRateExceeded' } },
  ];
  assertEquals(deadTokens(messages, tickets), ['ExponentPushToken[b]']);
});

Deno.test('sendExpo: đúng URL / header, đọc tickets; rỗng → không gọi', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fakeFetch = ((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(new Response(JSON.stringify({ data: [{ status: 'ok', id: 'x' }] })));
  }) as typeof fetch;
  const tickets = await sendExpo(buildMessages(msg, 'vi', ['ExponentPushToken[a]']), {
    url: 'http://mock/push',
    accessToken: 'tok',
    fetchImpl: fakeFetch,
  });
  assertEquals(tickets, [{ status: 'ok', id: 'x' }]);
  assertEquals(calls[0]?.url, 'http://mock/push');
  assertEquals((calls[0]?.init?.headers as Record<string, string>).Authorization, 'Bearer tok');
  assertEquals(await sendExpo([], { fetchImpl: fakeFetch }), []);
  assertEquals(calls.length, 1);
});

// Chạy: node --experimental-strip-types --test supabase/functions/_shared/zaloNotice.test.ts (hoặc deno test --allow-all).
// Tin báo tự động khi chốt báo giá: parse input webhook / kết quả RPC, chọn mẫu, thay biến. Dữ liệu dưới đây là GIẢ.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildNotices, parseNoticeTargets, parseNotifyRequestId, renderNotice, ZALO_APP_NAME } from './zaloNotice.ts';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const S = '33333333-3333-4333-8333-333333333333';
const rpc = (over: Record<string, unknown> = {}) => ({
  sender: S,
  title: 'Sửa vòi nước',
  customer: { id: A, name: 'Lan' },
  pro: { id: B, name: 'Hùng' },
  templates: {},
  ...over,
});

test('request_id: chỉ nhận uuid', () => {
  assert.equal(parseNotifyRequestId({ request_id: A }), A);
  assert.equal(parseNotifyRequestId({ request_id: 'x' }), null);
  assert.equal(parseNotifyRequestId(null), null);
  assert.equal(parseNotifyRequestId([A]), null);
});

test('renderNotice: thay biến, giữ biến lạ, biến thiếu → rỗng', () => {
  assert.equal(renderNotice('Hi {{ name }} {{x}} {{title}}', { name: 'A' }), 'Hi A {{x}} ');
});

test('parseNoticeTargets: null / thiếu trường → null', () => {
  assert.equal(parseNoticeTargets(null), null);
  assert.equal(parseNoticeTargets(rpc({ sender: 'x' })), null);
  assert.equal(parseNoticeTargets(rpc({ customer: { id: 'x', name: '' } })), null);
  assert.equal(parseNoticeTargets(rpc({ title: 5 })), null);
});

test('buildNotices: dùng bản mặc định, thứ tự khách → thợ', () => {
  const t = parseNoticeTargets(rpc());
  assert.ok(t);
  const [c, p] = buildNotices(t);
  assert.deepEqual([c?.kind, c?.targetId], ['accepted_customer', A]);
  assert.deepEqual([p?.kind, p?.targetId], ['accepted_pro', B]);
  assert.ok(c?.content.includes('Lan') && c.content.includes('Sửa vòi nước') && c.content.includes(ZALO_APP_NAME));
  assert.ok(p?.content.includes('Hùng'));
  assert.ok(!c?.content.includes('{{') && !p?.content.includes('{{'));
});

test('buildNotices: mẫu của admin ghi đè mặc định; mẫu rỗng bị bỏ; tên trống → "bạn"', () => {
  const t = parseNoticeTargets(rpc({ customer: { id: A, name: '' }, templates: { accepted_customer: 'Chào {{name}}!', accepted_pro: '   ' } }));
  assert.ok(t);
  const [c, p] = buildNotices(t);
  assert.equal(c?.content, 'Chào bạn!');
  assert.ok(p?.content.includes('báo giá của bạn'));
});

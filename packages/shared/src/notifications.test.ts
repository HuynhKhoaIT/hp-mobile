// Chạy: pnpm --filter @hp/shared test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interpolate, isExpoPushToken, isPushEnabled, notificationTarget, prefKeyOfType } from './notifications.ts';

test('prefKeyOfType / isPushEnabled: thiếu khoá = bật, loại lạ luôn bật', () => {
  assert.equal(prefKeyOfType('new_message'), 'messages');
  assert.equal(prefKeyOfType('listing_rejected'), 'listings');
  assert.equal(prefKeyOfType('system'), null);
  assert.equal(isPushEnabled({}, 'new_message'), true);
  assert.equal(isPushEnabled({ messages: false }, 'new_message'), false);
  assert.equal(isPushEnabled({ messages: false }, 'listing_approved'), true);
  assert.equal(isPushEnabled(null, 'new_message'), true);
  assert.equal(isPushEnabled({ messages: false }, 'system'), true);
});

test('notificationTarget: payload hợp lệ / thiếu id / sai screen → thông báo', () => {
  assert.deepEqual(notificationTarget({ screen: 'chat', params: { id: 'c1' } }), { screen: 'chat', id: 'c1' });
  assert.deepEqual(notificationTarget({ screen: 'listing', params: {} }), { screen: 'notifications', id: null });
  assert.deepEqual(notificationTarget({ screen: 'hack', params: { id: 'x' } }), { screen: 'notifications', id: null });
  assert.deepEqual(notificationTarget(null), { screen: 'notifications', id: null });
  assert.deepEqual(notificationTarget({ screen: 'notifications' }), { screen: 'notifications', id: null });
});

test('isExpoPushToken', () => {
  assert.equal(isExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'), true);
  assert.equal(isExpoPushToken('ExpoPushToken[abc-123_X]'), true);
  assert.equal(isExpoPushToken('fcm:abc'), false);
  assert.equal(isExpoPushToken('ExponentPushToken[]'), false);
});

test('interpolate: điền {{x}}, thiếu → rỗng', () => {
  assert.equal(interpolate('Tin "{{title}}" đã duyệt', { title: 'Quạt' }), 'Tin "Quạt" đã duyệt');
  assert.equal(interpolate('{{ sender_name }}: {{preview}}', { sender_name: 'An N.' }), 'An N.: ');
});

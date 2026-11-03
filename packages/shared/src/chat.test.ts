// Chạy: pnpm --filter @hp/shared test. Module được test không import gì có đuôi thiếu (node --test).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHAT, chatImagePath, hasPhoneNumber, newUuid, unreadBadge } from './chat.ts';

const conv = '0b7c3c8e-1f2a-4d3b-9c8e-1f2a4d3b9c8e';
const msg = '7a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

test('chatImagePath: {conversation}/{message}.webp | .jpg', () => {
  assert.equal(chatImagePath(conv, msg, 'image/webp'), `${conv}/${msg}.webp`);
  assert.equal(chatImagePath(conv, msg, 'image/jpeg'), `${conv}/${msg}.jpg`);
});

test('unreadBadge: ẩn khi 0, "99+" khi chạm trần', () => {
  assert.equal(unreadBadge(0), null);
  assert.equal(unreadBadge(null), null);
  assert.equal(unreadBadge(3), '3');
  assert.equal(unreadBadge(CHAT.unreadCap), '99+');
});

test('newUuid: dạng uuid v4', () => {
  const id = newUuid();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(newUuid(), id);
});

test('hasPhoneNumber: cùng bộ ví dụ với pgTAP 060_chat', () => {
  for (const s of ['gọi em 0912345678 nhé', 'zalo 0912.345.678', 'sdt: 0 9 1 2 3 4 5 6 7 8', '+84 912 345 678', '84-912-345-678'])
    assert.equal(hasPhoneNumber(s), true, s);
  for (const s of ['giá 2.500.000đ, bớt 300.000', 'phòng 12, tầng 3, 5h chiều', 'Nồi còn bảo hành 6 tháng, giá 200.000đ', '', null])
    assert.equal(hasPhoneNumber(s), false, String(s));
});

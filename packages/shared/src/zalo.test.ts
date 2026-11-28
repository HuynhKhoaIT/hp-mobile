// Chạy: pnpm --filter @hp/shared test. Hợp đồng Zalo bán tự động (khớp migration zalo_outreach).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ListZaloMessagesInput, ReserveZaloMessageInput, ZALO_KINDS, ZALO_LIMITS } from './schemas/actions/zalo.ts';

const ID = '00000000-0000-4000-8000-0000000a0001';

test('ZALO_LIMITS: khoảng hạn mức và thời gian nghỉ hợp lệ, khớp SQL (15..30 tin, 60..180 giây)', () => {
  assert.equal(ZALO_LIMITS.dailyMin, 15);
  assert.equal(ZALO_LIMITS.dailyMax, 30);
  assert.equal(ZALO_LIMITS.delayMinSeconds, 60);
  assert.equal(ZALO_LIMITS.delayMaxSeconds, 180);
  assert.ok(ZALO_LIMITS.dailyMin <= ZALO_LIMITS.dailyMax);
  assert.ok(ZALO_LIMITS.delayMinSeconds <= ZALO_LIMITS.delayMaxSeconds);
});

test('ReserveZaloMessageInput: cắt khoảng trắng, nhận mọi loại tin hợp lệ', () => {
  for (const kind of ZALO_KINDS) {
    const r = ReserveZaloMessageInput.safeParse({ targetType: 'lead', targetId: ID, kind, content: '  Chào anh  ' });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.content, 'Chào anh');
  }
});

test('ReserveZaloMessageInput: từ chối nội dung rỗng / quá dài, đối tượng hoặc loại lạ, id sai', () => {
  const ok = { targetType: 'user', targetId: ID, kind: 'custom', content: 'x' };
  assert.equal(ReserveZaloMessageInput.safeParse(ok).success, true);
  assert.equal(ReserveZaloMessageInput.safeParse({ ...ok, content: '   ' }).success, false);
  assert.equal(ReserveZaloMessageInput.safeParse({ ...ok, content: 'a'.repeat(ZALO_LIMITS.contentMax + 1) }).success, false);
  assert.equal(ReserveZaloMessageInput.safeParse({ ...ok, targetType: 'group' }).success, false);
  assert.equal(ReserveZaloMessageInput.safeParse({ ...ok, kind: 'khac' }).success, false);
  assert.equal(ReserveZaloMessageInput.safeParse({ ...ok, targetId: 'abc' }).success, false);
});

test('ReserveZaloMessageInput: không nhận SĐT từ client (khoá lạ bị bỏ)', () => {
  const r = ReserveZaloMessageInput.safeParse({ targetType: 'lead', targetId: ID, kind: 'custom', content: 'x', phone: '0912345678' });
  assert.equal(r.success, true);
  if (r.success) assert.equal('phone' in r.data, false);
});

test('ListZaloMessagesInput: cần loại đối tượng và uuid', () => {
  assert.equal(ListZaloMessagesInput.safeParse({ targetType: 'lead', targetId: ID }).success, true);
  assert.equal(ListZaloMessagesInput.safeParse({ targetType: 'lead', targetId: 'x' }).success, false);
});

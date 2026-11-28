// Chạy: pnpm --filter @hp/shared test. Hợp đồng Zalo bán tự động (khớp migration zalo_outreach).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ListZaloMessagesInput,
  renderZaloTemplate,
  ReserveZaloMessageInput,
  ResetZaloTemplateInput,
  SaveZaloAutoInput,
  SaveZaloSettingsInput,
  SaveZaloTemplateInput,
  ZALO_KINDS,
  ZALO_LIMITS,
  ZALO_SETTINGS_BOUNDS,
} from './schemas/actions/zalo.ts';

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

test('SaveZaloSettingsInput: nhận cấu hình hợp lệ, từ chối ngoài cận an toàn hoặc min > max', () => {
  const ok = { dailyMin: 10, dailyMax: 20, delayMin: 60, delayMax: 120 };
  assert.equal(SaveZaloSettingsInput.safeParse(ok).success, true);
  assert.equal(SaveZaloSettingsInput.safeParse({ ...ok, dailyMax: ZALO_SETTINGS_BOUNDS.dailyMax + 1 }).success, false);
  assert.equal(SaveZaloSettingsInput.safeParse({ ...ok, delayMin: ZALO_SETTINGS_BOUNDS.delayMin - 1 }).success, false);
  assert.equal(SaveZaloSettingsInput.safeParse({ ...ok, dailyMin: 25, dailyMax: 20 }).success, false);
  assert.equal(SaveZaloSettingsInput.safeParse({ ...ok, delayMin: 200, delayMax: 100 }).success, false);
  assert.equal(SaveZaloSettingsInput.safeParse({ ...ok, dailyMin: 1.5 }).success, false);
  assert.equal(SaveZaloSettingsInput.safeParse({ ...ok, dailyMin: '10' }).success, false);
});

test('SaveZaloAutoInput: bật thì bắt buộc có tài khoản gửi; tắt thì không cần', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.equal(SaveZaloAutoInput.safeParse({ enabled: true, senderId: id }).success, true);
  assert.equal(SaveZaloAutoInput.safeParse({ enabled: false, senderId: null }).success, true);
  assert.equal(SaveZaloAutoInput.safeParse({ enabled: true, senderId: null }).success, false);
  assert.equal(SaveZaloAutoInput.safeParse({ enabled: true, senderId: 'x' }).success, false);
  assert.equal(SaveZaloAutoInput.safeParse({ enabled: 'true', senderId: id }).success, false);
});

test('SaveZaloSettingsInput: mặc định ZALO_LIMITS nằm trong cận an toàn', () => {
  const r = SaveZaloSettingsInput.safeParse({
    dailyMin: ZALO_LIMITS.dailyMin,
    dailyMax: ZALO_LIMITS.dailyMax,
    delayMin: ZALO_LIMITS.delayMinSeconds,
    delayMax: ZALO_LIMITS.delayMaxSeconds,
  });
  assert.equal(r.success, true);
});

test('SaveZaloTemplateInput / ResetZaloTemplateInput: cắt khoảng trắng, từ chối rỗng / quá dài / loại lạ', () => {
  const r = SaveZaloTemplateInput.safeParse({ kind: 'custom', content: '  Chào {{name}}  ' });
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.content, 'Chào {{name}}');
  assert.equal(SaveZaloTemplateInput.safeParse({ kind: 'custom', content: '  ' }).success, false);
  assert.equal(SaveZaloTemplateInput.safeParse({ kind: 'custom', content: 'a'.repeat(ZALO_LIMITS.contentMax + 1) }).success, false);
  assert.equal(SaveZaloTemplateInput.safeParse({ kind: 'khong_co', content: 'x' }).success, false);
  assert.equal(ResetZaloTemplateInput.safeParse({ kind: 'warning' }).success, true);
  assert.equal(ResetZaloTemplateInput.safeParse({ kind: 'khong_co' }).success, false);
});

test('renderZaloTemplate: thay biến, chịu khoảng trắng, giữ biến lạ, biến thiếu → rỗng', () => {
  assert.equal(renderZaloTemplate('Chào {{name}}, mình bên {{ app }}.', { name: 'An', app: 'DQ' }), 'Chào An, mình bên DQ.');
  assert.equal(renderZaloTemplate('Đơn "{{title}}"', {}), 'Đơn ""');
  assert.equal(renderZaloTemplate('Xin {{ten}}', { name: 'An' }), 'Xin {{ten}}');
  assert.equal(renderZaloTemplate('{{name}} {{name}}', { name: 'B' }), 'B B');
});

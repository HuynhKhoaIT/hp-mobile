// Chạy: pnpm --filter @hp/shared test. Hợp đồng CSKH (khớp migration cskh_care): trạng thái, điểm chỉ khi đã liên hệ được.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CSKH_STATUSES, RevealCskhPhoneInput, SaveCskhCaseInput } from './schemas/actions/cskh.ts';

const ID = '00000000-0000-4000-8000-0000000c0001';

test('SaveCskhCaseInput: nhận kết quả hợp lệ, cắt khoảng trắng ghi chú', () => {
  const r = SaveCskhCaseInput.safeParse({ requestId: ID, party: 'customer', status: 'contacted', channel: 'call', note: '  hài lòng  ', score: 4 });
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.note, 'hài lòng');
  for (const status of CSKH_STATUSES) {
    assert.equal(SaveCskhCaseInput.safeParse({ requestId: ID, party: 'pro', status }).success, true, status);
  }
});

test('SaveCskhCaseInput: điểm chỉ khi contacted / done, trong 1–5', () => {
  const base = { requestId: ID, party: 'customer' } as const;
  assert.equal(SaveCskhCaseInput.safeParse({ ...base, status: 'done', score: 5 }).success, true);
  assert.equal(SaveCskhCaseInput.safeParse({ ...base, status: 'no_answer', score: 3 }).success, false);
  assert.equal(SaveCskhCaseInput.safeParse({ ...base, status: 'pending', score: 3 }).success, false);
  assert.equal(SaveCskhCaseInput.safeParse({ ...base, status: 'done', score: 0 }).success, false);
  assert.equal(SaveCskhCaseInput.safeParse({ ...base, status: 'done', score: 6 }).success, false);
  assert.equal(SaveCskhCaseInput.safeParse({ ...base, status: 'done', score: 2.5 }).success, false);
});

test('SaveCskhCaseInput: từ chối bên / trạng thái / kênh lạ, id sai, ghi chú quá dài', () => {
  const ok = { requestId: ID, party: 'customer', status: 'done' };
  assert.equal(SaveCskhCaseInput.safeParse(ok).success, true);
  assert.equal(SaveCskhCaseInput.safeParse({ ...ok, party: 'khach' }).success, false);
  assert.equal(SaveCskhCaseInput.safeParse({ ...ok, status: 'xong' }).success, false);
  assert.equal(SaveCskhCaseInput.safeParse({ ...ok, channel: 'email' }).success, false);
  assert.equal(SaveCskhCaseInput.safeParse({ ...ok, requestId: 'abc' }).success, false);
  assert.equal(SaveCskhCaseInput.safeParse({ ...ok, note: 'a'.repeat(501) }).success, false);
});

test('RevealCskhPhoneInput: cần đơn và bên hợp lệ', () => {
  assert.equal(RevealCskhPhoneInput.safeParse({ requestId: ID, party: 'pro' }).success, true);
  assert.equal(RevealCskhPhoneInput.safeParse({ requestId: ID, party: 'x' }).success, false);
  assert.equal(RevealCskhPhoneInput.safeParse({ requestId: 'x', party: 'pro' }).success, false);
});

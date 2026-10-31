import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composeReviewNote, parseReviewNote, REJECT_REASONS, riskLevel } from './moderation.ts';
import { maskVnPhone } from './phone.ts';

test('composeReviewNote / parseReviewNote: mã lý do + ghi chú đi được hai chiều', () => {
  assert.equal(composeReviewNote('scam', '  đòi chuyển khoản trước '), 'scam: đòi chuyển khoản trước');
  assert.equal(composeReviewNote('duplicate', ''), 'duplicate');
  assert.equal(composeReviewNote(null, '  '), null);
  assert.equal(composeReviewNote(undefined, 'ok'), 'ok');
  for (const reason of REJECT_REASONS) {
    assert.deepEqual(parseReviewNote(composeReviewNote(reason, 'a: b\nc')), { reason, text: 'a: b\nc' });
    assert.deepEqual(parseReviewNote(composeReviewNote(reason, null)), { reason, text: null });
  }
  assert.deepEqual(parseReviewNote('duyệt bằng SQL'), { reason: null, text: 'duyệt bằng SQL' });
  assert.deepEqual(parseReviewNote('unknown_code: x'), { reason: null, text: 'unknown_code: x' });
  assert.deepEqual(parseReviewNote(null), { reason: null, text: null });
});

test('riskLevel theo risk_score (10 điểm / lý do)', () => {
  assert.equal(riskLevel(10), 'low');
  assert.equal(riskLevel(20), 'medium');
  assert.equal(riskLevel(40), 'high');
});

test('maskVnPhone chỉ giữ 3 số cuối', () => {
  assert.equal(maskVnPhone('84912345678'), '•••• ••• 678');
  assert.equal(maskVnPhone(null), null);
  assert.equal(maskVnPhone(''), null);
});

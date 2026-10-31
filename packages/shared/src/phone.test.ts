import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatVnPhone, normalizeVnPhone, toE164 } from './phone.ts';

test('normalizeVnPhone: các kiểu gõ quen thuộc → 84xxxxxxxxx', () => {
  for (const input of ['0912345678', '0912 345 678', '0912.345.678', '+84912345678', '+84 912 345 678', '84912345678', '912345678']) {
    assert.equal(normalizeVnPhone(input), '84912345678', input);
  }
  assert.equal(normalizeVnPhone('0388888888'), '84388888888');
  assert.equal(normalizeVnPhone('0900000001'), '84900000001'); // số test local
});

test('normalizeVnPhone: từ chối số không phải di động VN', () => {
  for (const input of ['', '123', '0212345678', '091234567', '09123456789', '+1 650 555 0100', 'abc']) {
    assert.equal(normalizeVnPhone(input), null, input);
  }
});

test('toE164 / formatVnPhone', () => {
  assert.equal(toE164('84912345678'), '+84912345678');
  assert.equal(formatVnPhone('84912345678'), '0912 345 678');
});


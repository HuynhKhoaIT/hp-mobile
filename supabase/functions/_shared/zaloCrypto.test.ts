// Chạy: node --experimental-strip-types --test supabase/functions/_shared/zaloCrypto.test.ts (hoặc deno test --allow-all).
// Mã hoá phiên Zalo + phân loại lỗi. Giá trị dưới đây là GIẢ, không phải phiên thật.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decryptJson, encryptJson, isValidKey, zaloFailureCode } from './zaloCrypto.ts';

const KEY = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);
const creds = { imei: 'fake-imei-123', userAgent: 'Mozilla/5.0 test', cookie: 'zpsid=fake; zpw_sek=fake' };

test('mã hoá rồi giải mã trả đúng dữ liệu', async () => {
  const blob = await encryptJson(creds, KEY);
  assert.deepEqual(await decryptJson(blob, KEY), creds);
});

test('chuỗi mã hoá không chứa dữ liệu thô và khác nhau mỗi lần (iv ngẫu nhiên)', async () => {
  const a = await encryptJson(creds, KEY);
  const b = await encryptJson(creds, KEY);
  assert.notEqual(a, b);
  assert.ok(!a.includes('fake-imei'));
  assert.ok(!Buffer.from(a, 'base64').toString('latin1').includes('zpsid'));
});

test('sai khoá hoặc dữ liệu bị sửa → giải mã báo lỗi', async () => {
  const blob = await encryptJson(creds, KEY);
  await assert.rejects(() => decryptJson(blob, OTHER));
  const bytes = Buffer.from(blob, 'base64');
  bytes[bytes.length - 1] ^= 1;
  await assert.rejects(() => decryptJson(bytes.toString('base64'), KEY));
  await assert.rejects(() => decryptJson('AAAA', KEY), /zalo_blob_invalid/);
});

test('khoá phải là 64 ký tự hex', async () => {
  assert.equal(isValidKey(KEY), true);
  assert.equal(isValidKey('abc'), false);
  assert.equal(isValidKey('z'.repeat(64)), false);
  await assert.rejects(() => encryptJson(creds, 'abc'), /zalo_key_invalid/);
});

test('phân loại lỗi: phiên hết hạn khác lỗi gửi thường', () => {
  assert.equal(zaloFailureCode('Login failed: cookie expired'), 'zalo_session_expired');
  assert.equal(zaloFailureCode('Unauthorized 401'), 'zalo_session_expired');
  assert.equal(zaloFailureCode('network timeout'), 'zalo_send_failed');
  assert.equal(zaloFailureCode('Không gửi được tin nhắn'), 'zalo_send_failed');
});

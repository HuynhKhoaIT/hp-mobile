// Chạy: pnpm --filter @hp/shared test (node:test, Node ≥ 22 tự bỏ type).
// Bộ ví dụ này trùng với supabase/tests/000_foundation.test.sql — đổi một bên thì đổi cả hai.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSlug, parseShortId, toSlug } from './slug.ts';

const CASES: [string, string][] = [
  ['Xe Wave 2019 còn đẹp', 'xe-wave-2019-con-dep'],
  ['Phòng trọ gần KCN Dung Quất', 'phong-tro-gan-kcn-dung-quat'],
  ['Đồ bảo hộ – giày, mũ!!', 'do-bao-ho-giay-mu'],
  ['  --Tìm   việc   ca đêm--  ', 'tim-viec-ca-dem'],
  ['二手手机', 'tin'],
  ['Ưu đãi ở ghép Ơn trời', 'uu-dai-o-ghep-on-troi'],
  ['a'.repeat(79) + ' b', 'a'.repeat(79)],
];

test('toSlug khớp public.slugify()', () => {
  for (const [input, expected] of CASES) assert.equal(toSlug(input), expected, input);
});

test('buildSlug / parseShortId', () => {
  assert.equal(buildSlug('Xe Wave 2019', 'a1b2c3'), 'xe-wave-2019-a1b2c3');
  assert.equal(parseShortId('xe-wave-2019-a1b2c3'), 'a1b2c3');
  assert.equal(parseShortId('tin-a1b2c'), null);
  assert.equal(parseShortId('khong-co-id'), null);
});

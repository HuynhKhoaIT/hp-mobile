// Chạy: pnpm --filter @hp/shared test. Module được test chỉ import type (node --test).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listingFormStepOf, splitAttributeFields } from './fields.ts';

test('splitAttributeFields: bước 2 theo thứ tự khai báo, bỏ khoá lạ và trường ẩn', () => {
  const { primary, details } = splitAttributeFields('lost', {
    primaryAttributes: ['place', 'item_type', 'khong_co', 'returned'],
    hiddenAttributes: ['returned'],
  });
  assert.deepEqual(
    primary.map((f) => f.key),
    ['place', 'item_type'],
  );
  assert.ok(!details.some((f) => f.key === 'place' || f.key === 'item_type' || f.key === 'returned'));
});

test('splitAttributeFields: không cấu hình → mọi thông số ở bước 3', () => {
  const { primary, details } = splitAttributeFields('pass_vehicle', undefined);
  assert.equal(primary.length, 0);
  assert.ok(details.length > 0);
});

test('listingFormStepOf: path lỗi → bước', () => {
  const primary = new Set(['item_type']);
  assert.equal(listingFormStepOf('images'), 1);
  assert.equal(listingFormStepOf('images.0'), 1);
  assert.equal(listingFormStepOf('price_type'), 2);
  assert.equal(listingFormStepOf('attributes.item_type', primary), 2);
  assert.equal(listingFormStepOf('attributes.item_type'), 3);
  assert.equal(listingFormStepOf('site'), 3);
});

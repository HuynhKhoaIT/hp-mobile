// Chạy: pnpm --filter @hp/shared test. Module được test không import gì có đuôi thiếu (node --test).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { featureOfCategory, priceLabel } from './listing-display.ts';

test('priceLabel: việc làm lấy khoảng lương theo pay_type', () => {
  assert.deepEqual(
    priceLabel({ category: 'job_main', price: null, price_type: 'negotiable', attributes: { salary_min: 8e6, salary_max: 12e6, pay_type: 'month' } }),
    { type: 'range', min: 8e6, max: 12e6, per: 'month' },
  );
  assert.deepEqual(
    priceLabel({ category: 'job_parttime', price: null, price_type: 'negotiable', attributes: { salary_min: 30000, salary_max: 20000 } }),
    { type: 'range', min: 30000, max: null, per: undefined },
  );
  assert.deepEqual(priceLabel({ category: 'job_main', price: null, price_type: 'negotiable', attributes: {} }), { type: 'negotiable' });
});

test('priceLabel: trọ theo tháng, đồ thất lạc không giá, miễn phí / thoả thuận', () => {
  assert.deepEqual(priceLabel({ category: 'room_rent', price: 1_500_000, price_type: 'fixed', attributes: {} }), {
    type: 'money',
    amount: 1_500_000,
    per: 'month',
  });
  assert.deepEqual(priceLabel({ category: 'lost', price: null, price_type: 'free', attributes: {} }), { type: 'free' });
  assert.deepEqual(priceLabel({ category: 'pass_home', price: 0, price_type: 'free', attributes: {} }), { type: 'free' });
  assert.deepEqual(priceLabel({ category: 'pass_home', price: null, price_type: 'fixed', attributes: {} }), { type: 'negotiable' });
  assert.deepEqual(priceLabel({ category: 'pass_ppe', price: 150000, price_type: 'fixed', attributes: null }), {
    type: 'money',
    amount: 150000,
    per: undefined,
  });
});

test('featureOfCategory', () => {
  assert.equal(featureOfCategory('pass_vehicle'), 'pass');
  assert.equal(featureOfCategory('room_share'), 'room');
  assert.equal(featureOfCategory('job_parttime'), 'job');
  assert.equal(featureOfCategory('found'), 'lostFound');
});

test('featureOfCategory khớp LISTING_FEATURES', async () => {
  const { LISTING_FEATURES } = await import('./enums.ts');
  for (const [feature, categories] of Object.entries(LISTING_FEATURES)) {
    for (const c of categories) assert.equal(featureOfCategory(c), feature);
  }
});

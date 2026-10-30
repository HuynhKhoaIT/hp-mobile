import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatDistance, formatMoney, formatRelative } from './format.ts';

// Intl chèn khoảng trắng không ngắt (U+00A0 / U+202F); chuẩn hoá để so.
const n = (s: string) => s.replace(/[  ]/g, ' ');

test('formatMoney: VND theo locale', () => {
  assert.equal(n(formatMoney(1_500_000, 'vi')), '1.500.000 ₫');
  assert.equal(n(formatMoney(1_500_000, 'en')), '₫1,500,000');
  assert.equal(n(formatMoney(1_500_000, 'zh')), '1,500,000越南盾');
  assert.equal(n(formatMoney(1_499.6, 'vi')), '1.500 ₫', 'không số lẻ');
});

test('formatDistance', () => {
  assert.equal(n(formatDistance(850, 'vi')), '850 m');
  assert.equal(n(formatDistance(1234, 'vi')), '1,2 km');
  assert.equal(n(formatDistance(1234, 'en')), '1.2 km');
  assert.equal(n(formatDistance(15_400, 'vi')), '15 km');
  assert.equal(n(formatDistance(1234, 'zh')), '1.2公里');
});

test('formatRelative', () => {
  const now = new Date('2026-10-30T10:00:00Z');
  assert.equal(formatRelative(new Date('2026-10-30T09:55:00Z'), 'vi', now), '5 phút trước');
  assert.equal(formatRelative(new Date('2026-10-30T09:55:00Z'), 'en', now), '5 minutes ago');
  assert.equal(formatRelative(new Date('2026-10-30T09:55:00Z'), 'zh', now), '5分钟前');
  assert.equal(formatRelative(new Date('2026-10-30T12:00:00Z'), 'en', now), 'in 2 hours');
});

test('formatDate: luôn theo giờ Việt Nam', () => {
  // 10:00 UTC = 17:00 tại Asia/Ho_Chi_Minh
  assert.match(n(formatDate('2026-10-30T10:00:00Z', 'vi', 'datetime')), /17:00/);
  assert.match(n(formatDate('2026-10-30T10:00:00Z', 'en', 'time')), /5:00 PM/);
});

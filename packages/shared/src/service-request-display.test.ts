// Chạy: pnpm --filter @hp/shared test. Module được test không import gì (node --test).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  lowestQuoteId,
  requestImagePath,
  serviceBudget,
  serviceQuoteDisplayStatus,
  serviceRequestActions,
  serviceRequestDisplayStatus,
  serviceRequestViewerRole,
} from './service-request-display.ts';

const now = new Date('2026-11-28T08:00:00Z');
const later = '2026-12-02T08:00:00Z';
const earlier = '2026-11-28T07:00:00Z';

test('serviceRequestDisplayStatus: trạng thái chốt thắng hạn; open quá hạn → expired', () => {
  assert.equal(serviceRequestDisplayStatus({ status: 'assigned', expires_at: earlier }, now), 'assigned');
  assert.equal(serviceRequestDisplayStatus({ status: 'completed', expires_at: earlier }, now), 'completed');
  assert.equal(serviceRequestDisplayStatus({ status: 'cancelled', expires_at: later }, now), 'cancelled');
  assert.equal(serviceRequestDisplayStatus({ status: 'open', expires_at: later }, now), 'open');
  assert.equal(serviceRequestDisplayStatus({ status: 'open', expires_at: earlier }, now), 'expired');
  assert.equal(serviceRequestDisplayStatus({ status: 'expired', expires_at: later }, now), 'expired');
});

test('serviceRequestViewerRole: khách / chủ / theo trạng thái báo giá', () => {
  const r = { customer_id: 'c1' };
  assert.equal(serviceRequestViewerRole(r, null, null), 'guest');
  assert.equal(serviceRequestViewerRole(r, 'c1', null), 'customer');
  assert.equal(serviceRequestViewerRole(r, 'p1', null), 'none');
  assert.equal(serviceRequestViewerRole(r, 'p1', 'submitted'), 'quoted');
  assert.equal(serviceRequestViewerRole(r, 'p1', 'accepted'), 'accepted');
  assert.equal(serviceRequestViewerRole(r, 'p1', 'declined'), 'declined');
  assert.equal(serviceRequestViewerRole(r, 'p1', 'withdrawn'), 'withdrawn');
});

test('serviceRequestActions: khách mời đăng nhập, người ngoài báo giá, thợ đã báo giá sửa / rút', () => {
  assert.deepEqual(serviceRequestActions('guest', 'open'), ['login', 'report']);
  assert.deepEqual(serviceRequestActions('guest', 'completed'), ['report']);
  assert.deepEqual(serviceRequestActions('none', 'open'), ['quote', 'report']);
  assert.deepEqual(serviceRequestActions('none', 'expired'), ['report']);
  assert.deepEqual(serviceRequestActions('withdrawn', 'open'), ['quote', 'report']);
  assert.deepEqual(serviceRequestActions('quoted', 'open'), ['edit_quote', 'withdraw_quote', 'chat', 'report']);
  assert.deepEqual(serviceRequestActions('declined', 'assigned'), ['report']);
});

test('serviceRequestActions: chủ — sửa khi chưa có báo giá, chọn báo giá khi đã có, hoàn thành, chấm', () => {
  assert.deepEqual(serviceRequestActions('customer', 'open', { quotesCount: 0 }), ['edit', 'cancel']);
  assert.deepEqual(serviceRequestActions('customer', 'open', { quotesCount: 2 }), ['accept_quote', 'cancel']);
  assert.deepEqual(serviceRequestActions('customer', 'assigned', { quotesCount: 1 }), ['cancel', 'complete', 'chat']);
  assert.deepEqual(serviceRequestActions('customer', 'completed', { quotesCount: 1 }), ['rate']);
  assert.deepEqual(serviceRequestActions('customer', 'completed', { quotesCount: 1, rated: true }), []);
  assert.deepEqual(serviceRequestActions('customer', 'cancelled'), []);
});

test('serviceRequestActions: thợ được chọn — chat khi giao / xong, chấm một lần', () => {
  assert.deepEqual(serviceRequestActions('accepted', 'assigned'), ['chat', 'report']);
  assert.deepEqual(serviceRequestActions('accepted', 'completed'), ['chat', 'rate', 'report']);
  assert.deepEqual(serviceRequestActions('accepted', 'completed', { rated: true }), ['chat', 'report']);
});

test('serviceQuoteDisplayStatus: giá trị lạ → submitted', () => {
  assert.equal(serviceQuoteDisplayStatus('accepted'), 'accepted');
  assert.equal(serviceQuoteDisplayStatus('withdrawn'), 'withdrawn');
  assert.equal(serviceQuoteDisplayStatus('whatever'), 'submitted');
});

test('serviceBudget: thiếu / một đầu / bằng nhau / khoảng', () => {
  assert.deepEqual(serviceBudget(null, null), { kind: 'none' });
  assert.deepEqual(serviceBudget(0, 0), { kind: 'none' });
  assert.deepEqual(serviceBudget(100_000, null), { kind: 'from', min: 100_000 });
  assert.deepEqual(serviceBudget(null, 300_000), { kind: 'upto', max: 300_000 });
  assert.deepEqual(serviceBudget(200_000, 200_000), { kind: 'exact', amount: 200_000 });
  assert.deepEqual(serviceBudget(100_000, 300_000), { kind: 'range', min: 100_000, max: 300_000 });
});

test('lowestQuoteId: bỏ báo giá đã rút / bị từ chối', () => {
  assert.equal(lowestQuoteId([]), null);
  assert.equal(
    lowestQuoteId([
      { id: 'a', price: 500_000, status: 'submitted' },
      { id: 'b', price: 300_000, status: 'withdrawn' },
      { id: 'c', price: 400_000, status: 'submitted' },
      { id: 'd', price: 100_000, status: 'declined' },
    ]),
    'c',
  );
});

test('requestImagePath: thư mục đầu là chủ yêu cầu', () => {
  assert.equal(requestImagePath('u1', 'r1', 2), 'u1/r1/2.webp');
});

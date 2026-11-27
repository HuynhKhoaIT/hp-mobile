// Chạy: pnpm --filter @hp/shared test. Module được test chỉ import type (node --test).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HOME_TILES } from './home.ts';
import {
  DEFAULT_MINI_APPS,
  enabledMiniApps,
  isMiniAppCode,
  isMiniAppEnabled,
  MINI_APP_CODES,
  resolveMiniApps,
  visibleHomeTiles,
} from './mini-apps.ts';

test('mặc định: 6 mini-app hiện có bật, Gọi thợ tắt (fail-open)', () => {
  const states = resolveMiniApps(null);
  assert.deepEqual(enabledMiniApps(states), ['pass', 'room', 'job', 'lostFound', 'ride', 'sport']);
  assert.equal(isMiniAppEnabled(states, 'goiTho'), false);
  assert.deepEqual(resolveMiniApps(undefined), states);
  assert.equal(states.length, MINI_APP_CODES.length);
});

test('dòng DB ghi đè mặc định và đổi thứ tự', () => {
  const states = resolveMiniApps([
    { code: 'goiTho', isEnabled: true, sortOrder: 5 },
    { code: 'pass', isEnabled: false, sortOrder: 10 },
  ]);
  assert.equal(states[0]?.code, 'goiTho');
  assert.equal(isMiniAppEnabled(states, 'goiTho'), true);
  assert.equal(isMiniAppEnabled(states, 'pass'), false);
  assert.equal(isMiniAppEnabled(states, 'room'), true, 'mã thiếu dòng dùng mặc định');
});

test('mã lạ bị bỏ; cùng sortOrder thì theo thứ tự mặc định', () => {
  const states = resolveMiniApps([
    { code: 'khong_co', isEnabled: true, sortOrder: 1 },
    { code: 'sport', isEnabled: true, sortOrder: 10 },
  ]);
  assert.equal(states.some((s) => (s.code as string) === 'khong_co'), false);
  assert.deepEqual(
    states.filter((s) => s.sortOrder === 10).map((s) => s.code),
    ['pass', 'sport'],
  );
});

test('visibleHomeTiles: ẩn mini-app tắt, theo thứ tự admin, ô tiện ích ở cuối', () => {
  const states = resolveMiniApps([
    { code: 'room', isEnabled: false, sortOrder: 20 },
    { code: 'sport', isEnabled: true, sortOrder: 5 },
  ]);
  const ids = visibleHomeTiles(HOME_TILES, states).map((t) => t.id);
  assert.deepEqual(ids, ['sport', 'pass', 'job', 'lostFound', 'ride', 'my_listings', 'all']);
  assert.deepEqual(
    visibleHomeTiles(HOME_TILES, resolveMiniApps(null)).map((t) => t.id),
    ['pass', 'room', 'job', 'lostFound', 'ride', 'sport', 'my_listings', 'all'],
    'mặc định: đúng 8 ô như trước',
  );
});

test('isMiniAppCode', () => {
  assert.equal(isMiniAppCode('goiTho'), true);
  assert.equal(isMiniAppCode('lost-found'), false);
  assert.equal(isMiniAppCode(null), false);
  assert.equal(DEFAULT_MINI_APPS.length, 7);
});

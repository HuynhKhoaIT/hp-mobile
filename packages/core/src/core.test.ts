import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampLimit, toAppError } from './result.ts';
import { imageUrl, shareUrl } from './urls.ts';
import { keys } from './keys.ts';

test('toAppError map mã Postgres / PostgREST sang key i18n', () => {
  assert.equal(toAppError({ code: '42501', message: 'permission denied' }).code, 'forbidden');
  assert.equal(toAppError({ code: 'P0001', message: 'rate_limited' }).code, 'rate_limited');
  assert.equal(toAppError({ code: 'P0001', message: 'Lỗi tự do có dấu' }).code, 'unknown');
  assert.equal(toAppError({ code: '23505', message: 'dup' }).code, 'conflict');
  assert.equal(toAppError({ code: 'PGRST116', message: 'no rows' }).code, 'not_found');
  assert.equal(toAppError({ name: 'TypeError', message: 'Failed to fetch' }).code, 'network');
  assert.equal(toAppError(undefined).code, 'unknown');
});

test('clampLimit: 1..50', () => {
  assert.equal(clampLimit(undefined), 20);
  assert.equal(clampLimit(1000), 50);
  assert.equal(clampLimit(0), 1);
});

test('shareUrl luôn là URL web', () => {
  assert.equal(shareUrl({ type: 'listing', slug: 'xe-wave-a1b2c3' }, 'https://tenapp.vn/'), 'https://tenapp.vn/tin/xe-wave-a1b2c3');
  assert.equal(shareUrl({ type: 'group', slug: 've-que-x9y8z7' }, 'https://tenapp.vn'), 'https://tenapp.vn/nhom/ve-que-x9y8z7');
});

test('imageUrl: transform / ảnh gốc', () => {
  const u = 'http://127.0.0.1:54321';
  assert.equal(
    imageUrl(u, 'listing-images', 'uid/lid/0.webp'),
    'http://127.0.0.1:54321/storage/v1/render/image/public/listing-images/uid/lid/0.webp?width=400&quality=75',
  );
  assert.equal(
    imageUrl(u, 'listing-images', 'uid/lid/0.webp', 'full', false),
    'http://127.0.0.1:54321/storage/v1/object/public/listing-images/uid/lid/0.webp',
  );
});

test('keys: key con nằm dưới key cha để invalidate cả nhánh', () => {
  assert.deepEqual(keys.listings({ category: 'pass_home' }).slice(0, 2), keys.listings());
  assert.deepEqual(keys.unreadCount().slice(0, 2), keys.notifications());
  assert.deepEqual(keys.bookmarks('listing').slice(0, 2), keys.bookmarks());
});

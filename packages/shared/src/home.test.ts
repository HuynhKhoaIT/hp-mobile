import assert from 'node:assert/strict';
import { test } from 'node:test';
import { givenName, HOME_SHORTCUTS, HOME_TILES } from './home.ts';

test('givenName: tên gọi là từ cuối', () => {
  assert.equal(givenName('Nguyễn Văn An'), 'An');
  assert.equal(givenName('  Lê   Thị Hồng  '), 'Hồng');
  assert.equal(givenName('Minh'), 'Minh');
  assert.equal(givenName(''), '');
  assert.equal(givenName(null), '');
});

test('HOME_TILES: 8 ô, id không trùng; HOME_SHORTCUTS id không trùng', () => {
  assert.equal(HOME_TILES.length, 8);
  assert.equal(new Set(HOME_TILES.map((t) => t.id)).size, 8);
  assert.equal(new Set(HOME_SHORTCUTS.map((s) => s.id)).size, HOME_SHORTCUTS.length);
});

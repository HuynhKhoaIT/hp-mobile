import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canJoinGroup,
  groupDisplayStatus,
  groupLineup,
  groupMembersPreview,
  groupTimeWindow,
  groupViewerRole,
  maxSeatsFor,
  rideTitle,
  shortName,
} from './group-display.ts';
import { isPushEnabled, prefKeyOfType } from './notifications.ts';

const now = new Date('2026-11-02T08:00:00Z');
const later = '2026-11-02T12:00:00Z';
const earlier = '2026-11-02T07:00:00Z';

test('groupDisplayStatus: huỷ / xong thắng giờ; qua giờ → started; còn lại theo status', () => {
  assert.equal(groupDisplayStatus({ status: 'cancelled', starts_at: earlier }, now), 'cancelled');
  assert.equal(groupDisplayStatus({ status: 'completed', starts_at: earlier }, now), 'completed');
  assert.equal(groupDisplayStatus({ status: 'open', starts_at: earlier }, now), 'started');
  assert.equal(groupDisplayStatus({ status: 'in_progress', starts_at: later }, now), 'started');
  assert.equal(groupDisplayStatus({ status: 'full', starts_at: later }, now), 'full');
  assert.equal(groupDisplayStatus({ status: 'open', starts_at: later }, now), 'open');
});

test('canJoinGroup: chỉ nhóm còn mở và chưa tới giờ', () => {
  assert.equal(canJoinGroup({ status: 'open', starts_at: later }, now), true);
  assert.equal(canJoinGroup({ status: 'full', starts_at: later }, now), false);
  assert.equal(canJoinGroup({ status: 'open', starts_at: earlier }, now), false);
});

test('groupViewerRole', () => {
  const g = { host_id: 'h' };
  assert.equal(groupViewerRole(g, null, null), 'guest');
  assert.equal(groupViewerRole(g, 'h', null), 'host');
  assert.equal(groupViewerRole(g, 'u', 'accepted'), 'member');
  assert.equal(groupViewerRole(g, 'u', 'requested'), 'requested');
  assert.equal(groupViewerRole(g, 'u', 'kicked'), 'declined');
  assert.equal(groupViewerRole(g, 'u', 'left'), 'left');
  assert.equal(groupViewerRole(g, 'u', undefined), 'none');
});

test('groupMembersPreview: bỏ phần tử sai kiểu', () => {
  assert.deepEqual(groupMembersPreview(null), []);
  assert.deepEqual(groupMembersPreview([{ id: 'a', name: 'An N.', avatar_url: null }, { name: 'x' }, 3]), [
    { id: 'a', name: 'An N.', avatar_url: null },
  ]);
});

test('groupTimeWindow: ngày theo giờ Việt Nam, không phụ thuộc múi giờ máy', () => {
  // 23:30 ngày 2/11 giờ VN = 16:30Z — server UTC vẫn coi là ngày 2/11
  const late = new Date('2026-11-02T16:30:00Z');
  const today = groupTimeWindow('today', late);
  assert.equal(today.from, late.toISOString());
  assert.equal(today.to, '2026-11-02T17:00:00.000Z');   // 00:00 ngày 3/11 giờ VN
  const tomorrow = groupTimeWindow('tomorrow', late);
  assert.equal(tomorrow.from, '2026-11-02T17:00:00.000Z');
  assert.equal(tomorrow.to, '2026-11-03T17:00:00.000Z');
  assert.equal(groupTimeWindow('week', late).to, '2026-11-09T17:00:00.000Z');
  // 06:00 ngày 3/11 giờ VN = 23:00Z ngày 2/11 — đã sang ngày 3/11
  assert.equal(groupTimeWindow('today', new Date('2026-11-02T23:00:00Z')).to, '2026-11-03T17:00:00.000Z');
});

test('rideTitle + maxSeatsFor', () => {
  assert.equal(rideTitle('Cổng chính Hòa Phát, Bình Sơn', 'Đà Nẵng — Sân bay'), 'Cổng chính Hòa Phát → Đà Nẵng');
  assert.equal(maxSeatsFor('ride', 'motorbike'), 2);
  assert.equal(maxSeatsFor('ride', 'car_owner'), 50);
  assert.equal(maxSeatsFor('sport', 'football'), 50);
});

test('thông báo nhóm mới thuộc nhóm push groups', () => {
  assert.equal(prefKeyOfType('join_declined'), 'groups');
  assert.equal(prefKeyOfType('group_cancelled'), 'groups');
  assert.equal(isPushEnabled({ groups: false }, 'group_cancelled'), false);
});

test('shortName khớp SQL short_name', () => {
  assert.equal(shortName('Nguyễn Văn An'), 'An N.');
  assert.equal(shortName('  An  '), 'An');
  assert.equal(shortName(''), '');
  assert.equal(shortName(null), '');
});

test('groupLineup: đội có sẵn + người đã vào; chỉ sport có players_have', () => {
  assert.deepEqual(groupLineup('sport', { players_have: 5 }, 2, 0), { have: 5, total: 7, need: 2 });
  assert.deepEqual(groupLineup('sport', { players_have: 5, skill_level: 'any' }, 2, 1), { have: 6, total: 7, need: 1 });
  assert.deepEqual(groupLineup('sport', { players_have: 5 }, 2, 2), { have: 7, total: 7, need: 0 });
  assert.equal(groupLineup('sport', { skill_level: 'any' }, 2, 0), null);
  assert.equal(groupLineup('sport', { players_have: 0 }, 2, 0), null);
  assert.equal(groupLineup('ride', { players_have: 3 }, 2, 0), null);
  assert.equal(groupLineup('sport', null, 2, 0), null);
});

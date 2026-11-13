import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM, motorbikeMinutes } from './geo.ts';

test('distanceM: cùng điểm = 0; 0,01° vĩ độ ≈ 1,11 km', () => {
  assert.equal(distanceM({ lat: 15.4, lng: 108.8 }, { lat: 15.4, lng: 108.8 }), 0);
  const d = distanceM({ lat: 15.4, lng: 108.8 }, { lat: 15.41, lng: 108.8 });
  assert.ok(d > 1100 && d < 1120, `${d}`);
});

test('motorbikeMinutes: tối thiểu 1 phút, 15 km ≈ 30 phút', () => {
  assert.equal(motorbikeMinutes(0), 1);
  assert.equal(motorbikeMinutes(15_000), 30);
});

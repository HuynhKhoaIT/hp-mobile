// Chạy: pnpm --filter @hp/shared test. Module được test chỉ import type (node --test).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupAttributeRows } from './attribute-groups.ts';

const row = (key: string) => ({ field: { key }, value: 1 });

test('groupAttributeRows: trọ tách Chi phí / Nội quy, còn lại ở lưới chung theo thứ tự gốc', () => {
  const rows = ['area_m2', 'electricity_price', 'water_price', 'has_loft', 'curfew', 'max_people'].map(row);
  const { general, groups } = groupAttributeRows('room_rent', rows);
  assert.deepEqual(
    general.map((r) => r.field.key),
    ['area_m2', 'has_loft'],
  );
  assert.deepEqual(
    groups.map((g) => [g.key, g.rows.map((r) => r.field.key)]),
    [
      ['costs', ['electricity_price', 'water_price']],
      ['rules', ['curfew', 'max_people']],
    ],
  );
});

test('groupAttributeRows: khối không có giá trị bị bỏ; việc làm có khối chữ Yêu cầu', () => {
  const { general, groups } = groupAttributeRows('job_main', ['shift', 'requirements'].map(row));
  assert.deepEqual(
    general.map((r) => r.field.key),
    ['shift'],
  );
  assert.deepEqual(
    groups.map((g) => [g.key, g.layout]),
    [['requirements', 'text']],
  );
});

test('groupAttributeRows: category không có nhóm → mọi dòng ở lưới chung', () => {
  const rows = ['brand', 'condition'].map(row);
  const { general, groups } = groupAttributeRows('pass_electronics', rows);
  assert.equal(general.length, 2);
  assert.equal(groups.length, 0);
});

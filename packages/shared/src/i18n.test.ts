// Mọi mã enum hiển thị cho người dùng phải có bản dịch ở cả 3 ngôn ngữ (ns common).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GROUP_STATUSES, LISTING_CATEGORIES, LISTING_FEATURES, LISTING_STATUSES } from './enums.ts';
import { ATTRIBUTE_FIELDS } from './schemas/listing/fields.ts';
import { LISTING_SORTS, PASS_PRICE_RANGES, ROOM_PRICE_RANGES } from './schemas/listing/sort.ts';

const load = (locale: string, ns = 'common') =>
  JSON.parse(readFileSync(join(import.meta.dirname, '..', 'i18n', locale, `${ns}.json`), 'utf8')) as Record<
    string,
    Record<string, string>
  >;

/** Đọc key lồng `a.b.c` trong một namespace. */
const at = (doc: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, k) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[k] : undefined), doc);

for (const locale of ['vi', 'en', 'zh']) {
  test(`listing.json (${locale}) có nhãn mọi thuộc tính, giá trị, danh mục ngắn, sắp xếp, khoảng giá`, () => {
    const l = load(locale, 'listing');
    for (const code of LISTING_CATEGORIES) assert.ok(at(l, `category_short.${code}`), `${locale}: thiếu category_short.${code}`);
    for (const fields of Object.values(ATTRIBUTE_FIELDS)) {
      for (const f of fields) {
        assert.ok(at(l, `attr.${f.key}`), `${locale}: thiếu attr.${f.key}`);
        if (f.kind === 'enum') {
          for (const o of f.options) assert.ok(at(l, `attr_value.${f.key}.${o}`), `${locale}: thiếu attr_value.${f.key}.${o}`);
        }
      }
    }
    for (const s of LISTING_SORTS) assert.ok(at(l, `sort.${s}`), `${locale}: thiếu sort.${s}`);
    for (const r of [...PASS_PRICE_RANGES, ...ROOM_PRICE_RANGES]) assert.ok(at(l, `price_range.${r.key}`), `${locale}: thiếu price_range.${r.key}`);
  });
}

for (const locale of ['vi', 'en', 'zh']) {
  test(`common.json (${locale}) có đủ category / status / feature`, () => {
    const c = load(locale);
    for (const code of LISTING_CATEGORIES) assert.ok(c.category?.[code], `${locale}: thiếu category.${code}`);
    for (const code of [...LISTING_STATUSES, ...GROUP_STATUSES]) assert.ok(c.status?.[code], `${locale}: thiếu status.${code}`);
    for (const key of [...Object.keys(LISTING_FEATURES), 'ride', 'sport']) assert.ok(c.feature?.[key], `${locale}: thiếu feature.${key}`);
    assert.ok(c.disclaimer, `${locale}: thiếu disclaimer`);
  });
}

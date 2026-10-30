// Mọi mã enum hiển thị cho người dùng phải có bản dịch ở cả 3 ngôn ngữ (ns common).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GROUP_STATUSES, LISTING_CATEGORIES, LISTING_FEATURES, LISTING_STATUSES } from './enums.ts';

const load = (locale: string) =>
  JSON.parse(readFileSync(join(import.meta.dirname, '..', 'i18n', locale, 'common.json'), 'utf8')) as Record<
    string,
    Record<string, string>
  >;

for (const locale of ['vi', 'en', 'zh']) {
  test(`common.json (${locale}) có đủ category / status / feature`, () => {
    const c = load(locale);
    for (const code of LISTING_CATEGORIES) assert.ok(c.category?.[code], `${locale}: thiếu category.${code}`);
    for (const code of [...LISTING_STATUSES, ...GROUP_STATUSES]) assert.ok(c.status?.[code], `${locale}: thiếu status.${code}`);
    for (const key of [...Object.keys(LISTING_FEATURES), 'ride', 'sport']) assert.ok(c.feature?.[key], `${locale}: thiếu feature.${key}`);
    assert.ok(c.disclaimer, `${locale}: thiếu disclaimer`);
  });
}

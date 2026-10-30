// So khoá i18n giữa vi / en / zh trong packages/shared/i18n. Thoát mã 1 khi thiếu khoá.
// Ngoại lệ: namespace `admin` cho phép zh thiếu (fallback vi) — xem .claude/rules/be-shared-packages.md.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', 'packages', 'shared', 'i18n');
const locales = ['vi', 'en', 'zh'];
const allowMissing = { admin: ['zh'] };

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const namespaces = new Set(
  locales.flatMap((l) => (existsSync(join(root, l)) ? readdirSync(join(root, l)) : []).filter((f) => f.endsWith('.json'))),
);

let errors = 0;
for (const file of [...namespaces].sort()) {
  const ns = file.replace(/\.json$/, '');
  const keys = Object.fromEntries(
    locales.map((l) => {
      const p = join(root, l, file);
      return [l, existsSync(p) ? new Set(flatten(JSON.parse(readFileSync(p, 'utf8')))) : null];
    }),
  );
  const union = new Set(locales.flatMap((l) => [...(keys[l] ?? [])]));
  for (const l of locales) {
    if ((allowMissing[ns] ?? []).includes(l)) continue;
    if (!keys[l]) {
      console.error(`✗ thiếu file ${l}/${file}`);
      errors++;
      continue;
    }
    for (const k of union) {
      if (!keys[l].has(k)) {
        console.error(`✗ ${l}/${file}: thiếu khoá "${k}"`);
        errors++;
      }
    }
  }
}

if (errors) {
  console.error(`\ni18n:check thất bại: ${errors} lỗi`);
  process.exit(1);
}
console.log(`i18n:check ok (${namespaces.size} namespace × ${locales.length} ngôn ngữ)`);

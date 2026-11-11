// Tải bộ ảnh demo CC0 (supabase/demo/listing-images/**) lên bucket listing-images, giữ nguyên đường dẫn (demo/<category>/<NN>.webp).
// Tin mẫu trỏ tới các path này: seed/listings.sql + staging-demo.sql khi tạo mới, demo-images.sql cho tin đã có.
//
//   Local:   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY của `supabase status`> node supabase/demo/upload-demo-images.mjs
//   Staging: SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<Dashboard → Settings → API keys> node supabase/demo/upload-demo-images.mjs --yes
//
// Key chỉ đọc từ biến môi trường, không ghi ra file / log. Project không phải local phải thêm --yes. Chạy lại an toàn (ghi đè cùng tên).
// Không có Node: Dashboard → Storage → listing-images → kéo thả thư mục supabase/demo/listing-images/demo vào gốc bucket.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('./listing-images', import.meta.url));
const BUCKET = 'listing-images';
const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url);
if (!local && !process.argv.includes('--yes')) {
  console.error(`Sắp tải ảnh demo lên ${url}. Chạy lại với --yes nếu đúng project.`);
  process.exit(1);
}

const files = (function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.webp') ? [join(dir, e.name)] : [],
  );
})(ROOT);

let failed = 0;
for (const file of files) {
  const path = relative(ROOT, file).split(sep).join('/');
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'image/webp', 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000' },
    body: readFileSync(file),
  });
  if (!res.ok) {
    failed++;
    console.error(`✗ ${path}: ${res.status} ${await res.text()}`);
  }
}
console.log(`Đã tải ${files.length - failed}/${files.length} ảnh lên ${BUCKET} (${local ? 'local' : url}).`);
process.exit(failed ? 1 : 0);

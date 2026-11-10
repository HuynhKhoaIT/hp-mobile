// deno test --allow-all supabase/functions — logic thuần request-badge / translate-content / purge-files + handler không
// có JWT / sai secret.
import assert from 'node:assert/strict';
import { AppError } from './http.ts';
import {
  badgeRpcError,
  listAllFiles,
  parseBadgeInput,
  parseTranslateInput,
  translateGoogle,
  userFolders,
} from './week10.ts';
import { purgeFiles } from '../purge-files/handler.ts';
import { requestBadge } from '../request-badge/handler.ts';
import { translateContent } from '../translate-content/handler.ts';

const U = '9f8e7d6c-5b4a-4f3e-8d2c-1b0a9f8e7d6c';

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof AppError ? `${e.code}:${e.status}` : 'other';
  }
  return 'ok';
};

Deno.test('parseBadgeInput: huy hiệu hợp lệ + path {uid}/{badge}/{ts}.{ext}', () => {
  assert.deepEqual(parseBadgeInput({ badge: 'worker', documentPath: `${U}/worker/1793700000000.webp` }), {
    badge: 'worker',
    documentPath: `${U}/worker/1793700000000.webp`,
  });
  assert.equal(code(() => parseBadgeInput({ badge: 'admin', documentPath: `${U}/admin/1793700000000.webp` })), 'invalid_input:400');
  assert.equal(code(() => parseBadgeInput({ badge: 'worker', documentPath: `../${U}/worker/1.webp` })), 'invalid_input:400');
  assert.equal(code(() => parseBadgeInput({ badge: 'worker', documentPath: `${U}/worker/1793700000000.exe` })), 'invalid_input:400');
  assert.equal(code(() => parseBadgeInput(null)), 'invalid_input:400');
});

Deno.test('badgeRpcError: mã nghiệp vụ → HTTP đúng, lạ → unknown 500', () => {
  const s = (e: AppError | null) => (e ? `${e.code}:${e.status}` : null);
  assert.equal(badgeRpcError(null), null);
  assert.equal(s(badgeRpcError({ code: 'P0001', message: 'already_requested' })), 'already_requested:409');
  assert.equal(s(badgeRpcError({ code: 'P0001', message: 'document_missing' })), 'document_missing:400');
  assert.equal(s(badgeRpcError({ code: 'P0001', message: 'rate_limited' })), 'rate_limited:429');
  assert.equal(s(badgeRpcError({ code: '42501', message: 'x' })), 'forbidden:403');
  assert.equal(s(badgeRpcError({ code: 'XX000', message: 'boom' })), 'unknown:500');
});

Deno.test('parseTranslateInput: uuid + vi|en|zh', () => {
  assert.deepEqual(parseTranslateInput({ listingId: U, lang: 'zh' }), { listingId: U, lang: 'zh' });
  assert.equal(code(() => parseTranslateInput({ listingId: U, lang: 'fr' })), 'invalid_input:400');
  assert.equal(code(() => parseTranslateInput({ listingId: 'x', lang: 'en' })), 'invalid_input:400');
});

Deno.test('translateGoogle: gửi đúng mã ngôn ngữ, giải mã thực thể HTML; lỗi → translate_failed 502', async () => {
  let sent: { source?: string; target?: string; q?: string[] } = {};
  const ok = (async (_url: string | URL | Request, init?: RequestInit) => {
    sent = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ data: { translations: [{ translatedText: 'Brown &quot;wallet&quot;' }, { translatedText: 'A &amp; B' }] } }));
  }) as typeof fetch;
  assert.deepEqual(await translateGoogle(ok, 'k', ['Ví nâu', 'A và B'], 'vi', 'en'), ['Brown "wallet"', 'A & B']);
  assert.equal(sent.source, 'vi');
  await translateGoogle(ok, 'k', ['a', 'b'], 'vi', 'zh');
  assert.equal(sent.target, 'zh-CN');
  const bad = (async () => new Response('quota', { status: 403 })) as typeof fetch;
  await assert.rejects(() => translateGoogle(bad, 'k', ['a'], 'vi', 'en'), (e) => e instanceof AppError && e.code === 'translate_failed');
});

Deno.test('listAllFiles: đi vào thư mục con (id null), bỏ qua quá sâu', async () => {
  const tree: Record<string, { name: string; id: string | null }[]> = {
    u: [{ name: 'a.webp', id: '1' }, { name: 'l1', id: null }],
    'u/l1': [{ name: '0.webp', id: '2' }, { name: '1.webp', id: '3' }],
  };
  assert.deepEqual(await listAllFiles(async (p) => tree[p] ?? [], 'u'), ['u/a.webp', 'u/l1/0.webp', 'u/l1/1.webp']);
  assert.deepEqual(userFolders('x').map((f) => f.bucket), ['avatars', 'listing-images', 'verification']);
});

Deno.test('handler: không JWT → 401; cron sai secret → 401', async () => {
  Deno.env.set('SUPABASE_URL', Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321');
  Deno.env.set('CRON_SECRET', 'test-cron-secret');
  const post = (headers: Record<string, string> = {}) =>
    new Request('http://x', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}' });
  for (const fn of [requestBadge, translateContent]) {
    const res = await fn(post());
    assert.equal(res.status, 401);
    assert.equal((await res.json()).code, 'errors.auth_required');
  }
  const res = await purgeFiles(post({ 'x-cron-secret': 'wrong' }));
  assert.equal(res.status, 401);
  await res.body?.cancel();
});

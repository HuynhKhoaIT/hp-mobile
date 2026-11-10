// deno test --allow-all supabase/functions — logic thuần join-group / respond-join + handler không có JWT.
import assert from 'node:assert/strict';
import { AppError } from './http.ts';
import { parseJoinInput, parseRespondInput, rpcError } from './groups.ts';
import { joinGroup } from '../join-group/handler.ts';
import { respondJoin } from '../respond-join/handler.ts';

const G = '0b0c2a6e-1f2d-4c3b-9a8e-7d6c5b4a3f21';
const U = '9f8e7d6c-5b4a-4f3e-8d2c-1b0a9f8e7d6c';

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof AppError ? `${e.code}:${e.status}` : 'other';
  }
  return 'ok';
};

Deno.test('parseJoinInput: uuid + lời nhắn ≤ 200, rỗng → null', () => {
  assert.deepEqual(parseJoinInput({ groupId: G, note: '  Cho mình đi với  ' }), { groupId: G, note: 'Cho mình đi với' });
  assert.deepEqual(parseJoinInput({ groupId: G, note: '   ' }), { groupId: G, note: null });
  assert.deepEqual(parseJoinInput({ groupId: G }), { groupId: G, note: null });
  assert.equal(code(() => parseJoinInput({ groupId: 'x' })), 'invalid_input:400');
  assert.equal(code(() => parseJoinInput(null)), 'invalid_input:400');
  assert.equal(code(() => parseJoinInput({ groupId: G, note: 5 })), 'invalid_input:400');
  assert.equal(code(() => parseJoinInput({ groupId: G, note: 'a'.repeat(201) })), 'too_long:400');
});

Deno.test('parseRespondInput: đủ 3 trường đúng kiểu', () => {
  assert.deepEqual(parseRespondInput({ groupId: G, userId: U, accept: true }), { groupId: G, userId: U, accept: true });
  assert.equal(code(() => parseRespondInput({ groupId: G, userId: U, accept: 'yes' })), 'invalid_input:400');
  assert.equal(code(() => parseRespondInput({ groupId: G, accept: false })), 'invalid_input:400');
});

Deno.test('rpcError: mã nghiệp vụ → HTTP đúng, lạ → unknown 500', () => {
  assert.equal(rpcError(null), null);
  const s = (e: AppError | null) => (e ? `${e.code}:${e.status}` : null);
  assert.equal(s(rpcError({ code: 'P0001', message: 'group_full' })), 'group_full:409');
  assert.equal(s(rpcError({ code: 'P0001', message: 'rate_limited' })), 'rate_limited:429');
  assert.equal(s(rpcError({ code: 'P0001', message: 'forbidden' })), 'forbidden:403');
  assert.equal(s(rpcError({ code: 'P0001', message: 'not_found' })), 'not_found:404');
  assert.equal(s(rpcError({ code: '42501', message: 'permission denied' })), 'forbidden:403');
  assert.equal(s(rpcError({ code: 'P0001', message: 'something_else' })), 'unknown:500');
});

Deno.test('handler: thiếu JWT → 401 errors.auth_required; GET → 405', async () => {
  // URL / key giả: thiếu header Authorization thì getUser lỗi ngay, không gọi mạng.
  if (!Deno.env.get('SUPABASE_URL')) Deno.env.set('SUPABASE_URL', 'http://127.0.0.1:9');
  if (!Deno.env.get('SUPABASE_ANON_KEY')) Deno.env.set('SUPABASE_ANON_KEY', 'test-anon');
  if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service');
  const body = JSON.stringify({ groupId: G });
  for (const fn of [joinGroup, respondJoin]) {
    const res = await fn(new Request('http://x/fn', { method: 'POST', body }));
    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { code: 'errors.auth_required', message: 'auth_required' });
    const get = await fn(new Request('http://x/fn', { method: 'GET' }));
    assert.equal(get.status, 405);
  }
});

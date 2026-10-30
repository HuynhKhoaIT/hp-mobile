---
name: new-rpc
description: Tạo Postgres function (RPC) đọc phức tạp hoặc ghi trong transaction đúng quy ước (stable/security invoker cho đọc, security definer _tx cho ghi, p_limit ≤ 50, cursor pagination, grant anon chỉ khi trả view che PII), kèm index, explain, test pgTAP và wrapper @hp/core. Dùng khi cần tìm kiếm, gợi ý, thống kê, slug, hoặc transaction cho Edge Function.
argument-hint: "<tên_rpc> <đọc|ghi> [tham số]"
---

# RPC mới

1. Đọc `.claude/rules/be-rpc-triggers-cron.md`. Đọc → `stable security invoker`; ghi transaction → `security definer`, hậu tố `_tx`, `revoke execute from public, anon` và chỉ grant cho `authenticated` nếu user gọi trực tiếp; luôn `set search_path = public`.
2. Migration mới (`/new-migration`):
```sql
create or replace function public.<name>(p_... default ...)
returns setof public.public_listings   -- hoặc table(...) / jsonb
language sql stable security invoker set search_path = public as $$
  select ... limit least(coalesce(p_limit, 20), 50);
$$;
comment on function public.<name> is '...';
grant execute on function public.<name>(...) to anon, authenticated;   -- chỉ RPC công khai
```
   - Cursor: `p_cursor timestamptz default null` → `(p_cursor is null or created_at < p_cursor)`; order `created_at desc`.
   - Tìm kiếm: `unaccent` + `plainto_tsquery('simple')` OR `title % p_query`; vị trí `st_dwithin`.
   - Ghi: `raise exception using errcode = 'P0001', message = '<error_code>'` cho lỗi nghiệp vụ.
3. Index phủ: `explain analyze` với seed (và với 50k dòng giả nếu là RPC list), ghi kết quả vào comment đầu migration.
4. Test pgTAP: kết quả đúng với seed; anon gọi được (nếu công khai) và không thấy cột nhạy cảm; `p_limit = 1000` chỉ trả 50; RPC `_tx` bị từ chối khi gọi sai vai trò.
5. `supabase gen types typescript --local > packages/db/database.types.ts` → kiểm tra `Database['public']['Functions']['<name>']`.
6. Wrapper `packages/core/src/<domain>.ts`: `export async function searchListings(client, input): Promise<Result<...>> { const { data, error } = await client.rpc('<name>', { p_... }); ... }` + key trong `keys.ts` + hook nếu client cần; `pnpm -r build`.
7. Ghi vào `supabase/CLAUDE.md` mục 5 (danh sách RPC công khai) hoặc mục 9 (tìm kiếm); `docs/plan/backend.md` "Thay đổi hợp đồng".

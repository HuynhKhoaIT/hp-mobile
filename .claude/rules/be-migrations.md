---
paths:
  - "supabase/migrations/**"
  - "supabase/seed.sql"
---

# Migration

## File
- Tạo bằng `supabase migration new <mo_ta_snake>` → `YYYYMMDDHHMMSS_<mô_tả>.sql`. Chỉ **thêm** file; không sửa migration đã merge (sửa = migration mới).
- Một migration = một chủ đề (một bảng hoặc một tính năng). Đầu file có comment: mục đích, bảng ảnh hưởng, client cần cập nhật gì.
- Idempotent khi có thể: `create table if not exists`, `create index if not exists`, `drop policy if exists` trước `create policy`, `create or replace function`.

## Quy ước bảng (bắt buộc)
```sql
create table public.<name> (
  id uuid primary key default gen_random_uuid(),
  -- ...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz                      -- nếu là dữ liệu người dùng
);
alter table public.<name> enable row level security;   -- NGAY trong migration tạo bảng
-- Project staging/prod tắt "Automatically expose new tables": quyền phải cấp rõ, RLS lọc tiếp.
grant select, insert, update, delete on public.<name> to authenticated;   -- chỉ lệnh bảng thật sự cần
-- KHÔNG grant bảng gốc cho anon; anon chỉ đọc view / RPC công khai.
create trigger trg_<name>_updated_at before update on public.<name>
  for each row execute function public.set_updated_at();
```
- Migration đầu tiên (`0001_extensions_helpers`) chạy `alter default privileges in schema public revoke all on tables, functions, sequences from anon, authenticated;` để Supabase local giống staging/prod (local mặc định vẫn tự cấp quyền). Không có bước này, test pgTAP pass ở local nhưng client lỗi `42501` trên staging.
- Sequence của bảng `bigserial` (vd `audit_log`) cần `grant usage on sequence ... to authenticated` nếu user được insert.
- Enum: Postgres `enum type`; thêm giá trị bằng `alter type ... add value` trong migration riêng (không dùng giá trị mới trong cùng transaction).
- Vị trí `geography(point, 4326)`; tiền `numeric(14,0)` VND; ngôn ngữ `text check (lang in ('vi','en','zh'))`.
- FK có `on delete` rõ ràng. Cột `jsonb` có `comment on column` trỏ tới Zod schema trong `packages/shared`.
- Index theo truy vấn thật: list `(category, status, created_at desc)`, GIST cho geography, GIN cho tsvector / jsonb / trigram. Mỗi RPC công khai phải có index phủ (xác nhận bằng `explain analyze` trên seed).
- `security definer` chỉ cho helper RLS (`is_staff`, `is_member`, `is_blocked`, `is_banned`), `reveal_contact`, RPC transaction cho Edge Function; luôn kèm `set search_path = public` và `revoke execute ... from public` khi không cho anon.
- Không `grant` gì cho `anon` ngoài view / RPC công khai liệt kê ở `supabase/CLAUDE.md` mục 5.

## Sau mỗi migration
1. `supabase db reset` chạy sạch (migration + seed).
2. Có RLS → test pgTAP `supabase/tests/<name>.test.sql` cho anon / user / banned / moderator (`/rls-policy`); `supabase test db` pass.
3. `supabase gen types typescript --local > packages/db/database.types.ts`, commit cùng.
4. Cập nhật Zod / enum / i18n (`category.*`, `status.*`) trong `packages/shared`, hàm + keys trong `packages/core` nếu bảng / cột / RPC đổi; `pnpm -r build`.
5. Cập nhật **mục 4 của `CLAUDE.md`** (schema là nguồn sự thật) và `docs/plan/backend.md` mục "Thay đổi hợp đồng".
6. Đổi `listings` / `groups` → kiểm tra trigger `slug` / `short_id`, view `public_*`, webhook revalidate vẫn đúng.

## seed.sql
`sites` (Dung Quất, Hải Dương, Hưng Yên), `venues` mẫu, user test mỗi vai trò (`user_a`, `user_b`, `banned`, `moderator`, `admin`; SĐT giả `+8490000000x`), 50 tin mẫu mỗi category với ảnh placeholder và `lang` đa dạng, 10 nhóm mỗi kind, vài hội thoại và tin nhắn. Không dữ liệu của người thật. Seed phải chạy được với RLS bật (dùng `set role postgres` hoặc insert trước khi bật policy).

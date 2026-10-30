-- 0001 extensions_helpers
-- Mục đích: extension nền, helper dùng chung (updated_at, slug, short id), và bỏ quyền mặc định
--           để local giống staging/prod (tắt "Automatically expose new tables").
-- Bảng ảnh hưởng: không có bảng mới.
-- Client: chưa cần đổi gì; packages/shared/src/slug.ts phải cho cùng kết quả với public.slugify().

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;   -- tạo schema `cron` riêng

-- ── Quyền mặc định ────────────────────────────────────────────────────────────
-- Supabase local tự grant mọi bảng / sequence / function mới cho anon + authenticated.
-- Ta bỏ đi: mỗi migration phải grant rõ (xem .claude/rules/be-migrations.md).
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
-- Postgres mặc định cho PUBLIC execute mọi function mới; bỏ ở mức toàn cục cho role postgres.
alter default privileges for role postgres
  revoke execute on functions from public;

-- ── updated_at ────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: gán updated_at = now(). Dùng: create trigger trg_<t>_updated_at before update on public.<t> for each row execute function public.set_updated_at();';

-- ── slug ──────────────────────────────────────────────────────────────────────
-- Tiêu đề → chữ thường không dấu, nối bằng '-', tối đa 80 ký tự. Phải khớp toSlug() trong packages/shared/src/slug.ts.
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select coalesce(
    nullif(
      -- cắt 80 rồi mới bỏ '-' hai đầu, để slug không kết thúc bằng '-'
      trim(both '-' from
        left(
          trim(both '-' from
            regexp_replace(
              lower(extensions.unaccent('extensions.unaccent'::regdictionary, replace(replace(p_text, 'đ', 'd'), 'Đ', 'D'))),
              '[^a-z0-9]+', '-', 'g'
            )
          ),
          80
        )
      ),
      ''
    ),
    'tin'
  );
$$;
comment on function public.slugify(text) is
  'Slug không dấu cho URL tenapp.vn/tin/{slug}-{short_id}. Khớp toSlug() ở packages/shared/src/slug.ts.';

-- ── short id ──────────────────────────────────────────────────────────────────
-- 6 ký tự base36 ngẫu nhiên cho listings.short_id / groups.short_id (unique do ràng buộc ở bảng, trigger tự thử lại).
create or replace function public.gen_short_id(p_length int default 6)
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('0123456789abcdefghijklmnopqrstuvwxyz', 1 + floor(random() * 36)::int, 1), '')
  from generate_series(1, greatest(p_length, 4));
$$;
comment on function public.gen_short_id(int) is 'Chuỗi base36 ngẫu nhiên (mặc định 6 ký tự) cho short_id.';

-- Helper chỉ dùng trong trigger / migration; không cho client gọi.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.slugify(text) from public, anon, authenticated;
revoke execute on function public.gen_short_id(int) from public, anon, authenticated;

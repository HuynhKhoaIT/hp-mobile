-- 20261127090000 mini_apps
-- Mục đích: admin bật / tắt từng mini-app của super app (/admin/catalog) — tắt thì app + web ẩn ô ở Hub và chặn route.
-- Bảng ảnh hưởng: mini_apps (mới); trigger trg_mini_apps_stamp (updated_by), trg_mini_apps_audit (audit_log `mini_app.update`).
-- Quyền: anon + authenticated chỉ đọc (cờ bật / tắt là cấu hình công khai, không PII); chỉ admin sửa `is_enabled`, `sort_order`.
--        Dòng do migration quản lý (client không insert / delete) — thêm mini-app mới = migration mở rộng CHECK + insert dòng.
--        moderator KHÔNG sửa được (như catalog: chỉ admin).
-- Mã mini-app = `@hp/shared` MINI_APP_CODES (FEATURES + goiTho). Khởi đầu: 6 mini-app hiện có bật, goiTho tắt tới khi sẵn sàng.
-- Client cập nhật: @hp/core `listMiniApps` / `useMiniApps` (fail-open khi lỗi), admin `updateMiniApp`; app + web lọc Hub / chặn route.

create table if not exists public.mini_apps (
  code text primary key check (code in ('pass', 'room', 'job', 'lostFound', 'ride', 'sport', 'goiTho')),
  is_enabled boolean not null default true,
  sort_order int not null default 0,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.mini_apps is 'Cấu hình bật / tắt mini-app (admin). Mã khớp MINI_APP_CODES của @hp/shared.';
comment on column public.mini_apps.is_enabled is 'false = ẩn khỏi Hub app / web và chặn route (dữ liệu đã đăng vẫn còn).';
comment on column public.mini_apps.sort_order is 'Thứ tự ô ở Hub, tăng dần.';

alter table public.mini_apps enable row level security;
grant select on public.mini_apps to anon, authenticated;
grant update (is_enabled, sort_order) on public.mini_apps to authenticated;   -- policy chỉ cho admin

drop policy if exists mini_apps_select_all on public.mini_apps;
create policy mini_apps_select_all on public.mini_apps for select to anon, authenticated using (true);

drop policy if exists mini_apps_update_admin on public.mini_apps;
create policy mini_apps_update_admin on public.mini_apps for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop trigger if exists trg_mini_apps_updated_at on public.mini_apps;
create trigger trg_mini_apps_updated_at before update on public.mini_apps
  for each row execute function public.set_updated_at();

-- Ghi người sửa (không tin client): updated_by luôn = auth.uid() khi có phiên.
create or replace function public.trg_mini_apps_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.code := old.code;
  new.updated_by := coalesce(auth.uid(), old.updated_by);
  return new;
end;
$$;
drop trigger if exists trg_mini_apps_stamp on public.mini_apps;
create trigger trg_mini_apps_stamp before update on public.mini_apps
  for each row execute function public.trg_mini_apps_stamp();

-- Audit mọi thay đổi từ người dùng đăng nhập (admin). Migration / service role không có auth.uid() → bỏ qua.
create or replace function public.trg_mini_apps_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is not null and (old.is_enabled, old.sort_order) is distinct from (new.is_enabled, new.sort_order) then
    insert into public.audit_log (actor_id, action, target_type, target_id, meta)
    values (
      v_actor,
      'mini_app.update',
      'mini_app',
      new.code,
      jsonb_build_object(
        'old', jsonb_build_object('is_enabled', old.is_enabled, 'sort_order', old.sort_order),
        'new', jsonb_build_object('is_enabled', new.is_enabled, 'sort_order', new.sort_order)));
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_mini_apps_audit() from public, anon, authenticated;
drop trigger if exists trg_mini_apps_audit on public.mini_apps;
create trigger trg_mini_apps_audit after update on public.mini_apps
  for each row execute function public.trg_mini_apps_audit();

-- ── Dữ liệu khởi đầu ────────────────────────────────────────────────────────────
insert into public.mini_apps (code, is_enabled, sort_order) values
  ('pass',      true,  10),
  ('room',      true,  20),
  ('job',       true,  30),
  ('lostFound', true,  40),
  ('ride',      true,  50),
  ('sport',     true,  60),
  ('goiTho',    false, 70)
on conflict (code) do nothing;

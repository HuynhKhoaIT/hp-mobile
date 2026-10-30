-- 0002 core
-- Mục đích: nhóm bảng Core (supabase/CLAUDE.md mục 4) + helper RLS + view public_profiles + hook JWT.
-- Bảng: sites, profiles, ratings, notifications, bookmarks, badge_requests, blocks, rate_limits, audit_log.
-- Client: @hp/core profile.ts / sites.ts / keys.ts; type sinh lại ở packages/db.
-- Quyền: migration 0001 đã bỏ quyền mặc định → mọi grant dưới đây là cố ý. anon chỉ đọc sites + public_profiles.

-- ═════════════════════════════════════════════════════════════════════════════
-- sites — khu liên hợp (dung_quat, hai_duong, hung_yen…)
-- ═════════════════════════════════════════════════════════════════════════════
create table public.sites (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  location extensions.geography(point, 4326) not null,
  created_at timestamptz not null default now()
);
comment on table public.sites is 'Danh mục khu liên hợp. Thêm khu mới = thêm dòng (docs/ARCHITECTURE.md mục 12).';
alter table public.sites enable row level security;
grant select on public.sites to anon, authenticated;
grant insert, update, delete on public.sites to authenticated;   -- policy chỉ cho admin

-- ═════════════════════════════════════════════════════════════════════════════
-- profiles — 1:1 với auth.users
-- ═════════════════════════════════════════════════════════════════════════════
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,                                   -- dạng 849xxxxxxxx (không '+'), null nếu đăng nhập Google
  full_name text not null default '' check (char_length(full_name) <= 80),
  avatar_url text,
  site text references public.sites (code) on update cascade on delete set null,
  department text check (char_length(department) <= 80),
  badges text[] not null default '{}'
    check (badges <@ array['phone', 'worker', 'landlord', 'venue', 'employer']),
  locale text not null default 'vi' check (locale in ('vi', 'en', 'zh')),
  reputation_score int not null default 0,
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  home_location extensions.geography(point, 4326),
  is_banned boolean not null default false,            -- cấm vĩnh viễn (chỉ admin)
  banned_until timestamptz,                            -- khoá tạm 7/30 ngày (moderator)
  role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  push_tokens text[] not null default '{}',
  notification_prefs jsonb not null default '{}',
  consent_at timestamptz,                              -- Nghị định 13/2023: thời điểm đồng ý
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
comment on column public.profiles.notification_prefs is 'Bật/tắt từng loại thông báo: { "<notification_type>": boolean }. Schema: packages/shared.';
create index profiles_site_idx on public.profiles (site);
alter table public.profiles enable row level security;
grant select, update on public.profiles to authenticated;   -- insert qua trigger; xoá = deleted_at

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- Helper RLS (security definer: đọc profiles / blocks không vướng RLS)
-- Policy gọi dạng (select public.is_staff()) để Postgres chỉ tính 1 lần / câu lệnh.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('moderator', 'admin') and deleted_at is null
  );
$$;

create function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and deleted_at is null
  );
$$;

create function public.is_banned()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and (is_banned or (banned_until is not null and banned_until > now()) or deleted_at is not null)
  );
$$;
comment on function public.is_banned() is 'Người gọi đang bị cấm, khoá tạm hoặc đã xoá tài khoản.';

grant execute on function public.is_staff(), public.is_admin(), public.is_banned() to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Tên hiển thị công khai: "tên + chữ cái họ" — "Nguyễn Văn An" → "An N."
-- ═════════════════════════════════════════════════════════════════════════════
create function public.short_name(p_full_name text)
returns text language sql immutable parallel safe set search_path = '' as $$
  with w as (select regexp_split_to_array(btrim(coalesce(p_full_name, '')), '\s+') as parts)
  select case
    when btrim(coalesce(p_full_name, '')) = '' then ''
    when array_length(parts, 1) = 1 then parts[1]
    else parts[array_length(parts, 1)] || ' ' || upper(left(parts[1], 1)) || '.'
  end
  from w;
$$;
-- Hàm thuần (không đọc bảng). View public_profiles gọi nó, và Postgres kiểm quyền execute theo người truy vấn.
revoke execute on function public.short_name(text) from public;
grant execute on function public.short_name(text) to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Tạo profile khi có user mới (OTP hoặc Google)
-- ═════════════════════════════════════════════════════════════════════════════
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_locale text := new.raw_user_meta_data ->> 'locale';
begin
  insert into public.profiles (id, phone, full_name, badges, locale)
  values (
    new.id,
    nullif(new.phone, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80),
    case when coalesce(new.phone, '') <> '' then array['phone'] else '{}'::text[] end,
    case when v_locale in ('vi', 'en', 'zh') then v_locale else 'vi' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger trg_auth_users_new_profile after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═════════════════════════════════════════════════════════════════════════════
-- Guard: client không tự đổi cột nhạy cảm. Chỉ áp cho role client (anon / authenticated);
-- trigger / RPC security definer (current_user = postgres) và service role đi qua.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.trg_profiles_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- Không ai sửa từ client
  if new.id is distinct from old.id
     or new.phone is distinct from old.phone
     or new.reputation_score is distinct from old.reputation_score
     or new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
     or new.created_at is distinct from old.created_at then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'profiles: cột chỉ server được đổi';
  end if;

  -- Chỉ staff: huy hiệu, khoá tạm
  if not public.is_staff()
     and (new.badges is distinct from old.badges or new.banned_until is distinct from old.banned_until) then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'profiles: badges / banned_until chỉ staff';
  end if;

  -- Chỉ admin: vai trò, cấm vĩnh viễn
  if not public.is_admin()
     and (new.role is distinct from old.role or new.is_banned is distinct from old.is_banned) then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'profiles: role / is_banned chỉ admin';
  end if;

  return new;
end;
$$;

create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.trg_profiles_guard();

-- Policy profiles: bảng gốc chỉ chủ + staff; người khác đọc qua public_profiles.
create policy profiles_select_own_or_staff on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_update_staff on public.profiles for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- ═════════════════════════════════════════════════════════════════════════════
-- public_profiles — lối duy nhất cho người khác / anon. Không SĐT, token, prefs, họ tên đầy đủ.
-- Chạy với quyền owner (bỏ qua RLS bảng gốc) nên chỉ chọn cột an toàn và lọc tài khoản đã xoá.
-- ═════════════════════════════════════════════════════════════════════════════
create view public.public_profiles with (security_invoker = false) as
select
  p.id,
  public.short_name(p.full_name) as display_name,
  p.avatar_url,
  p.site,
  p.badges,
  p.rating_avg,
  p.rating_count,
  p.reputation_score,
  p.created_at
from public.profiles p
where p.deleted_at is null;
comment on view public.public_profiles is 'Hồ sơ công khai (web /u/[id], người đăng tin). Không thêm cột nhạy cảm vào view này.';
grant select on public.public_profiles to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- blocks
-- ═════════════════════════════════════════════════════════════════════════════
create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);
alter table public.blocks enable row level security;
grant select, insert, delete on public.blocks to authenticated;

create policy blocks_select_own on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy blocks_insert_own on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy blocks_delete_own on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

create function public.is_blocked(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;
comment on function public.is_blocked(uuid, uuid) is 'Hai người có chặn nhau (chiều nào cũng tính).';
grant execute on function public.is_blocked(uuid, uuid) to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- ratings — đánh giá sau giao dịch / chuyến / trận
-- Insert chưa mở cho client: cần kiểm tra người chấm thật sự giao dịch với người được chấm,
-- việc này làm bằng RPC khi đã có listings (tuần 6) và groups (tuần 8).
-- ═════════════════════════════════════════════════════════════════════════════
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid not null references public.profiles (id) on delete cascade,
  ratee_id uuid not null references public.profiles (id) on delete cascade,
  context_type text not null check (context_type in ('listing', 'group')),
  context_id uuid not null,
  score smallint not null check (score between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (rater_id, context_type, context_id),
  check (rater_id <> ratee_id)
);
create index ratings_ratee_idx on public.ratings (ratee_id, created_at desc);
alter table public.ratings enable row level security;
grant select on public.ratings to authenticated;

create policy ratings_select_authenticated on public.ratings for select to authenticated using (true);

create function public.trg_ratings_aggregate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_ratee uuid := coalesce(new.ratee_id, old.ratee_id);
begin
  update public.profiles p
  set rating_avg = coalesce(s.avg_score, 0), rating_count = s.n
  from (select round(avg(score)::numeric, 2) as avg_score, count(*)::int as n
        from public.ratings where ratee_id = v_ratee) s
  where p.id = v_ratee;
  return null;
end;
$$;
revoke execute on function public.trg_ratings_aggregate() from public, anon, authenticated;
create trigger trg_ratings_aggregate after insert or delete on public.ratings
  for each row execute function public.trg_ratings_aggregate();

-- ═════════════════════════════════════════════════════════════════════════════
-- notifications — nguồn sự thật của thông báo; push chỉ là kênh nhắc (send-push).
-- Lưu key i18n + tham số, client dịch theo locale. Tạo bởi trigger / cron / service role.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'new_message', 'join_request', 'join_accepted', 'group_reminder',
    'listing_approved', 'listing_rejected', 'listing_expiring', 'lost_found_match', 'system'
  )),
  title_key text not null,
  body_key text,
  params jsonb not null default '{}',
  data jsonb not null default '{}' check (data = '{}'::jsonb or data ? 'screen'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
comment on column public.notifications.data is 'Deep link: { "screen": "listing|group|chat|notifications", "params": { "id": ... } } — khớp NOTIFICATION_SCREENS ở packages/shared.';
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;   -- chỉ được đánh dấu đã đọc

create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.notifications;

-- ═════════════════════════════════════════════════════════════════════════════
-- bookmarks — lưu tin / nhóm
-- ═════════════════════════════════════════════════════════════════════════════
create table public.bookmarks (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'group')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index bookmarks_user_created_idx on public.bookmarks (user_id, created_at desc);
alter table public.bookmarks enable row level security;
grant select, insert, delete on public.bookmarks to authenticated;

create policy bookmarks_select_own on public.bookmarks for select to authenticated
  using (user_id = (select auth.uid()));
create policy bookmarks_insert_own on public.bookmarks for insert to authenticated
  with check (user_id = (select auth.uid()) and not (select public.is_banned()));
create policy bookmarks_delete_own on public.bookmarks for delete to authenticated
  using (user_id = (select auth.uid()));

-- ═════════════════════════════════════════════════════════════════════════════
-- badge_requests — xin huy hiệu. Tạo qua Edge Function request-badge (service role); staff duyệt.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.badge_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge text not null check (badge in ('worker', 'landlord', 'venue', 'employer')),
  document_path text not null,                        -- bucket verification (riêng tư)
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index badge_requests_status_idx on public.badge_requests (status, created_at);
create unique index badge_requests_one_pending_idx on public.badge_requests (user_id, badge) where status = 'pending';
alter table public.badge_requests enable row level security;
grant select, update on public.badge_requests to authenticated;

create policy badge_requests_select_own_or_staff on public.badge_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy badge_requests_update_staff on public.badge_requests for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create trigger trg_badge_requests_updated_at before update on public.badge_requests
  for each row execute function public.set_updated_at();

create function public.trg_badge_requests_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_by := coalesce((select auth.uid()), new.reviewed_by);
    new.reviewed_at := now();
    if new.status = 'approved' then
      update public.profiles
      set badges = array(select distinct b from unnest(badges || new.badge) as b order by b)
      where id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_badge_requests_review() from public, anon, authenticated;
create trigger trg_badge_requests_review before update on public.badge_requests
  for each row execute function public.trg_badge_requests_review();

-- ═════════════════════════════════════════════════════════════════════════════
-- rate_limits + assert_rate_limit — cửa sổ cố định. Bảng nội bộ, không policy.
-- ═════════════════════════════════════════════════════════════════════════════
create table public.rate_limits (
  key text not null,                                  -- user id hoặc hash IP / SĐT
  action text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, action, window_start)
);
alter table public.rate_limits enable row level security;   -- không policy: client không chạm được

create function public.assert_rate_limit(p_key text, p_action text, p_max int, p_window_seconds int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limits (key, action, window_start, count)
  values (p_key, p_action, v_window, 1)
  on conflict (key, action, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;

  if v_count > p_max then
    raise exception using errcode = 'P0001', message = 'rate_limited',
      detail = format('%s: tối đa %s lần / %s giây', p_action, p_max, p_window_seconds);
  end if;
end;
$$;
comment on function public.assert_rate_limit(text, text, int, int) is
  'Tăng bộ đếm; vượt p_max trong cửa sổ p_window_seconds → P0001 rate_limited (Edge Function map sang 429). Giới hạn: RATE_LIMITS ở packages/shared.';
revoke execute on function public.assert_rate_limit(text, text, int, int) from public, anon, authenticated;
grant execute on function public.assert_rate_limit(text, text, int, int) to service_role;

-- ═════════════════════════════════════════════════════════════════════════════
-- audit_log — chỉ thêm, không sửa / xoá (kể cả service role).
-- ═════════════════════════════════════════════════════════════════════════════
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),   -- <đối_tượng>.<động_từ>, vd listing.approve
  target_type text,
  target_id text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_target_idx on public.audit_log (target_type, target_id);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
alter table public.audit_log enable row level security;
grant select, insert on public.audit_log to authenticated;

create policy audit_log_insert_staff on public.audit_log for insert to authenticated
  with check ((select public.is_staff()) and actor_id = (select auth.uid()));
create policy audit_log_select_admin on public.audit_log for select to authenticated
  using ((select public.is_admin()));

create function public.trg_audit_log_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '42501', message = 'forbidden', detail = 'audit_log chỉ được thêm';
end;
$$;
create trigger trg_audit_log_immutable before update or delete on public.audit_log
  for each row execute function public.trg_audit_log_immutable();

-- ═════════════════════════════════════════════════════════════════════════════
-- sites: chỉ admin ghi
-- ═════════════════════════════════════════════════════════════════════════════
create policy sites_select_all on public.sites for select to anon, authenticated using (true);
create policy sites_insert_admin on public.sites for insert to authenticated with check ((select public.is_admin()));
create policy sites_update_admin on public.sites for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy sites_delete_admin on public.sites for delete to authenticated using ((select public.is_admin()));

-- ═════════════════════════════════════════════════════════════════════════════
-- Auth hook: chép profiles.role vào JWT (app_metadata.role) cho middleware web.
-- Quyền thật vẫn kiểm bằng is_staff() / is_admin() đọc profiles (thu hồi có hiệu lực ngay).
-- Bật: config.toml [auth.hook.custom_access_token]; staging / prod bật trên Dashboard (docs/RUNBOOK.md).
-- ═════════════════════════════════════════════════════════════════════════════
create function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  v_role text;
begin
  select role into v_role from public.profiles where id = (event ->> 'user_id')::uuid and deleted_at is null;
  v_claims := jsonb_set(
    v_claims, '{app_metadata}',
    coalesce(v_claims -> 'app_metadata', '{}'::jsonb) || jsonb_build_object('role', coalesce(v_role, 'user'))
  );
  return jsonb_set(event, '{claims}', v_claims);
end;
$$;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

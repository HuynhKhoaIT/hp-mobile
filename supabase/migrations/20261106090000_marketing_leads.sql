-- Marketing: lead từ form landing / /cho-chu-tro (apps/web, Server Action), rate limit theo IP cho action công khai.
-- Bảng: marketing_leads. RPC: check_rate_limit (service role), export_marketing_leads (admin). admin_stats thêm leads_new.
-- Client: @hp/core marketing.ts (submitLead — client service role ở Server Action web; listLeads / updateLead /
-- exportLeads — phiên staff), Zod LeadInputSchema ở @hp/shared schemas/marketing.ts. App không dùng bảng này.
--
-- | Vai trò           | select | insert | update (status, note) | export_marketing_leads | check_rate_limit |
-- |-------------------|--------|--------|------------------------|------------------------|------------------|
-- | anon              | –      | –      | –                      | –                      | –                |
-- | user / bị cấm     | –      | –      | –                      | –                      | –                |
-- | moderator         | được   | –      | được                   | –                      | –                |
-- | admin             | được   | –      | được                   | được (audit)           | –                |
-- | service role      | được   | được   | được                   | –                      | được             |
--
-- Lead chứa liên hệ (SĐT / email) → không có view công khai; audit không chép liên hệ. Không xoá (status closed).

create table public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  contact text not null check (char_length(contact) between 5 and 120),
  contact_type text not null check (contact_type in ('email', 'phone')),
  kind text not null check (kind in ('user', 'landlord', 'venue', 'employer')),
  name text check (char_length(name) <= 80),
  site text references public.sites (code) on update cascade on delete set null,
  message text check (char_length(message) <= 500),
  source text not null default 'landing' check (source ~ '^[a-z0-9_-]{1,40}$'),
  locale text not null default 'vi' check (locale in ('vi', 'en', 'zh')),
  utm jsonb not null default '{}' check (jsonb_typeof(utm) = 'object'),
  consent_at timestamptz not null,
  consent_version text not null check (char_length(consent_version) between 1 and 20),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  note text check (char_length(note) <= 1000),
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.marketing_leads is
  'Lead marketing (chủ trọ, chủ sân, nhà tuyển dụng, người dùng). Chỉ Server Action web (service role) thêm; staff đọc / xử lý.';
comment on column public.marketing_leads.utm is 'LeadUtmSchema (@hp/shared schemas/marketing.ts): utm_source / medium / campaign / term / content.';
comment on column public.marketing_leads.contact is 'SĐT dạng 84… (normalizePhone) hoặc email chữ thường — PII, không vào audit / view công khai.';
create index marketing_leads_status_idx on public.marketing_leads (status, created_at desc);
alter table public.marketing_leads enable row level security;
grant select, update on public.marketing_leads to authenticated;   -- policy chỉ cho staff
grant select, insert, update on public.marketing_leads to service_role;
create trigger trg_marketing_leads_updated_at before update on public.marketing_leads
  for each row execute function public.set_updated_at();

create policy marketing_leads_select_staff on public.marketing_leads for select to authenticated
  using ((select public.is_staff()));
create policy marketing_leads_update_staff on public.marketing_leads for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Staff chỉ đổi status / note; ghi người xử lý + audit lead.update (không chép liên hệ vào meta).
create function public.trg_marketing_leads_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('role', true), 'none') not in ('anon', 'authenticated') then
    return new;
  end if;
  if (new.contact, new.contact_type, new.kind, new.name, new.site, new.message, new.source, new.locale, new.utm,
      new.consent_at, new.consent_version, new.created_at)
     is distinct from
     (old.contact, old.contact_type, old.kind, old.name, old.site, old.message, old.source, old.locale, old.utm,
      old.consent_at, old.consent_version, old.created_at) then
    raise exception using errcode = '42501', message = 'forbidden', detail = 'marketing_leads: staff chỉ đổi status / note';
  end if;
  if new.status is distinct from old.status or new.note is distinct from old.note then
    new.handled_by := (select auth.uid());
    new.handled_at := now();
    insert into public.audit_log (actor_id, action, target_type, target_id, meta)
    values ((select auth.uid()), 'lead.update', 'lead', new.id::text,
            jsonb_build_object('from', old.status, 'to', new.status, 'kind', new.kind));
  else
    new.handled_by := old.handled_by;
    new.handled_at := old.handled_at;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_marketing_leads_guard() from public, anon, authenticated;
create trigger trg_marketing_leads_guard before update on public.marketing_leads
  for each row execute function public.trg_marketing_leads_guard();

-- ═════════════════════════════════════════════════════════════════════════════
-- check_rate_limit — rate limit cho action công khai gọi từ server web (lead form, báo cáo của khách).
-- p_key: hash IP (sha256 + salt ở server, không lưu IP thô). Bảng giới hạn cố định ở đây, khớp RATE_LIMITS ở @hp/shared.
-- Trả false khi vượt (server trả errors.rate_limited), không raise để action tự quyết thông điệp.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.check_rate_limit(p_key text, p_action text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  v_max int;
  v_window int;
begin
  if p_key is null or char_length(p_key) not between 8 and 128 then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'check_rate_limit: p_key';
  end if;
  case p_action
    when 'lead' then v_max := 5; v_window := 3600;           -- RATE_LIMITS.leadsPerIpPerHour
    else raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'check_rate_limit: p_action';
  end case;
  begin
    perform public.assert_rate_limit('ip:' || p_key, p_action, v_max, v_window);
  exception when sqlstate 'P0001' then
    return false;
  end;
  return true;
end;
$$;
comment on function public.check_rate_limit(text, text) is
  'Rate limit action công khai theo hash IP (service role). lead: 5 / giờ. true = còn lượt, false = vượt.';
revoke execute on function public.check_rate_limit(text, text) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, text) to service_role;

-- ═════════════════════════════════════════════════════════════════════════════
-- export_marketing_leads — admin xuất CSV (web route handler), ghi audit lead.export.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.export_marketing_leads(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_status text default null,
  p_limit int default 5000
)
returns table (id uuid, created_at timestamptz, kind text, name text, contact text, contact_type text, site text,
               message text, source text, locale text, utm jsonb, status text, note text, handled_at timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  insert into public.audit_log (actor_id, action, target_type, meta)
  values (auth.uid(), 'lead.export', 'marketing_leads',
          jsonb_build_object('from', p_from, 'to', p_to, 'status', p_status));
  return query
    select l.id, l.created_at, l.kind, l.name, l.contact, l.contact_type, l.site, l.message, l.source, l.locale,
           l.utm, l.status, l.note, l.handled_at
    from public.marketing_leads l
    where (p_from is null or l.created_at >= p_from)
      and (p_to is null or l.created_at < p_to)
      and (p_status is null or l.status = p_status)
    order by l.created_at desc
    limit least(greatest(coalesce(p_limit, 5000), 1), 10000);
end;
$$;
comment on function public.export_marketing_leads(timestamptz, timestamptz, text, int) is
  'Xuất lead cho admin (CSV ở web, ≤ 10.000 dòng), ghi audit lead.export.';
revoke execute on function public.export_marketing_leads(timestamptz, timestamptz, text, int) from public, anon;
grant execute on function public.export_marketing_leads(timestamptz, timestamptz, text, int) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- admin_stats: thêm leads_new (lead chưa xử lý) cho dashboard + badge thanh bên.
-- ═════════════════════════════════════════════════════════════════════════════
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles where deleted_at is null),
    'users_new_7d', (select count(*) from public.profiles where deleted_at is null and created_at > now() - interval '7 days'),
    'users_banned', (select count(*) from public.profiles
                     where deleted_at is null and (is_banned or (banned_until is not null and banned_until > now()))),
    'listings_active', (select count(*) from public.listings
                        where status = 'active' and deleted_at is null and (expires_at is null or expires_at > now())),
    'listings_new_7d', (select count(*) from public.listings where deleted_at is null and created_at > now() - interval '7 days'),
    'listings_by_category', (select coalesce(jsonb_object_agg(category, n), '{}') from (
        select category::text, count(*) as n from public.listings
        where status = 'active' and deleted_at is null group by category) c),
    'groups_upcoming', (select count(*) from public.groups where status in ('open', 'full') and deleted_at is null and starts_at > now()),
    'groups_new_7d', (select count(*) from public.groups where deleted_at is null and created_at > now() - interval '7 days'),
    'messages_24h', (select count(*) from public.messages where created_at > now() - interval '24 hours'),
    'moderation_pending', (select count(*) from public.moderation_queue where status = 'pending'),
    'reports_open', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'badges_pending', (select count(*) from public.badge_requests where status = 'pending'),
    'venues_pending', (select count(*) from public.venues where status = 'pending' and deleted_at is null),
    'leads_new', (select count(*) from public.marketing_leads where status = 'new')
  );
end;
$$;

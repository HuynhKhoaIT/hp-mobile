-- CSKH cho admin: chăm sóc sau khi đơn Gọi thợ hoàn thành. Mỗi đơn có 2 dòng chăm sóc (khách + thợ được chọn); staff gọi
-- hoặc nhắn Zalo (zalo_outreach) để hỏi thăm / xin đánh giá, rồi ghi kết quả: trạng thái, kênh, ghi chú, điểm hài lòng 1–5.
-- Điểm CSKH là ghi chép nội bộ của staff theo lời khách, KHÔNG thay đổi đánh giá thật (`ratings`) trong app.
--
-- Bảng: cskh_cases (chỉ RPC ghi). View: cskh_queue (hàng chờ: mỗi đơn completed × 2 bên, staff-only, kèm đã đánh giá trong app).
-- RPC: save_cskh_case, reveal_cskh_phone (audit, 60 / giờ). zalo_outreach mở rộng: loại tin service_followup, rating_request.
-- Client: @hp/core admin.ts (listCskhQueue, saveCskhCase, revealCskhPhone), Zod ở @hp/shared schemas/actions/cskh.ts,
-- giao diện /admin/cskh. Không SĐT trong view / audit: SĐT chỉ trả qua reveal_cskh_phone (ghi audit `cskh.reveal`).
--
-- | Vai trò           | select cskh_cases / cskh_queue | save_cskh_case | reveal_cskh_phone |
-- |-------------------|--------------------------------|----------------|-------------------|
-- | anon              | –                              | –              | –                 |
-- | user / bị cấm     | 0 dòng                         | forbidden      | forbidden         |
-- | moderator, admin  | được                           | được (audit)   | được (audit)      |

-- ═════════════════════════════════════════════════════════════════════════════
-- cskh_cases: một dòng / (đơn, bên) — tạo khi staff ghi kết quả lần đầu (chưa có dòng = 'pending').
-- ═════════════════════════════════════════════════════════════════════════════
create table public.cskh_cases (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  party text not null check (party in ('customer', 'pro')),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'no_answer', 'done')),
  channel text check (channel in ('call', 'zalo')),
  note text check (char_length(note) <= 500),
  score int check (score between 1 and 5),
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, party)
);
comment on table public.cskh_cases is
  'Kết quả chăm sóc sau đơn Gọi thợ hoàn thành, theo từng bên (customer | pro). Điểm 1–5 là ghi chép nội bộ của staff, không phải ratings.';
create index cskh_cases_status_idx on public.cskh_cases (status, handled_at desc);
create index cskh_cases_user_idx on public.cskh_cases (user_id);
alter table public.cskh_cases enable row level security;
grant select on public.cskh_cases to authenticated;   -- policy chỉ cho staff; ghi qua RPC save_cskh_case
create policy cskh_cases_select_staff on public.cskh_cases for select to authenticated
  using ((select public.is_staff()));
create trigger trg_cskh_cases_updated_at before update on public.cskh_cases
  for each row execute function public.set_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- cskh_queue: hàng chờ CSKH = mọi đơn Gọi thợ đã hoàn thành × (khách, thợ được chọn). security_invoker: quyền đọc theo
-- RLS của staff; `is_staff()` trong where để người dùng thường (đọc được đơn của mình) không thấy ghi chú nội bộ.
-- Không có SĐT (chỉ cờ has_phone). rated_in_app: bên đó đã chấm bên kia trong app.
-- ═════════════════════════════════════════════════════════════════════════════
create view public.cskh_queue with (security_invoker = true) as
with parties as (
  select r.id as request_id, 'customer'::text as party, r.customer_id as user_id, r.trade, r.title, r.completed_at
  from public.service_requests r
  where r.status = 'completed' and r.deleted_at is null
  union all
  select r.id, 'pro'::text, q.pro_id, r.trade, r.title, r.completed_at
  from public.service_requests r
  join public.service_quotes q on q.id = r.accepted_quote_id
  where r.status = 'completed' and r.deleted_at is null
)
select
  p.request_id,
  p.party,
  p.user_id,
  p.trade::text as trade,
  p.title,
  p.completed_at,
  pr.full_name as user_name,
  (pr.phone is not null) as has_phone,
  coalesce(c.status, 'pending') as status,
  c.channel,
  c.note,
  c.score,
  c.handled_at,
  hp.full_name as handled_by_name,
  exists (
    select 1 from public.ratings rt
    where rt.context_type = 'service_request' and rt.context_id = p.request_id and rt.rater_id = p.user_id
  ) as rated_in_app
from parties p
join public.profiles pr on pr.id = p.user_id and pr.deleted_at is null
left join public.cskh_cases c on c.request_id = p.request_id and c.party = p.party
left join public.profiles hp on hp.id = c.handled_by
where (select public.is_staff());
comment on view public.cskh_queue is
  'Hàng chờ CSKH (staff): đơn Gọi thợ hoàn thành × (khách, thợ). status = coalesce(cskh_cases.status, pending). Không SĐT.';
grant select on public.cskh_queue to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- Hàm nội bộ: người của một bên trong đơn hoàn thành (null = không có đơn / chưa chọn thợ).
-- ═════════════════════════════════════════════════════════════════════════════
create function public.cskh_party_user(p_request_id uuid, p_party text)
returns uuid
language sql stable security definer set search_path = '' as $$
  select case p_party when 'customer' then r.customer_id when 'pro' then q.pro_id end
  from public.service_requests r
  left join public.service_quotes q on q.id = r.accepted_quote_id
  where r.id = p_request_id and r.status = 'completed' and r.deleted_at is null;
$$;
revoke execute on function public.cskh_party_user(uuid, text) from public, anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- save_cskh_case — staff ghi kết quả chăm sóc (tạo / cập nhật dòng của (đơn, bên)), audit `cskh.update`.
--   Lỗi P0001: invalid_input, not_found (đơn chưa hoàn thành / chưa có người của bên đó). Điểm chỉ khi contacted / done.
--   Audit không chép ghi chú (có thể chứa thông tin cá nhân): chỉ bên, trạng thái, kênh, điểm.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.save_cskh_case(
  p_request_id uuid, p_party text, p_status text, p_channel text default null, p_note text default null, p_score int default null
)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_user uuid;
begin
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_request_id is null or p_party is null or p_party not in ('customer', 'pro')
     or p_status is null or p_status not in ('pending', 'contacted', 'no_answer', 'done')
     or (p_channel is not null and p_channel not in ('call', 'zalo'))
     or (v_note is not null and char_length(v_note) > 500)
     or (p_score is not null and (p_score not between 1 and 5 or p_status not in ('contacted', 'done'))) then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'save_cskh_case';
  end if;
  v_user := public.cskh_party_user(p_request_id, p_party);
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;

  insert into public.cskh_cases (request_id, party, user_id, status, channel, note, score, handled_by, handled_at)
  values (p_request_id, p_party, v_user, p_status, p_channel, v_note, p_score, v_uid, now())
  on conflict (request_id, party) do update
    set status = excluded.status, channel = excluded.channel, note = excluded.note, score = excluded.score,
        handled_by = excluded.handled_by, handled_at = excluded.handled_at;

  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, 'cskh.update', 'service_request', p_request_id::text,
          jsonb_build_object('party', p_party, 'status', p_status, 'channel', p_channel, 'score', p_score));
end;
$$;
comment on function public.save_cskh_case(uuid, text, text, text, text, int) is
  'Staff ghi kết quả CSKH cho (đơn Gọi thợ hoàn thành, bên): trạng thái, kênh, ghi chú, điểm 1–5. Audit cskh.update (không chép ghi chú).';
revoke execute on function public.save_cskh_case(uuid, text, text, text, text, int) from public, anon;
grant execute on function public.save_cskh_case(uuid, text, text, text, text, int) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- reveal_cskh_phone — staff lấy SĐT của một bên để gọi (dạng 0xxxxxxxxx). 60 / giờ, audit `cskh.reveal` (không chép SĐT).
--   Lỗi P0001: invalid_input, not_found, no_phone (người dùng Google), rate_limited.
-- ═════════════════════════════════════════════════════════════════════════════
create function public.reveal_cskh_phone(p_request_id uuid, p_party text)
returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_user uuid;
  v_phone text;
begin
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_request_id is null or p_party is null or p_party not in ('customer', 'pro') then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'reveal_cskh_phone';
  end if;
  v_user := public.cskh_party_user(p_request_id, p_party);
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  select phone into v_phone from public.profiles where id = v_user and deleted_at is null;
  if v_phone is null or v_phone !~ '^84[0-9]{8,10}$' then
    raise exception using errcode = 'P0001', message = 'no_phone';
  end if;
  perform public.assert_rate_limit(v_uid::text, 'cskh_reveal', 60, 3600);
  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, 'cskh.reveal', 'service_request', p_request_id::text, jsonb_build_object('party', p_party));
  return '0' || substr(v_phone, 3);   -- 84912345678 → 0912345678
end;
$$;
comment on function public.reveal_cskh_phone(uuid, text) is
  'Staff lấy SĐT (0xxxxxxxxx) của khách / thợ trong đơn hoàn thành để gọi. 60 / giờ, audit cskh.reveal (không chép SĐT).';
revoke execute on function public.reveal_cskh_phone(uuid, text) from public, anon;
grant execute on function public.reveal_cskh_phone(uuid, text) to authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- zalo_outreach mở rộng: hai loại tin CSKH (hỏi thăm sau dịch vụ, mời đánh giá). Hàm viết lại đầy đủ (create or replace),
-- chỉ khác danh sách loại tin; mọi hành vi khác giữ nguyên.
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.zalo_messages drop constraint zalo_messages_kind_check;
alter table public.zalo_messages add constraint zalo_messages_kind_check
  check (kind in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request'));

create or replace function public.reserve_zalo_message(p_target_type text, p_target_id uuid, p_kind text, p_content text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_content text := btrim(coalesce(p_content, ''));
  v_phone text;
  v_type text;
  v_found boolean;
  v_row public.zalo_quota;
  v_status jsonb;
  v_msg uuid;
  v_now timestamptz := now();
  v_delay int;
begin
  if not public.is_staff() then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  if p_target_type is null or p_target_type not in ('lead', 'user')
     or p_kind is null or p_kind not in ('lead_reply', 'listing_notice', 'warning', 'custom', 'service_followup', 'rating_request')
     or p_target_id is null or char_length(v_content) not between 1 and 2000 then
    raise exception using errcode = 'P0001', message = 'invalid_input', detail = 'reserve_zalo_message';
  end if;

  if p_target_type = 'lead' then
    select contact, contact_type into v_phone, v_type from public.marketing_leads where id = p_target_id;
    v_found := found;
    if v_found and v_type <> 'phone' then v_phone := null; end if;
  else
    select phone into v_phone from public.profiles where id = p_target_id and deleted_at is null;
    v_found := found;
  end if;
  if not v_found then
    raise exception using errcode = 'P0001', message = 'not_found';
  end if;
  if v_phone is null or v_phone !~ '^84[0-9]{8,10}$' then
    raise exception using errcode = 'P0001', message = 'no_phone';
  end if;

  perform public.zalo_today(v_uid);
  select * into v_row from public.zalo_quota
   where staff_id = v_uid and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date for update;
  v_status := public.zalo_present(v_row);
  if not (v_status ->> 'can_send')::boolean then
    return jsonb_build_object('ok', false, 'reason', v_status ->> 'reason', 'status', v_status);
  end if;

  insert into public.zalo_messages (staff_id, target_type, target_id, kind, content)
  values (v_uid, p_target_type, p_target_id, p_kind, v_content)
  returning id into v_msg;

  v_delay := 60 + floor(random() * 121)::int;
  update public.zalo_quota
     set sent = sent + 1, last_sent_at = v_now, next_allowed_at = v_now + make_interval(secs => v_delay)
   where staff_id = v_row.staff_id and day = v_row.day
  returning * into v_row;

  insert into public.audit_log (actor_id, action, target_type, target_id, meta)
  values (v_uid, 'zalo.send', case p_target_type when 'lead' then 'lead' else 'profile' end, p_target_id::text,
          jsonb_build_object('kind', p_kind));

  return jsonb_build_object(
    'ok', true,
    'message_id', v_msg,
    'zalo_url', 'https://zalo.me/0' || substr(v_phone, 3),
    'status', public.zalo_present(v_row)
  );
end;
$$;

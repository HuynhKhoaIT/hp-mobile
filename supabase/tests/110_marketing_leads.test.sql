-- marketing_leads (RLS 4 vai trò + admin, guard cột, audit) + check_rate_limit + export_marketing_leads + admin_stats.leads_new.
begin;
\ir _helpers.psql
select plan(27);

select tests.create_user('lead_user');
select tests.create_user('lead_bad');
select tests.ban_user('lead_bad');
select tests.create_user('lead_mod', 'moderator');
select tests.create_user('lead_boss', 'admin');

-- Thêm như Server Action web (service role).
set local role service_role;
select lives_ok($$
  insert into public.marketing_leads (id, contact, contact_type, kind, name, locale, utm, consent_at, consent_version, source)
  values ('d0000000-0000-4000-8000-000000000001', '84912345678', 'phone', 'landlord', 'Chủ trọ zxql', 'vi',
          '{"utm_source":"zalo"}', now(), '2026-11', 'cho-chu-tro'),
         ('d0000000-0000-4000-8000-000000000002', 'nhatuyen@example.com', 'email', 'employer', null, 'en',
          '{}', now(), '2026-11', 'landing')
$$, 'service role: thêm lead');
select throws_ok($$ insert into public.marketing_leads (contact, contact_type, kind, consent_at, consent_version)
  values ('84912345678', 'fax', 'user', now(), '2026-11') $$, '23514', null, 'lead: contact_type chỉ email | phone');
select throws_ok($$ insert into public.marketing_leads (contact, contact_type, kind, consent_version)
  values ('84912345678', 'phone', 'user', '2026-11') $$, '23502', null, 'lead: bắt buộc consent_at');
select throws_ok($$ insert into public.marketing_leads (contact, contact_type, kind, consent_at, consent_version, source)
  values ('84912345678', 'phone', 'user', now(), '2026-11', '../admin') $$, '23514', null, 'lead: source chỉ slug');

-- check_rate_limit: 5 lần / giờ / IP, lần 6 → false; IP khác không ảnh hưởng.
select is((select array_agg(public.check_rate_limit('hash-ip-zxql-1', 'lead')) from generate_series(1, 6)),
  array[true, true, true, true, true, false], 'check_rate_limit lead: 5 lần / giờ, lần 6 bị chặn');
select is(public.check_rate_limit('hash-ip-zxql-2', 'lead'), true, 'check_rate_limit: IP khác còn lượt');
select throws_ok($$ select public.check_rate_limit('hash-ip-zxql-3', 'unknown') $$, 'P0001', 'invalid_input',
  'check_rate_limit: action lạ → invalid_input');
reset role;

-- anon
select tests.clear_auth();
select throws_ok($$ select count(*) from public.marketing_leads $$, '42501', null, 'anon: không đọc lead');
select throws_ok($$ insert into public.marketing_leads (contact, contact_type, kind, consent_at, consent_version)
  values ('84900000000', 'phone', 'user', now(), '2026-11') $$, '42501', null, 'anon: không thêm lead trực tiếp');
select throws_ok($$ select public.check_rate_limit('hash-ip-zxql-9', 'lead') $$, '42501', null, 'anon: không gọi check_rate_limit');

-- user thường
select tests.authenticate_as('lead_user');
select is((select count(*)::int from public.marketing_leads), 0, 'user: không thấy lead');
select throws_ok($$ insert into public.marketing_leads (contact, contact_type, kind, consent_at, consent_version)
  values ('84900000000', 'phone', 'user', now(), '2026-11') $$, '42501', null, 'user: không thêm lead');
select lives_ok($$ update public.marketing_leads set status = 'closed' $$, 'user: update lead không lỗi nhưng RLS lọc hết');
select throws_ok($$ select public.check_rate_limit('hash-ip-zxql-9', 'lead') $$, '42501', null, 'user: không gọi check_rate_limit');
select throws_ok($$ select * from public.export_marketing_leads() $$, '42501', null, 'user: không xuất lead');

-- bị cấm
select tests.authenticate_as('lead_bad');
select is((select count(*)::int from public.marketing_leads), 0, 'bị cấm: không thấy lead');

-- moderator: xem + đổi trạng thái, ghi chú; không sửa liên hệ; không xuất
select tests.authenticate_as('lead_mod');
select is((select count(*)::int from public.marketing_leads where id::text like 'd0000000%'), 2, 'moderator: xem lead');
select lives_ok($$ update public.marketing_leads set status = 'contacted', note = 'Đã gọi'
  where id = 'd0000000-0000-4000-8000-000000000001' $$, 'moderator: đánh dấu đã liên hệ');
select is((select handled_by from public.marketing_leads where id = 'd0000000-0000-4000-8000-000000000001'),
  tests.get_uid('lead_mod'), 'lead: ghi người xử lý');
select throws_ok($$ update public.marketing_leads set contact = '84999999999'
  where id = 'd0000000-0000-4000-8000-000000000001' $$, '42501', null, 'moderator: không sửa liên hệ');
select throws_ok($$ select * from public.export_marketing_leads() $$, '42501', null, 'moderator: không xuất lead');
select ok((public.admin_stats() ->> 'leads_new')::int >= 1, 'admin_stats: có leads_new');

-- admin: xuất CSV có audit; audit không chép liên hệ
select tests.authenticate_as('lead_boss');
select is((select count(*)::int from public.export_marketing_leads() where id::text like 'd0000000%'), 2, 'admin: xuất lead');
reset role;
select is((select count(*)::int from public.audit_log where action = 'lead.export'), 1, 'xuất lead → audit lead.export');
select is((select meta ->> 'to' from public.audit_log where action = 'lead.update' and target_id = 'd0000000-0000-4000-8000-000000000001'),
  'contacted', 'đổi trạng thái lead → audit lead.update');
select is((select count(*)::int from public.audit_log where action like 'lead.%' and meta::text like '%84912345678%'), 0,
  'audit lead không chứa liên hệ');
select is((select status from public.marketing_leads where id = 'd0000000-0000-4000-8000-000000000002'), 'new',
  'user / bị cấm không đổi được trạng thái lead');

select * from finish();
rollback;

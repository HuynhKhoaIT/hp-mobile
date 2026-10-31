-- Dữ liệu mẫu cho local / CI (chạy sau migration khi `supabase db reset`). Không có dữ liệu người thật.
-- Đăng nhập thử: SĐT 84900000001–05, OTP 123456 ([auth.sms.test_otp] trong config.toml).

-- Khu liên hợp (sites) nằm ở migration 20261030110000_sites_data.sql vì cần có ở mọi môi trường.

-- ── User test: 5 vai trò ────────────────────────────────────────────────────────
-- Tạo auth.users + auth.identities; trigger trg_auth_users_new_profile tạo profiles.
-- Các cột token để '' (GoTrue lỗi khi gặp NULL ở đây).
with seed(id, phone, full_name) as (
  values
    ('00000000-0000-4000-8000-000000000001'::uuid, '84900000001', 'Nguyễn Văn An'),
    ('00000000-0000-4000-8000-000000000002'::uuid, '84900000002', ''),               -- tài khoản mới: chưa onboarding
    ('00000000-0000-4000-8000-000000000003'::uuid, '84900000003', 'Lê Văn Cấm'),
    ('00000000-0000-4000-8000-000000000004'::uuid, '84900000004', 'Phạm Thị Duyệt'),
    ('00000000-0000-4000-8000-000000000005'::uuid, '84900000005', 'Hoàng Văn Quản')
)
insert into auth.users (
  id, instance_id, aud, role, phone, phone_confirmed_at, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, email_change_token_current, reauthentication_token
)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', phone, now(), '',
       '{"provider":"phone","providers":["phone"]}'::jsonb,
       jsonb_build_object('full_name', full_name, 'locale', 'vi'), now() - interval '30 days', now(),
       '', '', '', '', '', '', '', ''
from seed
on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'phone', u.phone, 'phone_verified', true),
       'phone', now(), now(), now()
from auth.users u
where u.id::text like '00000000-0000-4000-8000-00000000000_'
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'phone');

-- Vai trò và trạng thái (chạy với quyền postgres nên guard trigger cho qua)
update public.profiles set site = 'hoa_phat_dung_quat', consent_at = now(), consent_version = 'seed'
where id::text like '00000000-0000-4000-8000-00000000000_'
  and id <> '00000000-0000-4000-8000-000000000002';   -- 0900000002 thử luồng onboarding
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-000000000003';   -- banned
update public.profiles set role = 'moderator' where id = '00000000-0000-4000-8000-000000000004';
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000005';

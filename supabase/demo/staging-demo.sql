-- DỮ LIỆU DEMO CHO STAGING (dungquat-staging) — SINH TỰ ĐỘNG từ supabase/seed.sql + seed/*.sql, không sửa tay.
-- Không chạy trên production. Không có dữ liệu người thật (tên, tin, sân đều là mẫu).
-- Khác seed local: tài khoản demo có UUID …0000000d000N và SĐT 8490000090N (không trùng tài khoản thật / số OTP test),
-- KHÔNG có quyền moderator / admin, không có email staff, không có hội thoại mẫu.
-- Chạy: Supabase Dashboard → dungquat-staging → SQL Editor → dán toàn bộ file → Run (một lần; chạy lại sẽ báo lỗi và không đổi gì).
-- Gỡ: chạy khối "GỠ DỮ LIỆU DEMO" ở cuối file (đang để trong chú thích).

begin;

do $$
begin
  if exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000d0001') then
    raise exception 'Dữ liệu demo đã có trên project này — không chạy lại.';
  end if;
end $$;

-- ═══ seed.sql ═══
-- Dữ liệu mẫu cho local / CI (chạy sau migration khi `supabase db reset`). Không có dữ liệu người thật.

-- Khu liên hợp (sites) nằm ở migration 20261030110000_sites_data.sql vì cần có ở mọi môi trường.

-- ── User test: 5 vai trò ────────────────────────────────────────────────────────
-- Tạo auth.users + auth.identities; trigger trg_auth_users_new_profile tạo profiles.
-- Các cột token để '' (GoTrue lỗi khi gặp NULL ở đây).
with seed(id, phone, full_name) as (
  values
    ('00000000-0000-4000-8000-0000000d0001'::uuid, '84900000901', 'Nguyễn Văn An'),
    ('00000000-0000-4000-8000-0000000d0002'::uuid, '84900000902', ''),               -- tài khoản mới: chưa onboarding
    ('00000000-0000-4000-8000-0000000d0003'::uuid, '84900000903', 'Lê Văn Cấm'),
    ('00000000-0000-4000-8000-0000000d0004'::uuid, '84900000904', 'Phạm Thị Duyệt'),
    ('00000000-0000-4000-8000-0000000d0005'::uuid, '84900000905', 'Hoàng Văn Quản')
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
where u.id::text like '00000000-0000-4000-8000-0000000d000_'
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'phone');

-- Vai trò và trạng thái (chạy với quyền postgres nên guard trigger cho qua)
update public.profiles set site = 'hoa_phat_dung_quat', consent_at = now(), consent_version = 'seed'
where id::text like '00000000-0000-4000-8000-0000000d000_'
  and id <> '00000000-0000-4000-8000-0000000d0002';   -- 0900000002 thử luồng onboarding
-- Hồ sơ tạo bởi trigger lúc seed (created_at = now) → đặt bằng ngày tạo auth.users để không dính luật kiểm duyệt
-- "tài khoản < 7 ngày" (trg_listings_moderate). Riêng 0900000002 giữ là tài khoản mới.
update public.profiles p set created_at = u.created_at from auth.users u
where p.id = u.id and p.id::text like '00000000-0000-4000-8000-0000000d000_' and p.id <> '00000000-0000-4000-8000-0000000d0002';
update public.profiles set is_banned = true where id = '00000000-0000-4000-8000-0000000d0003';   -- banned

-- Tin đăng mẫu: supabase/seed/listings.sql (chạy sau file này — [db.seed] sql_paths trong config.toml).


-- ═══ seed/banners.sql ═══
-- Banner mẫu cho trang chủ (app + web), 3 ngôn ngữ, không ảnh (thẻ chữ theo tone). Admin thay bằng banner thật ở /admin.
-- Chạy sau seed.sql, listings.sql ([db.seed] sql_paths). Không dữ liệu người thật.
insert into public.banners (placement, locale, title, subtitle, cta_label, link_url, tone, sort)
select p.placement, b.locale, b.title, b.subtitle, b.cta_label, b.link_url, b.tone, b.sort
from (values ('app_home'), ('web_home')) as p (placement)
cross join (values
  ('vi', 'Đăng tin miễn phí', 'Pass đồ, cho thuê trọ, tuyển người — chỉ 1 phút.', 'Đăng tin ngay', '/dang-tin', 'accent', 10),
  ('en', 'Post for free', 'Sell items, rent rooms, hire people — in a minute.', 'Post now', '/dang-tin', 'accent', 10),
  ('zh', '免费发布信息', '转让物品、出租房间、招聘人员——只需 1 分钟。', '立即发布', '/dang-tin', 'accent', 10),
  ('vi', 'Phòng trọ gần nhà máy', 'Hàng trăm phòng quanh khu Dung Quất, xem vị trí gần đúng.', 'Xem phòng', '/tro', 'room', 20),
  ('en', 'Rooms near the plant', 'Hundreds of rooms around Dung Quat, with approximate locations.', 'Browse rooms', '/tro', 'room', 20),
  ('zh', '工厂附近的房间', 'Dung Quất 周边数百间出租房，显示大致位置。', '查看房间', '/tro', 'room', 20),
  ('vi', 'Giao dịch an toàn', 'Không chuyển tiền đặt cọc trước khi xem hàng / xem phòng.', null, null, 'primary', 30),
  ('en', 'Trade safely', 'Never pay a deposit before seeing the item or room.', null, null, 'primary', 30),
  ('zh', '安全交易', '看货、看房之前不要先付定金。', null, null, 'primary', 30)
) as b (locale, title, subtitle, cta_label, link_url, tone, sort);


-- ═══ seed/listings.sql ═══
-- Tin đăng mẫu: 50 tin / category (500 tin). Chạy sau seed.sql ([db.seed] sql_paths).
-- Chủ tin: user seed 01 / 04 / 05; vài tin của 03 (bị cấm → phải ẩn khỏi public_listings).
-- Không ảnh: client hiện ảnh giữ chỗ theo tính năng. lang đa dạng (vi nhiều nhất, có en / zh).
-- Trạng thái: phần lớn active; mỗi category vài tin sold / draft / expired để thử lọc.
-- attributes khớp Zod ListingAttributes (packages/shared/src/schemas/listing).
-- setseed → dữ liệu giống nhau mỗi lần db reset. Không dữ liệu người thật.
select setseed(0.42);

do $$
declare
  v_owners uuid[] := array[
    '00000000-0000-4000-8000-0000000d0001', '00000000-0000-4000-8000-0000000d0004',
    '00000000-0000-4000-8000-0000000d0005', '00000000-0000-4000-8000-0000000d0001',
    '00000000-0000-4000-8000-0000000d0004'
  ]::uuid[];
  v_banned uuid := '00000000-0000-4000-8000-0000000d0003';
  v_sites text[] := array['hoa_phat_dung_quat', 'hoa_phat_dung_quat', 'cang_dung_quat', 'vsip_quang_ngai', 'hyundai_eco_vina'];
  v_places text[] := array['Thôn Tây An, Bình Đông', 'Thôn Vạn Tường, Bình Hải', 'Thôn Long Yên, Bình Thuận', 'Thôn Phước Thiện, Bình Trị',
                           'Thôn An Lộc, Bình Chánh', 'Thị trấn Châu Ổ, Bình Sơn', 'Thôn Đông Yên, Bình Dương', 'Thôn Hải Ninh, Bình Thạnh'];
  v_cat public.listing_category;
  v_titles text[];
  v_title text;
  v_lang text;
  v_site text;
  v_site_loc extensions.geography;
  v_owner uuid;
  v_status public.listing_status;
  v_price numeric;
  v_price_type text;
  v_attrs jsonb;
  v_desc text;
  v_loc extensions.geography;
  v_created timestamptz;
  i int;
begin
  foreach v_cat in array enum_range(null::public.listing_category) loop
    v_titles := case v_cat
      when 'pass_electronics' then array[
        'Pass iPhone 13 128GB còn pin 89%', 'Bán laptop Dell Latitude i5 cho anh em ca kíp', 'Thanh lý tai nghe Bluetooth Sony',
        'Pass Samsung A54 mới dùng 3 tháng', 'Bán quạt điều hoà mini cho phòng trọ', 'Pass loa JBL Charge 5 chống nước',
        'Bán máy tính bảng Xiaomi Pad 6', 'Thanh lý màn hình LG 24 inch', 'Used iPhone 12, battery 85%', '出售二手笔记本电脑 联想 ThinkPad']
      when 'pass_vehicle' then array[
        'Bán Honda Wave Alpha 2019 chính chủ', 'Pass xe Exciter 150 đời 2020', 'Bán xe đạp thể thao đi ca', 'Thanh lý Vision 2018 máy êm',
        'Bán Sirius 2017 giấy tờ đầy đủ', 'Pass xe máy điện VinFast Evo200', 'Bán Toyota Vios 2016 gia đình đi giữ gìn',
        'Pass xe đạp điện còn mới', 'Motorbike Honda Blade for sale', '出售本田摩托车 2019年']
      when 'pass_ppe' then array[
        'Pass giày bảo hộ Jogger size 42', 'Bán mũ bảo hộ 3M còn mới', 'Thanh lý quần áo bảo hộ size L', 'Pass găng tay chống cắt 5 đôi',
        'Bán giày bảo hộ Safety Jogger size 40', 'Pass kính bảo hộ chống bụi', 'Bán áo phản quang công trường', 'Pass ủng cao su chống hoá chất size 41',
        'Safety boots size 43, used twice', '出售安全鞋 42码']
      when 'pass_home' then array[
        'Thanh lý tủ lạnh Aqua 90 lít', 'Pass nồi cơm điện Sharp 1.8L', 'Bán bàn gấp + ghế nhựa phòng trọ', 'Pass nệm 1m2 còn sạch',
        'Bán máy giặt Toshiba 7kg', 'Thanh lý bếp gas đôi', 'Pass kệ sắt 4 tầng', 'Bán tủ quần áo vải khung inox', 'Rice cooker and kettle, moving out', '出售小冰箱 宿舍用']
      when 'room_rent' then array[
        'Cho thuê phòng trọ gần cổng Hòa Phát, có gác', 'Phòng mới xây 20m² có chỗ để xe', 'Cho thuê phòng khép kín, điện nước giá dân',
        'Phòng trọ yên tĩnh cho công nhân ca đêm', 'Cho thuê phòng có máy lạnh gần VSIP', 'Phòng 25m² có bếp riêng, không chung chủ',
        'Cho thuê nhà nguyên căn 2 phòng ngủ', 'Phòng giá rẻ gần cảng Dung Quất', 'Room for rent near Dung Quat port, AC', '出租单间 近和发钢厂']
      when 'room_share' then array[
        'Tìm 1 bạn nam ở ghép, chia tiền phòng', 'Cần 2 bạn nữ ở ghép gần Hòa Phát', 'Ở ghép nhà nguyên căn, có wifi', 'Tìm bạn ở ghép làm ca ngày',
        'Ghép phòng 2 người, có máy giặt chung', 'Tìm người ở ghép, phòng rộng có gác', 'Ở ghép gần VSIP, đi làm 5 phút', 'Tìm bạn cùng phòng, không hút thuốc',
        'Looking for a roommate near Hyundai Eco Vina', '找室友 合租 近港口']
      when 'job_main' then array[
        'Tuyển công nhân vận hành ca xoay', 'Tuyển thợ hàn có chứng chỉ', 'Tuyển lái xe nâng, lương tháng', 'Tuyển nhân viên kho vật tư',
        'Tuyển thợ điện công nghiệp', 'Tuyển phụ bếp nhà ăn công ty', 'Tuyển bảo vệ ca đêm', 'Tuyển nhân viên QC sản phẩm thép',
        'Hiring forklift drivers, monthly salary', '招聘焊工 有证书优先']
      when 'job_parttime' then array[
        'Tuyển phụ quán cà phê ngoài ca', 'Làm thêm giao hàng buổi tối', 'Tuyển phụ bán quán ăn trưa', 'Gia sư tiếng Anh cho con em công nhân',
        'Làm thêm bốc xếp cuối tuần', 'Tuyển phụ rửa xe ngoài giờ', 'Tuyển phục vụ quán nhậu ca tối', 'Làm thêm dọn dẹp nhà theo giờ',
        'Part-time English tutor, evenings', '兼职 周末餐厅服务员']
      when 'lost' then array[
        'Mất ví da màu nâu gần cổng số 2', 'Rơi thẻ ra vào công ty ở nhà ăn', 'Mất chìa khoá xe Honda có móc gấu', 'Đánh rơi điện thoại Oppo ở bãi xe',
        'Mất balo đen có giấy tờ tuỳ thân', 'Rơi tai nghe AirPods ở phòng thay đồ', 'Mất giấy phép lái xe trên đường về Châu Ổ', 'Mất áo khoác đồng phục ca B',
        'Lost brown wallet near gate 2', '丢失钱包 黑色 在食堂附近']
      when 'found' then array[
        'Nhặt được ví ở bãi xe số 3', 'Nhặt được chìa khoá xe máy ở nhà ăn', 'Nhặt được thẻ ATM ở cây xăng Bình Đông', 'Nhặt được điện thoại Samsung trên xe đưa đón',
        'Nhặt được balo xanh ở trạm chờ xe', 'Nhặt được mũ bảo hiểm ở cổng phụ', 'Nhặt được kính cận ở phòng họp', 'Nhặt được túi đồ nghề ở xưởng',
        'Found a set of keys at the canteen', '捡到手机 在班车上']
    end;

    for i in 1..50 loop
      v_title := v_titles[1 + ((i - 1) % 10)];
      v_lang := case when (i - 1) % 10 = 8 then 'en' when (i - 1) % 10 = 9 then 'zh' else 'vi' end;
      if i > 10 then
        v_title := v_title || case v_lang when 'en' then ' #' || i when 'zh' then ' ' || i || '号' else ' (tin ' || i || ')' end;
      end if;
      v_site := v_sites[1 + (i % array_length(v_sites, 1))];
      select location into v_site_loc from public.sites where code = v_site;
      v_owner := case when i in (7, 33) then v_banned else v_owners[1 + (i % array_length(v_owners, 1))] end;
      v_status := case when i in (45, 46) then 'sold' when i = 47 then 'draft' when i = 48 then 'expired' else 'active' end;
      -- trong bán kính ~3 km quanh khu
      v_loc := extensions.st_setsrid(extensions.st_makepoint(
                 extensions.st_x(v_site_loc::extensions.geometry) + (random() - 0.5) * 0.05,
                 extensions.st_y(v_site_loc::extensions.geometry) + (random() - 0.5) * 0.05), 4326)::extensions.geography;
      -- lùi > 24 giờ: không tính vào giới hạn 10 tin / ngày của tài khoản seed khi thử đăng tin
      v_created := now() - interval '25 hours' - (i * interval '5 hours') - (array_position(enum_range(null::public.listing_category), v_cat) * interval '17 minutes');
      v_price_type := 'fixed';
      v_desc := v_title || E'.\n' || case v_lang
        when 'en' then 'Contact me via in-app chat. Viewing after shift is fine.'
        when 'zh' then '请通过应用内聊天联系我，下班后可以看货。'
        else 'Liên hệ qua chat trong app. Xem hàng / xem phòng sau giờ tan ca.' end;

      case
        when v_cat = 'pass_electronics' then
          v_price := (500 + floor(random() * 150) * 100) * 1000;
          v_attrs := jsonb_build_object('brand', (array['Apple', 'Samsung', 'Dell', 'Sony', 'Xiaomi', 'LG'])[1 + floor(random() * 6)::int],
                                        'condition', (array['new', 'like_new', 'used'])[1 + floor(random() * 3)::int],
                                        'warranty_months', (array[0, 0, 3, 6])[1 + floor(random() * 4)::int]);
        when v_cat = 'pass_vehicle' then
          v_price := (3000 + floor(random() * 400) * 100) * 1000;
          v_attrs := jsonb_build_object('vehicle_type', (array['motorbike', 'motorbike', 'motorbike', 'bicycle', 'car'])[1 + floor(random() * 5)::int],
                                        'brand', (array['Honda', 'Yamaha', 'VinFast', 'Toyota'])[1 + floor(random() * 4)::int],
                                        'year', 2014 + floor(random() * 10)::int,
                                        'odometer_km', (5 + floor(random() * 60)) * 1000,
                                        'plate_prefix', (array['76', '76', '43', '92'])[1 + floor(random() * 4)::int]);
        when v_cat = 'pass_ppe' then
          v_price := (50 + floor(random() * 40) * 10) * 1000;
          v_attrs := jsonb_build_object('item_type', (array['boots', 'helmet', 'uniform', 'gloves'])[1 + floor(random() * 4)::int],
                                        'size', (array['39', '40', '41', '42', '43', 'M', 'L', 'XL'])[1 + floor(random() * 8)::int],
                                        'condition', (array['new', 'like_new', 'used'])[1 + floor(random() * 3)::int]);
        when v_cat = 'pass_home' then
          v_price := (100 + floor(random() * 50) * 50) * 1000;
          v_attrs := jsonb_build_object('condition', (array['new', 'like_new', 'used'])[1 + floor(random() * 3)::int]);
        when v_cat in ('room_rent', 'room_share') then
          v_price := (800 + floor(random() * 25) * 100) * 1000;
          v_attrs := jsonb_build_object('area_m2', 12 + floor(random() * 30)::int,
                                        'electricity_price', (array[3500, 3800, 4000])[1 + floor(random() * 3)::int],
                                        'water_price', (array[15000, 20000, 100000])[1 + floor(random() * 3)::int],
                                        'has_loft', random() < 0.5,
                                        'has_parking', random() < 0.8,
                                        'curfew', (array['', '22:00', '23:00'])[1 + floor(random() * 3)::int],
                                        'max_people', 1 + floor(random() * 4)::int);
        when v_cat in ('job_main', 'job_parttime') then
          v_price := null;
          v_price_type := 'negotiable';
          v_attrs := case when v_cat = 'job_main'
            then jsonb_build_object('shift', (array['day', 'night', 'rotating'])[1 + floor(random() * 3)::int],
                                    'salary_min', (7 + floor(random() * 5)) * 1000000, 'salary_max', (12 + floor(random() * 8)) * 1000000,
                                    'pay_type', 'month', 'requirements', 'Sức khoẻ tốt, chịu làm ca', 'contact_name', 'Phòng nhân sự')
            else jsonb_build_object('shift', (array['day', 'night'])[1 + floor(random() * 2)::int],
                                    'salary_min', (25 + floor(random() * 15)) * 1000, 'salary_max', (40 + floor(random() * 20)) * 1000,
                                    'pay_type', 'hour', 'requirements', 'Rảnh ngoài giờ ca', 'contact_name', 'Chủ quán') end;
        else -- lost / found
          v_price := null;
          v_price_type := 'free';
          v_attrs := jsonb_build_object('item_type', (array['wallet', 'phone', 'keys', 'card', 'bag', 'other'])[1 + floor(random() * 6)::int],
                                        'lost_at', to_char(v_created - interval '1 day', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                                        'place', v_places[1 + floor(random() * array_length(v_places, 1))::int],
                                        'identifying_marks', 'Liên hệ để mô tả thêm',
                                        'returned', false);
      end case;

      insert into public.listings (owner_id, category, status, title, description, price, price_type, attributes,
                                   site, location, address_text, lang, view_count, created_at, updated_at, expires_at)
      values (v_owner, v_cat, v_status, v_title, v_desc, v_price, v_price_type, v_attrs,
              v_site, v_loc, v_places[1 + floor(random() * array_length(v_places, 1))::int], v_lang,
              floor(random() * 200)::int, v_created, v_created,
              case when v_status = 'expired' then now() - interval '1 day'
                   else v_created + public.listing_default_ttl(v_cat) + interval '30 days' end);
    end loop;
  end loop;
end;
$$;

-- Webhook revalidate cho web local (trg_listings_revalidate), đặt SAU khi seed tin để không bắn 500 request.
-- Khớp REVALIDATE_SECRET trong apps/web/.env.local. Staging / prod: insert tay (docs/RUNBOOK.md), không commit giá trị thật.
insert into public.app_settings (key, value) values
  ('web_revalidate_url', 'http://host.docker.internal:3000/api/revalidate'),
  ('web_revalidate_secret', 'local-dev-revalidate-secret'),
  -- Webhook notifications → Edge Function send-push (migration 20261102100000). Khớp WEBHOOK_SECRET trong
  -- supabase/functions/.env.local (xem supabase/functions/.env.example).
  ('functions_url', 'http://host.docker.internal:54321/functions/v1'),
  ('webhook_secret', 'local-dev-webhook-secret'),
  -- Cron → Edge Function purge-files (migration 20261104100000). Khớp CRON_SECRET trong supabase/.env.local.
  ('cron_secret', 'local-dev-cron-secret')
on conflict (key) do update set value = excluded.value, updated_at = now();


-- ═══ seed/groups.sql ═══
-- Nhóm mẫu (ghép xe + ghép trận). Không dữ liệu người thật. Chạy với quyền postgres: guard bỏ qua luật client,
-- trigger vẫn tạo chat nhóm, đếm seats_taken, đổi open / full.
-- Chủ nhóm: An (…01), Duyệt (…04), Quản (…05). Thành viên accepted / requested trải đều để thử hàng avatar + duyệt.
do $$
declare
  v_hosts uuid[] := array['00000000-0000-4000-8000-0000000d0001', '00000000-0000-4000-8000-0000000d0004',
                          '00000000-0000-4000-8000-0000000d0005']::uuid[];
  v_gate extensions.geography := extensions.st_setsrid(extensions.st_makepoint(108.822, 15.385), 4326)::extensions.geography;
  v_dest record;
  v_id uuid;
  v_i int := 0;
  v_host uuid;
  v_sub text;
  v_seats int;
begin
  for v_dest in
    select * from (values
      ('Đà Nẵng — Bến xe trung tâm', 108.172, 16.059, 150000),
      ('TP Quảng Ngãi — Ngã 5', 108.792, 15.120, 50000),
      ('Huế — Ga Huế', 107.578, 16.456, 250000),
      ('Hội An — Bến xe Hội An', 108.335, 15.880, 120000),
      ('Tam Kỳ — Quảng trường 24/3', 108.474, 15.573, 80000),
      ('Quy Nhơn — Bến xe Quy Nhơn', 109.219, 13.782, 200000),
      ('Đà Nẵng — Sân bay', 108.199, 16.044, 170000),
      ('TP Quảng Ngãi — Bến xe', 108.809, 15.108, 50000),
      ('Đà Nẵng — Hòa Khánh', 108.150, 16.072, 150000),
      ('Núi Thành — Chợ Núi Thành', 108.660, 15.425, 30000)
    ) as d(name, lng, lat, fee)
  loop
    v_i := v_i + 1;
    v_host := v_hosts[1 + (v_i % 3)];
    v_sub := (array['car_owner', 'car_owner', 'bus_pool', 'motorbike'])[1 + (v_i % 4)];
    v_seats := case v_sub when 'motorbike' then 1 when 'bus_pool' then 12 else 3 end;
    insert into public.groups (host_id, kind, sub_kind, title, description, starts_at, seats_total, fee_per_person,
                               origin, origin_text, destination, destination_text, attributes, requires_approval)
    values (v_host, 'ride', v_sub,
            'Dung Quất → ' || split_part(v_dest.name, ' — ', 1),
            case when v_i % 2 = 0 then 'Đi sau ca chiều, có chỗ để hành lý nhỏ. Đón ở cổng chính.' end,
            date_trunc('hour', now()) + make_interval(hours => 3 + v_i * 7),
            v_seats, v_dest.fee,
            v_gate, 'Cổng chính Khu liên hợp Hòa Phát Dung Quất',
            extensions.st_setsrid(extensions.st_makepoint(v_dest.lng, v_dest.lat), 4326)::extensions.geography, v_dest.name,
            jsonb_build_object('luggage_ok', v_i % 2 = 0, 'stops_ok', v_i % 3 = 0),
            v_i % 3 <> 0)
    returning id into v_id;

    -- thành viên: người không phải chủ nhóm (trừ …03 bị cấm, …02 chưa onboarding)
    insert into public.group_members (group_id, user_id, status, note)
    select v_id, u, case when v_i % 2 = 0 then 'accepted' else 'requested' end::public.member_status,
           case when v_i % 2 = 1 then 'Cho mình đi cùng với, mình ở gần cổng chính.' end
    from unnest(v_hosts) u
    where u <> v_host
    limit case when v_i % 4 = 0 then 2 when v_i % 4 = 3 then 0 else 1 end;
  end loop;

  -- Ghép trận (tuần 8 có màn riêng; dữ liệu để web / app thử danh sách)
  insert into public.groups (host_id, kind, sub_kind, title, starts_at, seats_total, fee_per_person, origin,
                             origin_text, attributes, requires_approval)
  values
    (v_hosts[2], 'sport', 'football', 'Đá bóng 7 người sau ca chiều', date_trunc('hour', now()) + interval '30 hours', 2, 40000,
     extensions.st_setsrid(extensions.st_makepoint(108.80, 15.36), 4326)::extensions.geography, 'Sân bóng Bình Thạnh',
     '{"skill_level": "intermediate", "players_have": 5}', false),   -- đội có sẵn 5, cần thêm 2
    (v_hosts[3], 'sport', 'badminton', 'Cầu lông đôi nam nữ', date_trunc('hour', now()) + interval '50 hours', 2, 30000,
     extensions.st_setsrid(extensions.st_makepoint(108.79, 15.41), 4326)::extensions.geography, 'Nhà thi đấu Bình Sơn',
     '{"skill_level": "beginner"}', true),
    (v_hosts[1], 'sport', 'pickleball', 'Pickleball giao lưu cuối tuần', date_trunc('hour', now()) + interval '75 hours', 3, 50000,
     extensions.st_setsrid(extensions.st_makepoint(108.81, 15.39), 4326)::extensions.geography, 'Sân pickleball Dốc Sỏi',
     '{"skill_level": "any"}', false);
end;
$$;


-- ═══ seed/groups_past.sql ═══
-- Nhóm đã diễn ra (thử "Nhóm của tôi → Đã qua" + đánh giá chủ nhóm). Quyền postgres: guard bỏ qua luật giờ.
-- An (…01) là thành viên accepted của một kèo đã xong của Duyệt (…04), chưa chấm; Quản (…05) đã chấm 5 sao.
do $$
declare
  v_id uuid;
begin
  insert into public.groups (host_id, kind, sub_kind, title, starts_at, seats_total, fee_per_person, origin,
                             origin_text, attributes, requires_approval)
  values ('00000000-0000-4000-8000-0000000d0004', 'sport', 'football', 'Đá giao hữu tối thứ Bảy',
          date_trunc('hour', now()) - interval '2 days', 8, 30000,
          extensions.st_setsrid(extensions.st_makepoint(108.845, 15.370), 4326)::extensions.geography,
          'Sân cỏ nhân tạo Vạn Tường', '{"skill_level": "any"}', false)
  returning id into v_id;

  insert into public.group_members (group_id, user_id, status)
  values (v_id, '00000000-0000-4000-8000-0000000d0001', 'accepted'),
         (v_id, '00000000-0000-4000-8000-0000000d0005', 'accepted');

  update public.groups set status = 'completed', reminded_at = starts_at - interval '1 hour' where id = v_id;

  insert into public.ratings (rater_id, ratee_id, context_type, context_id, score, comment)
  values ('00000000-0000-4000-8000-0000000d0005', '00000000-0000-4000-8000-0000000d0004', 'group', v_id, 5,
          'Chủ kèo đúng giờ, sân tốt.');
end;
$$;


-- ═══ seed/venues.sql ═══
-- Sân thể thao mẫu quanh Dung Quất (dữ liệu giả, không phải cơ sở thật) + gắn vào kèo Ghép trận của seed/groups.sql.
-- Chạy sau groups.sql (thứ tự chữ cái). Quyền postgres: guard bỏ qua luật client.
insert into public.venues (name, sports, site, address_text, location, price_ref, phone, status, created_by, reviewed_at)
values
  ('Sân bóng Bình Thạnh', array['football'], 'hoa_phat_dung_quat', 'Thôn Bình Thạnh, gần chợ',
   extensions.st_setsrid(extensions.st_makepoint(108.800, 15.360), 4326)::extensions.geography, 300000, '0900 000 101',
   'approved', '00000000-0000-4000-8000-0000000d0001', now()),
  ('Nhà thi đấu Bình Sơn', array['badminton', 'pickleball'], 'hoa_phat_dung_quat', 'Trung tâm huyện Bình Sơn',
   extensions.st_setsrid(extensions.st_makepoint(108.790, 15.410), 4326)::extensions.geography, 80000, '0900 000 102',
   'approved', '00000000-0000-4000-8000-0000000d0001', now()),
  ('Sân pickleball Dốc Sỏi', array['pickleball'], 'hoa_phat_dung_quat', 'Ngã ba Dốc Sỏi',
   extensions.st_setsrid(extensions.st_makepoint(108.810, 15.390), 4326)::extensions.geography, 120000, null,
   'approved', '00000000-0000-4000-8000-0000000d0004', now()),
  ('Sân cỏ nhân tạo Vạn Tường', array['football'], 'hoa_phat_dung_quat', 'Khu đô thị Vạn Tường',
   extensions.st_setsrid(extensions.st_makepoint(108.845, 15.370), 4326)::extensions.geography, 350000, '0900 000 104',
   'approved', '00000000-0000-4000-8000-0000000d0004', now()),
  ('CLB cầu lông Bình Trị', array['badminton'], 'hoa_phat_dung_quat', 'Xã Bình Trị',
   extensions.st_setsrid(extensions.st_makepoint(108.835, 15.395), 4326)::extensions.geography, 60000, null,
   'approved', '00000000-0000-4000-8000-0000000d0005', now()),
  ('Sân bóng mini Bình Đông', array['football'], 'hoa_phat_dung_quat', 'Xã Bình Đông',
   extensions.st_setsrid(extensions.st_makepoint(108.860, 15.350), 4326)::extensions.geography, 250000, null,
   'approved', '00000000-0000-4000-8000-0000000d0005', now()),
  ('Sân tennis + pickleball Bình Hải', array['pickleball', 'badminton'], 'hoa_phat_dung_quat', 'Xã Bình Hải',
   extensions.st_setsrid(extensions.st_makepoint(108.880, 15.330), 4326)::extensions.geography, 100000, null,
   'approved', '00000000-0000-4000-8000-0000000d0001', now()),
  -- chờ duyệt (moderator thấy, người khác không)
  ('Sân bóng mới gần cổng 3', array['football'], 'hoa_phat_dung_quat', 'Gần cổng 3 nhà máy',
   extensions.st_setsrid(extensions.st_makepoint(108.828, 15.382), 4326)::extensions.geography, 280000, null,
   'pending', '00000000-0000-4000-8000-0000000d0004', null);

update public.groups g
set venue_id = v.id
from public.venues v
where g.kind = 'sport' and g.venue_id is null and v.status = 'approved' and v.name = g.origin_text;

commit;

-- ── GỠ DỮ LIỆU DEMO (bỏ chú thích rồi chạy riêng) ─────────────────────────────────────────────
-- begin;
-- delete from public.banners where created_at >= (select min(created_at) from auth.users where id::text like '00000000-0000-4000-8000-0000000d000_')
--   and title in ('Đăng tin miễn phí', 'Post for free', '免费发布信息', 'Phòng trọ gần nhà máy', 'Rooms near the plant', '工厂附近的房间', 'Giao dịch an toàn', 'Trade safely', '安全交易');
-- delete from public.groups where host_id::text like '00000000-0000-4000-8000-0000000d000_';
-- delete from public.venues where created_by::text like '00000000-0000-4000-8000-0000000d000_';
-- delete from public.listings where owner_id::text like '00000000-0000-4000-8000-0000000d000_';
-- delete from auth.users where id::text like '00000000-0000-4000-8000-0000000d000_';
-- commit;

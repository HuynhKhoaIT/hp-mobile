-- Dữ liệu mẫu mini-app Gọi thợ (migration 20261128090000_service_requests): 10 tài khoản mẫu (4 khách + 6 thợ), 30 yêu cầu ở mọi
-- trạng thái, 42 báo giá, 6 đánh giá. Không có dữ liệu người thật (tên, SĐT, địa chỉ đều là giả). Chạy sau seed.sql / listings.sql
-- (`[db.seed] sql_paths` trong config.toml) khi `supabase db reset`.
--
-- Staging (dungquat-staging, KHÔNG chạy trên production): Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- File tự chứa (tự tạo tài khoản mẫu, id cố định, `on conflict do nothing`) nên chạy lại không nhân đôi dữ liệu.
-- Tài khoản mẫu không có OTP test (SĐT 8490000020x / 8490000021x) → chỉ là dữ liệu để xem; muốn đăng nhập thử dùng số test riêng.
-- Mini-app Gọi thợ vẫn TẮT mặc định: admin bật ở /admin/catalog → tab Mini-app mới thấy trên Hub.
--
-- Phân bố 30 yêu cầu (n = 1..30): mở 1–12 (0–4 báo giá), đã giao thợ 13–18, hoàn thành 19–26 (19–22 có đánh giá; 23–26 chưa
-- có ai đánh giá → thử /admin/cskh), đã huỷ 27–28, hết hạn 29–30.
-- Id: yêu cầu 00000000-0000-4000-8000-00000e0000NN · báo giá …-00000f0000NN · tài khoản …-0000000a00NN (khách 0001–0004, thợ 0011–0016).
-- Gỡ (staging): delete from auth.users where id::text like '00000000-0000-4000-8000-0000000a00__'; (cascade yêu cầu / báo giá / đánh giá).

begin;

-- ── 10 tài khoản mẫu ───────────────────────────────────────────────────────────────────────────────────────────
with seed(id, phone, full_name) as (
  values
    ('00000000-0000-4000-8000-0000000a0001'::uuid, '84900000201', 'Trần Minh Khang'),
    ('00000000-0000-4000-8000-0000000a0002'::uuid, '84900000202', 'Lê Thị Hoa'),
    ('00000000-0000-4000-8000-0000000a0003'::uuid, '84900000203', 'Phạm Quốc Bảo'),
    ('00000000-0000-4000-8000-0000000a0004'::uuid, '84900000204', 'Nguyễn Thị Lan'),
    ('00000000-0000-4000-8000-0000000a0011'::uuid, '84900000211', 'Đặng Văn Hùng'),
    ('00000000-0000-4000-8000-0000000a0012'::uuid, '84900000212', 'Võ Thanh Tùng'),
    ('00000000-0000-4000-8000-0000000a0013'::uuid, '84900000213', 'Bùi Văn Sơn'),
    ('00000000-0000-4000-8000-0000000a0014'::uuid, '84900000214', 'Huỳnh Thị Mai'),
    ('00000000-0000-4000-8000-0000000a0015'::uuid, '84900000215', 'Lý Văn Đạt'),
    ('00000000-0000-4000-8000-0000000a0016'::uuid, '84900000216', 'Trương Công Danh')
)
insert into auth.users (
  id, instance_id, aud, role, phone, phone_confirmed_at, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  phone_change, phone_change_token, email_change_token_current, reauthentication_token
)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', phone, now(), '',
       '{"provider":"phone","providers":["phone"]}'::jsonb,
       jsonb_build_object('full_name', full_name, 'locale', 'vi'), now() - interval '60 days', now(),
       '', '', '', '', '', '', '', ''
from seed
on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'phone', u.phone, 'phone_verified', true),
       'phone', now(), now(), now()
from auth.users u
where u.id::text like '00000000-0000-4000-8000-0000000a00__'
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'phone');

-- Hồ sơ do trigger tạo lúc insert auth.users; chạy với quyền postgres nên guard trigger cho qua.
update public.profiles
   set site = 'hoa_phat_dung_quat', consent_at = now(), consent_version = 'seed', created_at = now() - interval '60 days'
 where id::text like '00000000-0000-4000-8000-0000000a00__';
-- Huy hiệu "thợ" cho vài thợ (hiện trên thẻ báo giá).
update public.profiles set badges = array['phone', 'worker']
 where id in ('00000000-0000-4000-8000-0000000a0011', '00000000-0000-4000-8000-0000000a0013', '00000000-0000-4000-8000-0000000a0014')
   and not ('worker' = any (badges));

-- ── 30 yêu cầu (tạo ở trạng thái mở, đổi trạng thái ở bước sau) ────────────────────────────────────────────────
-- c = khách (1–4), h = số giờ trước lúc đăng.
insert into public.service_requests (id, customer_id, trade, title, description, site, location, address_text, budget_min, budget_max, urgency, created_at, expires_at)
select ('00000000-0000-4000-8000-00000e' || lpad(m.n::text, 6, '0'))::uuid,
       ('00000000-0000-4000-8000-0000000a000' || m.c)::uuid,
       m.trade::public.service_trade, m.title, m.descr, m.site,
       extensions.st_setsrid(extensions.st_makepoint(108.78 + (m.n % 7) * 0.008, 15.36 + (m.n % 5) * 0.012), 4326)::extensions.geography,
       m.addr, m.bmin, m.bmax, m.urg::public.service_urgency,
       now() - make_interval(hours => m.h), now() - make_interval(hours => m.h) + interval '7 days'
from (values
  -- ── mở (1–12)
  (1,  1, 'electric_plumbing', 'Sửa ổ cắm điện phòng trọ bị chập', 'Ổ cắm cạnh giường hay nhảy cầu dao, có mùi khét nhẹ khi cắm sạc.', 'hoa_phat_dung_quat', 'Khu trọ Bình Đông, xã Bình Thạnh', 100000, 300000, 'today', 5),
  (2,  2, 'electric_plumbing', 'Thay vòi nước và thông tắc bồn rửa mặt', 'Vòi bị rỉ nước, bồn rửa thoát chậm. Cần thợ mang sẵn vòi mới.', 'hoa_phat_dung_quat', 'Dãy trọ gần cổng nhà máy, Bình Thuận', 150000, 350000, 'this_week', 9),
  (3,  3, 'cleaning', 'Dọn vệ sinh phòng trọ trước khi trả phòng', 'Phòng 20 m2, cần lau sàn, cọ nhà vệ sinh, lau cửa sổ.', 'cang_dung_quat', 'Khu nhà trọ Cảng Dung Quất', 200000, 400000, 'this_week', 14),
  (4,  4, 'welding', 'Hàn lại khung cổng sắt bị gãy bản lề', 'Cổng sắt nhà trọ bị võng, bản lề gãy, cần hàn gia cố và sơn lại.', 'hoa_phat_dung_quat', 'Xóm 3, Bình Hải', 300000, 600000, 'this_week', 20),
  (5,  1, 'hvac', 'Máy lạnh phòng trọ chảy nước, cần kiểm tra', 'Máy lạnh 1 HP chạy vẫn mát nhưng nước chảy ra sàn từ dàn lạnh.', 'vsip_quang_ngai', 'Khu trọ gần KCN VSIP Quảng Ngãi', 200000, 400000, 'today', 26),
  (6,  2, 'other', 'Lắp giá treo tivi và kệ sách lên tường', 'Tường gạch, cần khoan và bắt vít chắc chắn. Tivi 43 inch.', 'hoa_phat_dung_quat', 'Chung cư công nhân Bình Sơn', null, null, 'flexible', 31),
  (7,  3, 'hvac', 'Vệ sinh và bơm gas máy lạnh 1.5 HP', 'Máy lạnh phòng ngủ lâu chưa vệ sinh, làm lạnh yếu.', 'cang_dung_quat', 'Phòng 305, khu nhà ở Cảng', 200000, 350000, 'this_week', 38),
  (8,  4, 'electric_plumbing', 'Đi lại dây điện bếp, thay át tổng', 'Bếp hay mất điện khi dùng bếp từ và lò vi sóng cùng lúc.', 'hyundai_eco_vina', 'Khu nhà trọ gần Hyundai Eco Vina', 400000, 800000, 'flexible', 47),
  (9,  1, 'cleaning', 'Tổng vệ sinh nhà sau khi sửa chữa', 'Nhà 2 tầng vừa sơn lại, nhiều bụi vôi và vết sơn trên sàn, kính.', 'hoa_phat_dung_quat', 'Đường số 5, Bình Đông', 600000, 1000000, 'flexible', 55),
  (10, 2, 'welding', 'Gia công mái tôn che sân phơi đồ', 'Sân khoảng 12 m2, cần khung sắt hộp và lợp tôn, có bản vẽ phác.', 'vsip_quang_ngai', 'Nhà trọ phía sau chợ Tịnh Phong', 1500000, 2500000, 'this_week', 70),
  (11, 3, 'other', 'Sửa khoá cửa phòng trọ bị kẹt', 'Chìa khoá vặn rất nặng, đôi khi không mở được cửa.', 'cang_dung_quat', 'Dãy trọ đối diện cổng Cảng', null, 200000, 'today', 96),
  (12, 4, 'electric_plumbing', 'Lắp bình nóng lạnh mới trong phòng tắm', 'Đã mua bình 20 lít, cần lắp đặt, đấu điện và ống nước.', 'hyundai_eco_vina', 'Khu trọ Tịnh Phong', 200000, 400000, 'this_week', 120),
  -- ── đã giao thợ (13–18)
  (13, 1, 'hvac', 'Máy lạnh không lạnh, nghi hết gas', 'Máy chạy nhưng gió ra không mát, đã thử vệ sinh lưới lọc.', 'hoa_phat_dung_quat', 'Khu trọ Bình Đông', 250000, 450000, 'today', 52),
  (14, 2, 'electric_plumbing', 'Sửa đường ống nước rò rỉ dưới bồn rửa', 'Nước nhỏ giọt dưới tủ bếp, nền tủ bị ẩm mốc.', 'cang_dung_quat', 'Phòng 12, khu nhà ở Cảng', 150000, 300000, 'today', 60),
  (15, 3, 'cleaning', 'Vệ sinh máy giặt cửa trên', 'Máy giặt 8 kg có mùi hôi, quần áo giặt xong vẫn còn mùi.', 'vsip_quang_ngai', 'Chung cư công nhân VSIP', 150000, 300000, 'this_week', 75),
  (16, 4, 'welding', 'Hàn khung giàn phơi đồ bằng sắt hộp', 'Giàn phơi ban công 3 mét, cần hàn chắc và sơn chống gỉ.', 'hoa_phat_dung_quat', 'Ban công tầng 2, Bình Hải', 700000, 1200000, 'this_week', 90),
  (17, 1, 'other', 'Sơn lại tường phòng trọ phần bị ẩm', 'Khoảng 15 m2 tường bong tróc do thấm, cần xử lý và sơn lại.', 'hyundai_eco_vina', 'Dãy trọ Tịnh Phong', 400000, 800000, 'flexible', 100),
  (18, 2, 'electric_plumbing', 'Thay công tắc và đèn hành lang', 'Ba công tắc bị lỏng, đèn hành lang chập chờn.', 'cang_dung_quat', 'Hành lang tầng 1, khu nhà ở Cảng', 100000, 250000, 'today', 110),
  -- ── hoàn thành (19–26)
  (19, 3, 'hvac', 'Lắp mới máy lạnh treo tường cho phòng ngủ', 'Đã mua máy 1 HP, cần lắp đặt kèm ống đồng và giá đỡ.', 'vsip_quang_ngai', 'Phòng ngủ tầng 2, KCN VSIP', 1000000, 1500000, 'this_week', 480),
  (20, 4, 'cleaning', 'Dọn nhà cuối tuần, lau kính và hút bụi', 'Nhà 3 phòng ngủ, cần dọn tổng thể một buổi.', 'hoa_phat_dung_quat', 'Nhà phố Bình Thạnh', 350000, 500000, 'this_week', 432),
  (21, 1, 'electric_plumbing', 'Thông tắc bồn cầu bị nghẹt', 'Bồn cầu thoát chậm, nước dâng lên khi xả.', 'cang_dung_quat', 'Phòng 7, khu nhà ở Cảng', 150000, 300000, 'today', 384),
  (22, 2, 'welding', 'Hàn sửa xe đẩy hàng bị gãy tay cầm', 'Xe đẩy kho nhà trọ gãy tay cầm và một bánh xe lỏng.', 'hoa_phat_dung_quat', 'Kho nhà trọ Bình Đông', 250000, 450000, 'flexible', 336),
  (23, 3, 'hvac', 'Vệ sinh hai máy lạnh phòng khách', 'Hai máy lạnh treo tường, mỗi máy 1.5 HP.', 'hyundai_eco_vina', 'Phòng khách tầng 1, Tịnh Phong', 250000, 400000, 'this_week', 288),
  (24, 4, 'electric_plumbing', 'Kéo thêm ổ cắm cho góc làm việc', 'Cần thêm 3 ổ cắm và 1 công tắc cho góc làm việc.', 'vsip_quang_ngai', 'Phòng làm việc tại nhà, Tịnh Phong', 200000, 350000, 'flexible', 240),
  (25, 1, 'other', 'Lắp rèm cửa và thanh treo quần áo', 'Hai cửa sổ và một thanh treo dài 2 mét.', 'hoa_phat_dung_quat', 'Phòng trọ tầng 3, Bình Hải', 250000, 450000, 'flexible', 216),
  (26, 2, 'cleaning', 'Vệ sinh sofa và thảm phòng khách', 'Sofa 3 chỗ và thảm 2x3 mét, có vết bẩn lâu ngày.', 'cang_dung_quat', 'Căn hộ khu nhà ở Cảng', 350000, 600000, 'this_week', 192),
  -- ── đã huỷ (27–28)
  (27, 3, 'electric_plumbing', 'Đổi cầu dao tự động bị nhảy liên tục', 'Cầu dao tổng nhảy khi bật bình nóng lạnh, đã tự đổi mà vẫn bị.', 'hoa_phat_dung_quat', 'Phòng 21, khu trọ Bình Thuận', 150000, 350000, 'today', 90),
  (28, 4, 'other', 'Chống thấm sàn ban công', 'Ban công 6 m2 bị thấm xuống trần tầng dưới mỗi khi mưa.', 'hyundai_eco_vina', 'Ban công tầng 2, Tịnh Phong', 800000, 1500000, 'flexible', 130),
  -- ── hết hạn (29–30)
  (29, 1, 'hvac', 'Kiểm tra tủ lạnh kêu to và đóng tuyết', 'Tủ lạnh 180 lít kêu rù rù và ngăn đá đóng tuyết dày.', 'vsip_quang_ngai', 'Phòng 4, chung cư công nhân VSIP', 150000, 300000, 'this_week', 336),
  (30, 2, 'welding', 'Hàn bịt lỗ thủng thùng chứa nước', 'Thùng inox 500 lít bị thủng nhỏ ở đáy, rỉ nước.', 'hoa_phat_dung_quat', 'Sân sau nhà trọ Bình Hải', 300000, 600000, 'flexible', 288)
) as m(n, c, trade, title, descr, site, addr, bmin, bmax, urg, h)
on conflict (id) do nothing;

-- ── 42 báo giá (insert khi yêu cầu còn mở; cập nhật trạng thái yêu cầu ở bước sau) ──────────────────────────────
-- p = thợ (1–6 → …0a0011–…0a0016), h = số giờ sau lúc đăng yêu cầu.
insert into public.service_quotes (id, request_id, pro_id, price, note, status, created_at)
select ('00000000-0000-4000-8000-00000f' || lpad(m.q::text, 6, '0'))::uuid,
       r.id,
       ('00000000-0000-4000-8000-0000000a001' || m.p)::uuid,
       m.price, m.note, m.status::public.service_quote_status, r.created_at + make_interval(hours => m.h)
from (values
  (1, 1, 1, 150000, 'Mình ở gần, có thể qua ngay trong hôm nay.', 'submitted', 1),
  (2, 1, 5, 180000, 'Có đủ dụng cụ, bảo hành 1 tháng.', 'submitted', 2),
  (3, 1, 6, 160000, null, 'submitted', 3),
  (4, 2, 1, 220000, 'Gồm cả thay vòi và thông tắc.', 'submitted', 2),
  (5, 2, 5, 200000, null, 'submitted', 4),
  (6, 4, 2, 350000, 'Hàn tại chỗ, kèm sơn chống gỉ.', 'submitted', 3),
  (7, 5, 3, 300000, 'Kiểm tra miễn phí, báo giá rõ trước khi sửa.', 'submitted', 2),
  (8, 5, 5, 280000, null, 'submitted', 3),
  (9, 5, 1, 350000, null, 'submitted', 5),
  (10, 5, 6, 320000, 'Có thể qua sáng mai.', 'submitted', 6),
  (11, 7, 3, 250000, 'Bơm gas và vệ sinh trong một lần.', 'submitted', 4),
  (12, 7, 5, 230000, null, 'submitted', 8),
  (13, 8, 1, 500000, 'Cần xem hiện trạng, báo giá chi tiết khi tới.', 'submitted', 6),
  (14, 10, 2, 1800000, 'Gia công theo bản vẽ, thi công trong 2 ngày.', 'submitted', 5),
  (15, 10, 6, 1700000, null, 'submitted', 9),
  (16, 10, 5, 2000000, 'Bao gồm vật tư.', 'submitted', 12),
  (17, 11, 5, 120000, null, 'submitted', 10),
  (18, 13, 3, 300000, 'Sẽ nạp gas và kiểm tra rò rỉ.', 'accepted', 3),
  (19, 13, 5, 330000, null, 'declined', 5),
  (20, 14, 1, 180000, null, 'accepted', 2),
  (21, 14, 6, 210000, null, 'declined', 4),
  (22, 14, 5, 190000, null, 'declined', 6),
  (23, 15, 4, 200000, 'Vệ sinh sâu, có khử khuẩn.', 'accepted', 3),
  (24, 15, 6, 250000, null, 'declined', 5),
  (25, 16, 2, 900000, 'Sắt hộp 4x4, sơn lót chống gỉ.', 'accepted', 4),
  (26, 16, 6, 1000000, null, 'declined', 6),
  (27, 17, 5, 600000, null, 'accepted', 5),
  (28, 17, 6, 700000, null, 'declined', 7),
  (29, 18, 1, 150000, 'Thay luôn đèn nếu cần.', 'accepted', 2),
  (30, 19, 3, 1200000, 'Lắp mới kèm ống đồng và giá đỡ.', 'accepted', 5),
  (31, 19, 6, 1350000, null, 'declined', 8),
  (32, 20, 4, 400000, 'Dọn hết các phòng và lau kính.', 'accepted', 3),
  (33, 21, 1, 200000, null, 'accepted', 2),
  (34, 21, 6, 230000, null, 'declined', 4),
  (35, 22, 2, 350000, null, 'accepted', 6),
  (36, 23, 3, 300000, null, 'accepted', 3),
  (37, 24, 1, 250000, null, 'accepted', 5),
  (38, 25, 5, 350000, null, 'accepted', 4),
  (39, 26, 4, 450000, null, 'accepted', 6),
  (40, 27, 1, 250000, null, 'withdrawn', 3),
  (41, 27, 5, 270000, null, 'declined', 5),
  (42, 29, 3, 180000, null, 'submitted', 6)
) as m(q, n, p, price, note, status, h)
join public.service_requests r on r.id = ('00000000-0000-4000-8000-00000e' || lpad(m.n::text, 6, '0'))::uuid
on conflict (id) do nothing;

-- ── trạng thái cuối của yêu cầu (done_h = số giờ trước lúc hoàn thành) ───────────────────────────────────────────
update public.service_requests r
   set status = m.status::public.service_request_status,
       accepted_quote_id = (select q.id from public.service_quotes q where q.request_id = r.id and q.status = 'accepted'),
       completed_at = case when m.status = 'completed' then now() - make_interval(hours => m.done_h) end
  from (values
    (13, 'assigned', 0), (14, 'assigned', 0), (15, 'assigned', 0), (16, 'assigned', 0), (17, 'assigned', 0), (18, 'assigned', 0),
    (19, 'completed', 30), (20, 'completed', 60), (21, 'completed', 100), (22, 'completed', 140),
    (23, 'completed', 170), (24, 'completed', 200), (25, 'completed', 48), (26, 'completed', 24),
    (27, 'cancelled', 0), (28, 'cancelled', 0), (29, 'expired', 0), (30, 'expired', 0)
  ) as m(n, status, done_h)
 where r.id = ('00000000-0000-4000-8000-00000e' || lpad(m.n::text, 6, '0'))::uuid;

-- ── đánh giá hai chiều cho vài đơn hoàn thành (side c = khách chấm thợ, p = thợ chấm khách) ───────────────────────
insert into public.ratings (rater_id, ratee_id, context_type, context_id, score, comment, created_at)
select case m.side when 'c' then r.customer_id else q.pro_id end,
       case m.side when 'c' then q.pro_id else r.customer_id end,
       'service_request', r.id, m.score, m.comment, r.completed_at + interval '2 hours'
from (values
  (19, 'c', 5, 'Thợ đến đúng giờ, lắp gọn gàng và dọn sạch sau khi xong.'),
  (19, 'p', 5, 'Khách thân thiện, thanh toán nhanh.'),
  (20, 'c', 4, 'Dọn sạch sẽ, hơi trễ so với giờ hẹn một chút.'),
  (20, 'p', 5, 'Nhà gọn, khách dễ trao đổi.'),
  (21, 'c', 5, 'Làm nhanh, giá đúng như báo.'),
  (22, 'p', 4, 'Khách rõ yêu cầu, thanh toán đúng hẹn.')
) as m(n, side, score, comment)
join public.service_requests r on r.id = ('00000000-0000-4000-8000-00000e' || lpad(m.n::text, 6, '0'))::uuid
join public.service_quotes q on q.id = r.accepted_quote_id
on conflict do nothing;

commit;

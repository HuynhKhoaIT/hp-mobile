-- Gắn ảnh demo CC0 cho tin mẫu ĐÃ CÓ (staging đã chạy staging-demo.sql trước khi có ảnh, hoặc local chưa db reset).
-- Điều kiện: đã tải bộ ảnh lên bucket listing-images (`node supabase/demo/upload-demo-images.mjs`, xem đầu file đó).
-- Chạy: Supabase Dashboard → SQL Editor → dán toàn bộ → Run. Chạy lại không sao: chỉ đụng tin mẫu chưa có ảnh.
-- Phạm vi: tin của tài khoản seed / demo (UUID 00000000-0000-4000-8000-…), khớp tiêu đề gốc của supabase/seed/listings.sql
-- (tin thứ 11+ có hậu tố " (tin N)" / " #N" / " N号"). Ảnh giống hệt khi seed mới: demo/<category>/<NN>.webp, tin trọ thêm 2 ảnh
-- demo/room/extra-*; thẻ ra vào / bằng lái / thẻ ATM để trống. Webhook revalidate web chạy cho từng tin được cập nhật.
-- Sinh từ supabase/seed/listings.sql — đổi tiêu đề ở đó thì sinh lại file này.

begin;

with base(category, idx, title) as (
  values
  ('pass_electronics', 1, 'Pass iPhone 13 128GB còn pin 89%'),
  ('pass_electronics', 2, 'Bán laptop Dell Latitude i5 cho anh em ca kíp'),
  ('pass_electronics', 3, 'Thanh lý tai nghe Bluetooth Sony'),
  ('pass_electronics', 4, 'Pass Samsung A54 mới dùng 3 tháng'),
  ('pass_electronics', 5, 'Bán quạt điều hoà mini cho phòng trọ'),
  ('pass_electronics', 6, 'Pass loa JBL Charge 5 chống nước'),
  ('pass_electronics', 7, 'Bán máy tính bảng Xiaomi Pad 6'),
  ('pass_electronics', 8, 'Thanh lý màn hình LG 24 inch'),
  ('pass_electronics', 9, 'Used iPhone 12, battery 85%'),
  ('pass_electronics', 10, '出售二手笔记本电脑 联想 ThinkPad'),
  ('pass_vehicle', 1, 'Bán Honda Wave Alpha 2019 chính chủ'),
  ('pass_vehicle', 2, 'Pass xe Exciter 150 đời 2020'),
  ('pass_vehicle', 3, 'Bán xe đạp thể thao đi ca'),
  ('pass_vehicle', 4, 'Thanh lý Vision 2018 máy êm'),
  ('pass_vehicle', 5, 'Bán Sirius 2017 giấy tờ đầy đủ'),
  ('pass_vehicle', 6, 'Pass xe máy điện VinFast Evo200'),
  ('pass_vehicle', 7, 'Bán Toyota Vios 2016 gia đình đi giữ gìn'),
  ('pass_vehicle', 8, 'Pass xe đạp điện còn mới'),
  ('pass_vehicle', 9, 'Motorbike Honda Blade for sale'),
  ('pass_vehicle', 10, '出售本田摩托车 2019年'),
  ('pass_ppe', 1, 'Pass giày bảo hộ Jogger size 42'),
  ('pass_ppe', 2, 'Bán mũ bảo hộ 3M còn mới'),
  ('pass_ppe', 3, 'Thanh lý quần áo bảo hộ size L'),
  ('pass_ppe', 4, 'Pass găng tay chống cắt 5 đôi'),
  ('pass_ppe', 5, 'Bán giày bảo hộ Safety Jogger size 40'),
  ('pass_ppe', 6, 'Pass kính bảo hộ chống bụi'),
  ('pass_ppe', 7, 'Bán áo phản quang công trường'),
  ('pass_ppe', 8, 'Pass ủng cao su chống hoá chất size 41'),
  ('pass_ppe', 9, 'Safety boots size 43, used twice'),
  ('pass_ppe', 10, '出售安全鞋 42码'),
  ('pass_home', 1, 'Thanh lý tủ lạnh Aqua 90 lít'),
  ('pass_home', 2, 'Pass nồi cơm điện Sharp 1.8L'),
  ('pass_home', 3, 'Bán bàn gấp + ghế nhựa phòng trọ'),
  ('pass_home', 4, 'Pass nệm 1m2 còn sạch'),
  ('pass_home', 5, 'Bán máy giặt Toshiba 7kg'),
  ('pass_home', 6, 'Thanh lý bếp gas đôi'),
  ('pass_home', 7, 'Pass kệ sắt 4 tầng'),
  ('pass_home', 8, 'Bán tủ quần áo vải khung inox'),
  ('pass_home', 9, 'Rice cooker and kettle, moving out'),
  ('pass_home', 10, '出售小冰箱 宿舍用'),
  ('room_rent', 1, 'Cho thuê phòng trọ gần cổng Hòa Phát, có gác'),
  ('room_rent', 2, 'Phòng mới xây 20m² có chỗ để xe'),
  ('room_rent', 3, 'Cho thuê phòng khép kín, điện nước giá dân'),
  ('room_rent', 4, 'Phòng trọ yên tĩnh cho công nhân ca đêm'),
  ('room_rent', 5, 'Cho thuê phòng có máy lạnh gần VSIP'),
  ('room_rent', 6, 'Phòng 25m² có bếp riêng, không chung chủ'),
  ('room_rent', 7, 'Cho thuê nhà nguyên căn 2 phòng ngủ'),
  ('room_rent', 8, 'Phòng giá rẻ gần cảng Dung Quất'),
  ('room_rent', 9, 'Room for rent near Dung Quat port, AC'),
  ('room_rent', 10, '出租单间 近和发钢厂'),
  ('room_share', 1, 'Tìm 1 bạn nam ở ghép, chia tiền phòng'),
  ('room_share', 2, 'Cần 2 bạn nữ ở ghép gần Hòa Phát'),
  ('room_share', 3, 'Ở ghép nhà nguyên căn, có wifi'),
  ('room_share', 4, 'Tìm bạn ở ghép làm ca ngày'),
  ('room_share', 5, 'Ghép phòng 2 người, có máy giặt chung'),
  ('room_share', 6, 'Tìm người ở ghép, phòng rộng có gác'),
  ('room_share', 7, 'Ở ghép gần VSIP, đi làm 5 phút'),
  ('room_share', 8, 'Tìm bạn cùng phòng, không hút thuốc'),
  ('room_share', 9, 'Looking for a roommate near Hyundai Eco Vina'),
  ('room_share', 10, '找室友 合租 近港口'),
  ('job_main', 1, 'Tuyển công nhân vận hành ca xoay'),
  ('job_main', 2, 'Tuyển thợ hàn có chứng chỉ'),
  ('job_main', 3, 'Tuyển lái xe nâng, lương tháng'),
  ('job_main', 4, 'Tuyển nhân viên kho vật tư'),
  ('job_main', 5, 'Tuyển thợ điện công nghiệp'),
  ('job_main', 6, 'Tuyển phụ bếp nhà ăn công ty'),
  ('job_main', 7, 'Tuyển bảo vệ ca đêm'),
  ('job_main', 8, 'Tuyển nhân viên QC sản phẩm thép'),
  ('job_main', 9, 'Hiring forklift drivers, monthly salary'),
  ('job_main', 10, '招聘焊工 有证书优先'),
  ('job_parttime', 1, 'Tuyển phụ quán cà phê ngoài ca'),
  ('job_parttime', 2, 'Làm thêm giao hàng buổi tối'),
  ('job_parttime', 3, 'Tuyển phụ bán quán ăn trưa'),
  ('job_parttime', 4, 'Gia sư tiếng Anh cho con em công nhân'),
  ('job_parttime', 5, 'Làm thêm bốc xếp cuối tuần'),
  ('job_parttime', 6, 'Tuyển phụ rửa xe ngoài giờ'),
  ('job_parttime', 7, 'Tuyển phục vụ quán nhậu ca tối'),
  ('job_parttime', 8, 'Làm thêm dọn dẹp nhà theo giờ'),
  ('job_parttime', 9, 'Part-time English tutor, evenings'),
  ('job_parttime', 10, '兼职 周末餐厅服务员'),
  ('lost', 1, 'Mất ví da màu nâu gần cổng số 2'),
  ('lost', 2, 'Rơi thẻ ra vào công ty ở nhà ăn'),
  ('lost', 3, 'Mất chìa khoá xe Honda có móc gấu'),
  ('lost', 4, 'Đánh rơi điện thoại Oppo ở bãi xe'),
  ('lost', 5, 'Mất balo đen có giấy tờ tuỳ thân'),
  ('lost', 6, 'Rơi tai nghe AirPods ở phòng thay đồ'),
  ('lost', 7, 'Mất giấy phép lái xe trên đường về Châu Ổ'),
  ('lost', 8, 'Mất áo khoác đồng phục ca B'),
  ('lost', 9, 'Lost brown wallet near gate 2'),
  ('lost', 10, '丢失钱包 黑色 在食堂附近'),
  ('found', 1, 'Nhặt được ví ở bãi xe số 3'),
  ('found', 2, 'Nhặt được chìa khoá xe máy ở nhà ăn'),
  ('found', 3, 'Nhặt được thẻ ATM ở cây xăng Bình Đông'),
  ('found', 4, 'Nhặt được điện thoại Samsung trên xe đưa đón'),
  ('found', 5, 'Nhặt được balo xanh ở trạm chờ xe'),
  ('found', 6, 'Nhặt được mũ bảo hiểm ở cổng phụ'),
  ('found', 7, 'Nhặt được kính cận ở phòng họp'),
  ('found', 8, 'Nhặt được túi đồ nghề ở xưởng'),
  ('found', 9, 'Found a set of keys at the canteen'),
  ('found', 10, '捡到手机 在班车上')
),
target as (
  select l.id, l.category, b.idx
  from public.listings l
  join base b on b.category = l.category::text
             and (l.title = b.title or left(l.title, length(b.title) + 1) = b.title || ' ')
  where l.owner_id::text like '00000000-0000-4000-8000-%'
    and l.images = '{}'
    and l.category::text || '/' || lpad(b.idx::text, 2, '0') not in ('lost/02', 'lost/07', 'found/03')
)
update public.listings l
set images = array['demo/' || t.category || '/' || lpad(t.idx::text, 2, '0') || '.webp']
  || case when t.category in ('room_rent', 'room_share') then
       array['demo/room/extra-' || (1 + abs(hashtext(t.id::text)) % 4) || '.webp',
             'demo/room/extra-' || (1 + (abs(hashtext(t.id::text)) + 1) % 4) || '.webp']
     else '{}'::text[] end
from target t
where l.id = t.id;

commit;

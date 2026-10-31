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
    '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000004'
  ]::uuid[];
  v_banned uuid := '00000000-0000-4000-8000-000000000003';
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
      v_created := now() - (i * interval '5 hours') - (array_position(enum_range(null::public.listing_category), v_cat) * interval '17 minutes');
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

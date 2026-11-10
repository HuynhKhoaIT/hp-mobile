-- Sân thể thao mẫu quanh Dung Quất (dữ liệu giả, không phải cơ sở thật) + gắn vào kèo Ghép trận của seed/groups.sql.
-- Chạy sau groups.sql (thứ tự chữ cái). Quyền postgres: guard bỏ qua luật client.
insert into public.venues (name, sports, site, address_text, location, price_ref, phone, status, created_by, reviewed_at)
values
  ('Sân bóng Bình Thạnh', array['football'], 'hoa_phat_dung_quat', 'Thôn Bình Thạnh, gần chợ',
   extensions.st_setsrid(extensions.st_makepoint(108.800, 15.360), 4326)::extensions.geography, 300000, '0900 000 101',
   'approved', '00000000-0000-4000-8000-000000000001', now()),
  ('Nhà thi đấu Bình Sơn', array['badminton', 'pickleball'], 'hoa_phat_dung_quat', 'Trung tâm huyện Bình Sơn',
   extensions.st_setsrid(extensions.st_makepoint(108.790, 15.410), 4326)::extensions.geography, 80000, '0900 000 102',
   'approved', '00000000-0000-4000-8000-000000000001', now()),
  ('Sân pickleball Dốc Sỏi', array['pickleball'], 'hoa_phat_dung_quat', 'Ngã ba Dốc Sỏi',
   extensions.st_setsrid(extensions.st_makepoint(108.810, 15.390), 4326)::extensions.geography, 120000, null,
   'approved', '00000000-0000-4000-8000-000000000004', now()),
  ('Sân cỏ nhân tạo Vạn Tường', array['football'], 'hoa_phat_dung_quat', 'Khu đô thị Vạn Tường',
   extensions.st_setsrid(extensions.st_makepoint(108.845, 15.370), 4326)::extensions.geography, 350000, '0900 000 104',
   'approved', '00000000-0000-4000-8000-000000000004', now()),
  ('CLB cầu lông Bình Trị', array['badminton'], 'hoa_phat_dung_quat', 'Xã Bình Trị',
   extensions.st_setsrid(extensions.st_makepoint(108.835, 15.395), 4326)::extensions.geography, 60000, null,
   'approved', '00000000-0000-4000-8000-000000000005', now()),
  ('Sân bóng mini Bình Đông', array['football'], 'hoa_phat_dung_quat', 'Xã Bình Đông',
   extensions.st_setsrid(extensions.st_makepoint(108.860, 15.350), 4326)::extensions.geography, 250000, null,
   'approved', '00000000-0000-4000-8000-000000000005', now()),
  ('Sân tennis + pickleball Bình Hải', array['pickleball', 'badminton'], 'hoa_phat_dung_quat', 'Xã Bình Hải',
   extensions.st_setsrid(extensions.st_makepoint(108.880, 15.330), 4326)::extensions.geography, 100000, null,
   'approved', '00000000-0000-4000-8000-000000000001', now()),
  -- chờ duyệt (moderator thấy, người khác không)
  ('Sân bóng mới gần cổng 3', array['football'], 'hoa_phat_dung_quat', 'Gần cổng 3 nhà máy',
   extensions.st_setsrid(extensions.st_makepoint(108.828, 15.382), 4326)::extensions.geography, 280000, null,
   'pending', '00000000-0000-4000-8000-000000000004', null);

update public.groups g
set venue_id = v.id
from public.venues v
where g.kind = 'sport' and g.venue_id is null and v.status = 'approved' and v.name = g.origin_text;

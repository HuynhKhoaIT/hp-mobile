-- 0003 sites_data
-- Mục đích: dữ liệu danh mục khu liên hợp cần có ở MỌI môi trường (local, staging, prod).
--           `supabase db push` không chạy seed.sql, nên dữ liệu tham chiếu nằm ở migration; seed.sql chỉ giữ dữ liệu test.
-- Bảng ảnh hưởng: sites (chỉ thêm dòng). Toạ độ gần đúng khu vực nhà máy, đủ cho lọc khoảng cách; admin chỉnh trong /admin/catalog.
-- Client: không đổi.

insert into public.sites (code, name, location) values
  ('dung_quat', 'Khu liên hợp Dung Quất (Quảng Ngãi)', extensions.st_setsrid(extensions.st_makepoint(108.7960, 15.3930), 4326)::extensions.geography),
  ('hai_duong', 'Khu liên hợp Hải Dương (Kinh Môn)',   extensions.st_setsrid(extensions.st_makepoint(106.5030, 21.0330), 4326)::extensions.geography),
  ('hung_yen',  'Khu công nghiệp Phố Nối (Hưng Yên)',  extensions.st_setsrid(extensions.st_makepoint(106.0560, 20.9330), 4326)::extensions.geography)
on conflict (code) do nothing;

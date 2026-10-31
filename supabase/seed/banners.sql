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

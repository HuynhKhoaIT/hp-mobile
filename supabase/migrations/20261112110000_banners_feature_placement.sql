-- Banner riêng cho trang chủ Pass đồ (mini-app trong super app): placement app_pass (app) / web_pass (web /pass-do).
-- Ảnh hưởng: banners.placement CHECK. RLS, audit, index (placement, sort) giữ nguyên.
-- Client cần cập nhật: @hp/core BANNER_PLACEMENTS (form /admin/marketing), i18n admin nhãn placement; trang chủ Pass đồ
-- app đọc useBanners('app_pass'), web đọc 'web_pass'. Tính năng khác cần banner riêng → thêm app_<feature> / web_<feature>.

alter table public.banners drop constraint if exists banners_placement_check;
alter table public.banners add constraint banners_placement_check
  check (placement in ('app_home', 'web_home', 'web_listing', 'app_pass', 'web_pass'));

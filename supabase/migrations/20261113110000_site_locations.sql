-- Toạ độ khu làm việc cho màn chi tiết phòng trọ (Stitch "Vị trí & khoảng cách": cách mỗi khu bao xa, mấy phút xe máy).
-- Ảnh hưởng: view mới public.site_locations (code, name, lat, lng — khu đang hoạt động). Khu làm việc là địa điểm doanh
-- nghiệp công khai (không phải PII); toạ độ tin trọ vẫn là bản làm tròn ~300 m của public_listings → khoảng cách gần đúng.
-- security_invoker: theo RLS của sites (anon / user đọc được; staff đọc cả khu ẩn nhưng view lọc is_active).
-- Client cần cập nhật: @hp/core listSiteLocations + useSiteLocations (keys.siteLocations()), @hp/shared distanceM.

create or replace view public.site_locations with (security_invoker = true) as
select s.code, s.name,
       extensions.st_y(s.location::extensions.geometry) as lat,
       extensions.st_x(s.location::extensions.geometry) as lng,
       s.sort_order
from public.sites s
where s.is_active;
comment on view public.site_locations is 'Khu làm việc đang hoạt động kèm toạ độ (lat / lng) — khoảng cách tin trọ tới từng khu ở client.';
grant select on public.site_locations to anon, authenticated;

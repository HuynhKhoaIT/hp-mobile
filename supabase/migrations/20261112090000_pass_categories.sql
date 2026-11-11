-- Pass đồ mở rộng từ 4 lên 10 danh mục (giống chợ đồ cũ đầy đủ): điện lạnh, thời trang, thể thao, dụng cụ / đồ nghề,
-- mẹ & bé, khác. Bảng ảnh hưởng: enum listing_category (chỉ thêm giá trị, ở cuối enum để thứ tự cũ + seed cũ giữ nguyên).
-- Migration riêng vì giá trị enum mới không dùng được trong cùng transaction (.claude/rules/be-migrations.md).
-- Client cần cập nhật: @hp/shared LISTING_CATEGORIES / LISTING_FEATURES.pass / ATTRIBUTE_FIELDS, i18n common.category.*,
-- icon danh mục trong config pass của app + web; sinh lại packages/db/database.types.ts.
-- Hết hạn: listing_default_ttl() rơi vào nhánh else → 30 ngày như pass cũ (không cần sửa).
-- Chưa ra mắt → không chuyển dữ liệu: tủ lạnh / máy giặt đã đăng ở pass_home giữ nguyên danh mục.

alter type public.listing_category add value if not exists 'pass_appliance';
alter type public.listing_category add value if not exists 'pass_fashion';
alter type public.listing_category add value if not exists 'pass_sport';
alter type public.listing_category add value if not exists 'pass_tools';
alter type public.listing_category add value if not exists 'pass_baby';
alter type public.listing_category add value if not exists 'pass_other';

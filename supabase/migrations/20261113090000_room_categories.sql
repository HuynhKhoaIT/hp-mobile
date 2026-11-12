-- Nhà trọ thành mini-app (thiết kế Stitch "Sub-App Nhà Trọ Dung Quất"): thêm loại Nhà nguyên căn, Căn hộ / ký túc xá.
-- Bảng ảnh hưởng: enum listing_category (chỉ thêm, cuối enum — thứ tự + seed cũ giữ nguyên). Migration riêng vì giá trị
-- enum mới không dùng được trong cùng transaction (.claude/rules/be-migrations.md).
-- Client cần cập nhật: @hp/shared LISTING_CATEGORIES / LISTING_FEATURES.room / ATTRIBUTE_FIELDS, i18n common.category.*,
-- icon danh mục trong config room của app + web; sinh lại packages/db/database.types.ts.
-- Hết hạn: listing_default_ttl() nhánh else → 30 ngày như trọ cũ. Luật ≥ 3 ảnh: migration 20261113100000.

alter type public.listing_category add value if not exists 'room_house';
alter type public.listing_category add value if not exists 'room_apartment';

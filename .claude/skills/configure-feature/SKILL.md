---
name: configure-feature
description: Thêm hoặc chỉnh một tính năng Listing/Group (pass, room, job, lost-found, ride, sport) bằng cách sửa config.ts, không viết lại logic. Dùng khi thêm danh mục con, filter, field form, variant card, CTA cho một tính năng.
argument-hint: "<pass|room|job|lost-found|ride|sport> <việc cần đổi>"
---

# Cấu hình tính năng

## Nguyên tắc
Mọi khác biệt giữa 6 tính năng nằm trong `src/features/<tên>/config.ts`. Việc cần làm không biểu diễn được bằng config → mở rộng `ListingFeatureConfig` / `GroupFeatureConfig` trong `features/listing/types.ts` hoặc `features/group/types.ts` và engine dùng chung, để mọi tính năng cùng hưởng. Không tạo màn hình / hook riêng cho một tính năng.

## Bước
1. Đọc `src/features/listing/types.ts` (hoặc `group/types.ts`) và `config.ts` hiện tại của tính năng.
2. Đối chiếu dữ liệu:
   - Danh mục / `sub_kind` phải tồn tại trong enum của `@hp/db` (`listing_category`, `group_kind`, `sub_kind` hợp lệ). Thiếu → việc này bắt đầu ở `supabase/` + `packages/shared` (migration + Zod + i18n), không tự thêm string ở mobile.
   - Key field form phải khớp Zod schema `attributes` trong `@hp/shared` (`packages/shared/src/schemas/listing/<category>.ts`).
   - Filter chỉ trong tập mà RPC `search_listings` / `search_groups` hỗ trợ.
3. Sửa `config.ts`. Giữ `required` tối thiểu (pass đồ: ảnh + tiêu đề + giá).
4. i18n: nhãn field / filter / danh mục mới → `/add-i18n-key` (`listing.field.<key>`, `listing.filter.<key>`, `category.<code>`).
5. Cần hiển thị attribute đặc thù (vd `DistanceToSite` cho trọ) → tạo trong `features/listing/components`, ghép từ `@/ui`, đăng ký trong `attributeRenderers`; không tạo trong `features/room`.
6. Kiểm: màn List / Detail / Form của tính năng vẫn chạy với seed; `pnpm tsc --noEmit`; `/mobile-done-check`.

## Ghi chú theo tính năng
- **pass**: filter danh mục con, giá, tình trạng, bán kính, khu, sắp xếp; "Đăng nhanh" 3 bước; đánh giá sau khi "Đã bán".
- **room**: ảnh tối thiểu 3; filter khoảng cách tới `sites.location`, giá, diện tích, gác, chỗ để xe, giờ giấc, ở ghép nam/nữ; card hiện giá/tháng + "cách nhà máy X km" + còn trống; bản đồ cluster bắt buộc; nhắc gia hạn trước 3 ngày.
- **job**: `job_main` duyệt trước; ứng tuyển = "Quan tâm" mở chat; cờ cảnh báo lừa đảo do server gắn (client chỉ hiển thị `Badge warning`); hết hạn 14 ngày.
- **lost-found**: miễn phí, không duyệt, 60 ngày; hướng dẫn che một phần ảnh đồ nhặt được; CTA "Đã nhận lại" (hai bên bấm → `closed`); match tức thì là app-only (`capabilities.lostFoundInstantMatch`).
- **ride**: `sub_kind` car_owner | bus_pool | motorbike; điểm đi mặc định cổng nhà máy; tìm theo ngày + điểm đến < 5 km + còn chỗ; nhắc 60 phút (app-only `reminders`); banner mùa lễ.
- **sport**: `sub_kind` football | badminton | pickleball; chọn `venues` hoặc nhập mới (moderator duyệt); trình độ; phí chia/người; đánh giá "đúng giờ / đúng trình độ".

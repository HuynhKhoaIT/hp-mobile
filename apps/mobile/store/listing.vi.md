# Store listing — Tiếng Việt (vi)

Bản nháp cho App Store và Google Play. Tên miền `tenapp.vn` và bundle id `vn.tenapp.app` đang là tạm thời; đổi trước khi nộp.

## Tên (≤ 30 ký tự)

Người Dung Quất: Pass đồ, trọ

## Phụ đề App Store (≤ 30 ký tự)

Việc làm, ghép xe, đồ thất lạc

## Mô tả ngắn Google Play (≤ 80 ký tự)

Pass đồ, tìm trọ, tìm việc, ghép xe, ghép trận quanh khu Dung Quất.

## Mô tả đầy đủ (≤ 4000 ký tự)

Người Dung Quất là ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát. Đây là ứng dụng cá nhân, độc lập, làm cho người lao động sống và làm việc quanh khu Dung Quất.

Một ứng dụng cho những việc hằng ngày:

PASS ĐỒ
Đăng bán đồ điện tử, xe, đồ bảo hộ, đồ gia dụng. "Đăng nhanh" chỉ cần ảnh, tiêu đề và giá.

TÌM TRỌ
Xem phòng cho thuê và tin ở ghép, lọc theo khoảng cách tới khu làm việc.

TÌM VIỆC
Tin việc chính và việc làm thêm ngoài ca.

ĐỒ THẤT LẠC
Đăng đồ mất hoặc đồ nhặt được. Ứng dụng gợi ý các tin có thể khớp và báo cho bạn.

GHÉP XE
Tạo hoặc tham gia chuyến đi chung về thành phố, về quê. Chủ chuyến có thể duyệt thành viên, cả nhóm nhắn tin với nhau.

GHÉP TRẬN
Tìm người đá bóng, cầu lông, pickleball; chọn sân và chốt kèo ngay trong nhóm.

Dùng dễ, dùng an toàn:
- Xem và tìm tin không cần đăng nhập
- Nhắn tin trực tiếp với người đăng, có hướng dẫn giao dịch an toàn
- Tin đăng được kiểm duyệt; có nút Báo cáo và Chặn
- Huy hiệu xác minh sau khi giấy tờ được duyệt
- Lưu tin, nhận thông báo khi có tin nhắn hoặc nhóm có cập nhật
- Dịch tin sang ngôn ngữ của bạn
- Tiếng Việt, English, 中文
- Xoá tài khoản ngay trong ứng dụng

Ứng dụng chỉ kết nối người dùng với nhau và không tham gia vào giao dịch. Hãy gặp mặt ở nơi đông người, kiểm tra hàng trước khi trả tiền.

Ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát.

## Từ khoá App Store (≤ 100 ký tự, phân cách bằng dấu phẩy)

pass đồ,đồ cũ,tìm trọ,phòng trọ,tìm việc,làm thêm,ghép xe,đồ thất lạc,ghép trận,Dung Quất

Không dùng "Hòa Phát" làm từ khoá: dễ bị hiểu là có liên quan và vi phạm quy định nhãn hiệu của store.

## Có gì mới (phiên bản 1.0.0)

Phiên bản đầu tiên: pass đồ, tìm trọ, tìm việc, đồ thất lạc, ghép xe, ghép trận, nhắn tin, thông báo và huy hiệu xác minh.

## Danh sách ảnh chụp màn hình

Chụp từ app thật trên máy thật hoặc simulator, sau khi có bản build. Không dựng ảnh giả, không ghép số liệu.

Quy tắc khi chụp:
- Dữ liệu demo do mình tạo: tên giả, không có số điện thoại, biển số, khuôn mặt hay giấy tờ thật. Không dùng nguyên `supabase/seed`: một số tin và điểm đón có tên Hòa Phát
- Không có logo, đồng phục, cổng nhà máy hay tên thương hiệu Hòa Phát trong ảnh tin, tên khu, banner
- Chữ chú thích trên ảnh chỉ mô tả tính năng; không ghi số người dùng, xếp hạng hay lời khen
- Chụp bằng tiếng Việt cho bản vi; chế độ sáng; ẩn thanh trạng thái có thông báo cá nhân

| # | Màn hình | Route | Chú thích trên ảnh |
|---|---|---|---|
| 1 | Trang chủ: 6 dịch vụ, tin gần bạn | `(tabs)/index` | Mọi việc quanh khu Dung Quất |
| 2 | Danh sách Pass đồ | `listings/[feature]` | Pass đồ nhanh, gần chỗ làm |
| 3 | Chi tiết tin có ảnh, nút Nhắn tin | `listing/[id]` | Xem rõ, hỏi ngay |
| 4 | Danh sách Tìm trọ, lọc khoảng cách | `listings/[feature]` | Tìm trọ theo khoảng cách |
| 5 | Chi tiết chuyến Ghép xe | `group/[id]` | Ghép xe về quê |
| 6 | Danh sách Ghép trận | `groups/[kind]` | Tìm người chơi, chốt kèo |
| 7 | Hội thoại chat | `chat/[conversationId]` | Nhắn tin trực tiếp |
| 8 | Đăng tin thành công | `listing/new/[category]` | Đăng tin nhanh |

Kích thước theo yêu cầu hiện hành của từng store (kiểm tra lại lúc nộp). Google Play cần thêm ảnh đồ hoạ nổi bật 1024×500: dùng tên app và màu thương hiệu của app, không dùng logo Hòa Phát.

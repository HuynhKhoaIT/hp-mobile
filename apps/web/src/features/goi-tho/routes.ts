// Đường dẫn cố định của mini-app Gọi thợ ở dạng thuần (không React / lucide): dùng được ở proxy.ts (chặn trang cần đăng nhập),
// robots.ts và AASA. Trang con riêng tư (cần đăng nhập — proxy.ts chuyển khách sang /dang-nhap?next=…, noindex): đăng yêu cầu,
// "Của tôi", chat (kèm trang sâu hơn /tin-nhan/[id]). Trang chủ /goi-tho và chi tiết /goi-tho/yeu-cau/[id] công khai (noindex).
// Đổi tên đường dẫn → ảnh hưởng link chia sẻ, deep link app (.well-known) và push: hỏi trước.
export const GOI_THO_BASE = '/goi-tho';

export const GOI_THO_PRIVATE_PATHS: readonly string[] = [
  `${GOI_THO_BASE}/dang-yeu-cau`,
  `${GOI_THO_BASE}/cua-toi`,
  `${GOI_THO_BASE}/tin-nhan`,
];

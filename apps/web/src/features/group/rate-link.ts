// Link "đánh giá chủ nhóm": trang /nhom/{slug} với #danh-gia → GroupActions tự mở dialog đánh giá khi còn chấm được.
// Dùng hash (không phải ?query) để trang chi tiết vẫn là bản cache 300s, không thành trang theo request.
// Nơi dùng: Nhóm của tôi (nút "Đánh giá"), /thong-bao (group_completed → /nhom/id/{id}?danh-gia=1 → handler giữ hash).
export const RATE_HASH = 'danh-gia';

export const groupRateHref = (slug: string) => `/nhom/${slug}#${RATE_HASH}`;

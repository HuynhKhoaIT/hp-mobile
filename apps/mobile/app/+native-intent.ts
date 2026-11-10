// Không phải màn hình: Expo Router gọi hàm này cho mọi link hệ thống mở app (Universal / App Link, scheme hoaphat://).
// Link web tiếng Anh / Trung có tiền tố `/en/tin/{slug}`, `/zh/nhom/{slug}` còn route app chỉ có `tin/[slug]`,
// `nhom/[slug]` → bỏ tiền tố; ngôn ngữ app vẫn theo cài đặt của người dùng. Link khác giữ nguyên.
// File này chạy ngoài cây provider: chỉ xử lý chuỗi, không import @/core.
const LOCALE_PREFIXED_LINK = /^(https?:\/\/[^/]+)?\/(?:en|zh)(?=\/(?:tin|nhom)\/)/;

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return path.replace(LOCALE_PREFIXED_LINK, '$1');
}

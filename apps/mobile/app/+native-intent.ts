// Không phải màn hình: Expo Router gọi hàm này cho mọi link hệ thống mở app (Universal / App Link, scheme hoaphat://).
// Link web tiếng Anh / Trung có tiền tố `/en/tin/{slug}`, `/zh/nhom/{slug}` còn route app chỉ có `tin/[slug]`,
// `nhom/[slug]` → bỏ tiền tố; ngôn ngữ app vẫn theo cài đặt của người dùng. Link mini-app (`/pass-do`, `/tro`, `/en/pass-do/da-luu`…)
// → route `mini/[feature][/<tab>]` (trang con web → tab: miniAppWebPage), giữ `?site=`, `?category=` (→ `categories`),
// `?shortcut=` làm bộ lọc đặt sẵn; `/pass-do/dang-tin` → luồng đăng của mini-app. Link khác giữ nguyên.
// File này chạy ngoài cây provider: chỉ xử lý chuỗi, không import @/core (registry config thuần — không gọi server).
import { miniAppWebPage } from '@/features/configs';

const LOCALE_PREFIXED_LINK = /^(https?:\/\/[^/]+)?\/(?:en|zh)(?=\/(?:tin|nhom)\/)/;
const WEB_LINK = /^(?:https?:\/\/[^/]+)?(\/[^?#]*)(?:\?([^#]*))?/;
const LOCALE_PREFIX = /^\/(?:en|zh)(?=\/|$)/;

/** Query web → query route mini-app (bộ lọc đặt sẵn của phiên: MiniAppParams). */
function miniQuery(raw: string): string {
  const out: string[] = [];
  for (const pair of raw.split('&')) {
    const [k = '', v = ''] = pair.split('=');
    const key = k === 'category' ? 'categories' : k;
    if (v && (key === 'site' || key === 'categories' || key === 'shortcut')) out.push(`${key}=${v}`);
  }
  return out.length > 0 ? `?${out.join('&')}` : '';
}

/** Link web của mini-app → đường dẫn route của app; không thuộc mini-app → null. */
function miniAppLink(link: string): string | null {
  const match = WEB_LINK.exec(link);
  if (!match?.[1]) return null;
  const path = match[1].replace(LOCALE_PREFIX, '').replace(/\/+$/, '') || '/';
  const mini = miniAppWebPage(path);
  if (!mini) return null;
  if (mini.page === 'post') return `/listing/new?feature=${mini.feature}&mini=${mini.slug}`;
  return `/mini/${mini.slug}${mini.page === 'index' ? '' : `/${mini.page}`}${miniQuery(match[2] ?? '')}`;
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return miniAppLink(path) ?? path.replace(LOCALE_PREFIXED_LINK, '$1');
}

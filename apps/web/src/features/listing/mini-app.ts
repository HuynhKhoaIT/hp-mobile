// Tra config mini-app theo đường dẫn (thanh điều hướng dưới, dải tab desktop, header chung ẩn trên điện thoại) + tab đang mở.
// Hàm thuần (không React) — dùng ở server và client.
import type { ListingFeatureConfig, ListingMiniApp } from './feature-config';
import { LISTING_FEATURE_CONFIGS, LISTING_FEATURE_ORDER } from './features';
import { miniAppBaseOf } from './mini-app-routes';

export type MiniAppConfig = ListingFeatureConfig & { miniApp: ListingMiniApp };

/** Tab của mini-app (thứ tự hiển thị). `post` là nút Đăng tin nổi giữa (đang mở khi ở trang đăng tin của mini-app). */
export const MINI_APP_TABS = ['home', 'saved', 'post', 'chat', 'manage'] as const;
export type MiniAppTab = (typeof MINI_APP_TABS)[number];

export const isMiniApp = (cfg: ListingFeatureConfig | null | undefined): cfg is MiniAppConfig => !!cfg?.miniApp;

/** Config mini-app chứa đường dẫn (chưa tiền tố ngôn ngữ); null = trang ngoài mini-app. */
export function miniAppConfigOf(pathname: string): MiniAppConfig | null {
  const base = miniAppBaseOf(pathname);
  if (!base) return null;
  const cfg = LISTING_FEATURE_ORDER.map((f) => LISTING_FEATURE_CONFIGS[f]).find((c) => c.path === base);
  return isMiniApp(cfg) ? cfg : null;
}

/** Tab đang mở: trang chủ + trang bộ lọc thuộc tab Trang chủ (giống Stitch). */
export function miniAppTabOf(cfg: MiniAppConfig, pathname: string): MiniAppTab | null {
  const { paths } = cfg.miniApp;
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  if (pathname === paths.home || under(paths.filter)) return 'home';
  if (under(paths.saved)) return 'saved';
  if (under(paths.chat)) return 'chat';
  if (under(paths.manage)) return 'manage';
  if (under(paths.post)) return 'post';
  return null;
}

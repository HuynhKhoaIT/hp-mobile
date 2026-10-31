// Hình ảnh của 6 dịch vụ + 2 ô tiện ích trên trang chủ (docs/design/home.md §4.3, §10). Thứ tự / cờ (soon, isNew) lấy từ
// HOME_TILES của @hp/shared (chung với app); file này chỉ map id → icon, màu, đường dẫn web.
// Listing: icon + màu lấy từ config của tính năng (features/<x>/config.ts) để trang chủ, danh sách và thẻ tin cùng một
// nhận diện. Group (ride / sport) chưa có config (tuần 7–8): khai báo tại đây, chuyển về features/ride|sport/config.ts khi có.
// Class viết đầy đủ (Tailwind quét được, không ghép chuỗi động).
import { type Feature, HOME_TILES, type HomeTile, type ListingFeature } from '@hp/shared';
import { Car, ClipboardList, LayoutGrid, type LucideIcon, Trophy } from 'lucide-react';
import { LISTING_FEATURE_CONFIGS } from '@/features/listing/features';

export type ServiceVisual = {
  Icon: LucideIcon;
  /** Nền nhạt (ô icon, banner tone dịch vụ). */
  soft: string;
  /** Màu icon / chữ đậm của dịch vụ. */
  fg: string;
  /** Chấm màu đặc (chip "Tìm nhanh"). */
  dot: string;
};

const LISTING_DOT: Record<ListingFeature, string> = {
  pass: 'bg-service-pass',
  room: 'bg-service-room',
  job: 'bg-service-job',
  lostFound: 'bg-service-lost-found',
};

const listingVisual = (feature: ListingFeature): ServiceVisual => {
  const c = LISTING_FEATURE_CONFIGS[feature];
  return { Icon: c.Icon, soft: c.tone.soft, fg: c.tone.fg, dot: LISTING_DOT[feature] };
};

export const SERVICE_VISUALS: Record<Feature, ServiceVisual> = {
  pass: listingVisual('pass'),
  room: listingVisual('room'),
  job: listingVisual('job'),
  lostFound: listingVisual('lostFound'),
  ride: { Icon: Car, soft: 'bg-service-ride-soft', fg: 'text-service-ride', dot: 'bg-service-ride' },
  sport: { Icon: Trophy, soft: 'bg-service-sport-soft', fg: 'text-service-sport', dot: 'bg-service-sport' },
};

/** Đường dẫn web của 6 dịch vụ. Ghép xe / ghép trận: trang "Sắp có" giữ đúng URL đã chốt (không 404). */
const SERVICE_PATHS: Record<Feature, string> = {
  pass: LISTING_FEATURE_CONFIGS.pass.path,
  room: LISTING_FEATURE_CONFIGS.room.path,
  job: LISTING_FEATURE_CONFIGS.job.path,
  lostFound: LISTING_FEATURE_CONFIGS.lostFound.path,
  ride: '/ghep-xe',
  sport: '/ghep-tran',
};

export type TileView = {
  id: HomeTile['id'];
  /** Khoá i18n đầy đủ của nhãn. */
  labelKey: string;
  href: string;
  Icon: LucideIcon;
  soft: string;
  fg: string;
  soon: boolean;
  isNew: boolean;
};

const UTILITY: Record<Extract<HomeTile, { kind: 'utility' }>['id'], { Icon: LucideIcon; href: string }> = {
  // Khách: proxy.ts chuyển sang /dang-nhap?next=/toi/tin-cua-toi → đăng nhập xong vào thẳng Tin của tôi.
  my_listings: { Icon: ClipboardList, href: '/toi/tin-cua-toi' },
  all: { Icon: LayoutGrid, href: '/tin' },
};

/** 8 ô lưới dịch vụ theo HOME_TILES (thứ tự cố định). Ô tiện ích: nền primary-light, icon primary. */
export const HOME_TILE_VIEWS: readonly TileView[] = HOME_TILES.map((tile) => {
  if (tile.kind === 'service') {
    const v = SERVICE_VISUALS[tile.id];
    return {
      id: tile.id,
      labelKey: `common.feature.${tile.id}`,
      href: SERVICE_PATHS[tile.id],
      Icon: v.Icon,
      soft: v.soft,
      fg: v.fg,
      soon: tile.soon ?? false,
      isNew: tile.isNew ?? false,
    };
  }
  const u = UTILITY[tile.id];
  return {
    id: tile.id,
    labelKey: `common.home.tiles.${tile.id}`,
    href: u.href,
    Icon: u.Icon,
    soft: 'bg-primary-light',
    fg: 'text-primary',
    soon: false,
    isNew: tile.isNew ?? false,
  };
});

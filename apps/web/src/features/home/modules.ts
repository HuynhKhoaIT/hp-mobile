// Lưới module của trang chủ kiểu super app. Thêm module = thêm một dòng ở đây (icon + màu + đường dẫn + chữ).
// Dịch vụ: 4 tính năng Listing (config ở features/<x>/config.ts) + 2 tính năng Group (tuần 7–8, chưa có trang).
// Tiện ích: lối tắt tới các trang của người dùng. `href: null` = sắp có (hiện nhãn, không bấm được).
import { LISTING_FEATURES, type Feature } from '@hp/shared';
import {
  Bell,
  Bookmark,
  Car,
  ClipboardList,
  type LucideIcon,
  MessageCircle,
  Plus,
  Search,
  Trophy,
} from 'lucide-react';
import { LISTING_FEATURE_CONFIGS, LISTING_FEATURE_ORDER } from '@/features/listing/features';

export type HomeModule = {
  id: string;
  /** Khoá i18n đầy đủ (namespace.key). */
  labelKey: string;
  Icon: LucideIcon;
  /** Class đầy đủ để Tailwind quét được: nền ô + màu icon. */
  tone: { soft: string; fg: string };
  href: string | null;
};

const GROUP_SERVICES: { feature: Extract<Feature, 'ride' | 'sport'>; Icon: LucideIcon; tone: HomeModule['tone'] }[] = [
  { feature: 'ride', Icon: Car, tone: { soft: 'bg-service-ride-soft', fg: 'text-service-ride' } },
  { feature: 'sport', Icon: Trophy, tone: { soft: 'bg-service-sport-soft', fg: 'text-service-sport' } },
];

export const SERVICE_MODULES: readonly HomeModule[] = [
  ...LISTING_FEATURE_ORDER.map((feature) => {
    const c = LISTING_FEATURE_CONFIGS[feature];
    return { id: feature, labelKey: `common.feature.${feature}`, Icon: c.Icon, tone: c.tone, href: c.path };
  }),
  ...GROUP_SERVICES.map((g) => ({ id: g.feature, labelKey: `common.feature.${g.feature}`, Icon: g.Icon, tone: g.tone, href: null })),
];

const NEUTRAL = { soft: 'bg-primary-light', fg: 'text-primary' };

export const UTILITY_MODULES: readonly HomeModule[] = [
  { id: 'post', labelKey: 'common.actions.post', Icon: Plus, tone: { soft: 'bg-accent', fg: 'text-on-accent' }, href: '/dang-tin' },
  { id: 'mine', labelKey: 'listing.manage.title', Icon: ClipboardList, tone: NEUTRAL, href: '/toi/tin-cua-toi' },
  { id: 'saved', labelKey: 'listing.saved.title', Icon: Bookmark, tone: NEUTRAL, href: '/toi/da-luu' },
  { id: 'search', labelKey: 'listing.list.search_submit', Icon: Search, tone: NEUTRAL, href: '/tim-kiem' },
  { id: 'messages', labelKey: 'common.nav.messages', Icon: MessageCircle, tone: NEUTRAL, href: null },
  { id: 'notifications', labelKey: 'common.nav.notifications', Icon: Bell, tone: NEUTRAL, href: null },
];

/** Dải tin trượt ngang trên trang chủ: mỗi tính năng Listing một dải. */
export const HOME_RAILS = LISTING_FEATURE_ORDER.map((feature) => ({
  feature,
  categories: LISTING_FEATURES[feature],
  config: LISTING_FEATURE_CONFIGS[feature],
}));

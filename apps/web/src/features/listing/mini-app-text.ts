// Chữ riêng theo tính năng cho các trang con dùng chung của mini-app (Đã lưu, Quản lý tin, Bộ lọc). Khớp useMiniT của app
// (apps/mobile/src/features/listing/miniApp.ts): có khoá `listing.mini_app.<slug>.<khối>.<khoá>` (vd Nhà trọ "Đã cho thuê",
// Tìm việc "Đang tuyển") thì dùng, không thì khoá chung `listing.mini_app.<khối>.<khoá>`. `slug` khớp tham số route của app
// (lostFound → lost-found) để một bộ chữ i18n phục vụ cả hai nền.
import type { ListingFeature } from '@hp/shared';

/** Phần của hàm dịch next-intl mà helper cần (client `useTranslations()` và server `getTranslations()` đều khớp). */
type Translator = {
  (key: string, values?: Record<string, string | number>): string;
  has: (key: string) => boolean;
};

const SLUG: Record<ListingFeature, string> = { pass: 'pass', room: 'room', job: 'job', lostFound: 'lost-found' };

/** `mt('manage.tab_active')` → chữ riêng của tính năng nếu có, không thì chữ chung của mini-app. */
export function miniAppText(t: Translator, feature: ListingFeature) {
  return (key: string, values?: Record<string, string | number>): string => {
    const own = `listing.mini_app.${SLUG[feature]}.${key}`;
    return t.has(own) ? t(own, values) : t(`listing.mini_app.${key}`, values);
  };
}

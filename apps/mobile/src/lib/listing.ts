// Chữ hiển thị của tin dùng chung card và chi tiết: giá (priceLabel của @hp/shared) và dòng khu vực.
// Quy tắc (cái gì hiện) ở @hp/shared để khớp web; ở đây chỉ dịch + định dạng theo ngôn ngữ đang dùng.
import type { PublicListing } from '@hp/core';
import { type ListingStatus, type PriceLabel, type PricePer, priceLabel } from '@hp/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { BadgeTone } from '@/ui';
import { formatDistance, formatMoney } from './format';

const PER_KEY: Record<PricePer, string> = {
  month: 'listing:card.per_month',
  hour: 'listing:card.per_hour',
  day: 'listing:card.per_day',
};

type PriceSource = Pick<PublicListing, 'category' | 'price' | 'price_type' | 'attributes'>;
type SiteSource = Pick<PublicListing, 'site_name' | 'distance_to_site_m'>;

/** Tin → chữ giá: "Miễn phí" / "Thoả thuận" / "1.500.000 ₫" / "1.500.000 ₫/tháng" / "Từ 8.000.000 ₫/tháng". */
export function usePriceText() {
  const { t } = useTranslation();
  return useCallback(
    (listing: PriceSource) => {
      const label: PriceLabel = priceLabel(listing);
      if (label.type === 'free') return t('common:price.free');
      if (label.type === 'negotiable') return t('common:price.negotiable');
      const amount =
        label.type === 'money'
          ? formatMoney(label.amount)
          : label.max === null
            ? t('listing:card.salary_from', { min: formatMoney(label.min) })
            : t('listing:card.salary_range', { min: formatMoney(label.min), max: formatMoney(label.max) });
      return label.per ? t(PER_KEY[label.per], { price: amount }) : amount;
    },
    [t],
  );
}

/** Dòng khu vực: "Cách Khu A 1,2 km" khi có khoảng cách, chỉ tên khu khi không; null khi tin không gắn khu. */
export function useSiteText() {
  const { t } = useTranslation();
  return useCallback(
    (listing: SiteSource) => {
      if (!listing.site_name) return null;
      if (listing.distance_to_site_m === null) return listing.site_name;
      return t('listing:card.distance_to_site', {
        site: listing.site_name,
        distance: formatDistance(listing.distance_to_site_m),
      });
    },
    [t],
  );
}

/**
 * Tone badge trạng thái tin (Tin của tôi, chi tiết) — luôn kèm chữ `common:status.<status>`. Khớp web:
 * đang đăng success · chờ duyệt warning · bị từ chối danger · đã bán primary · nháp / đã đóng / hết hạn neutral.
 */
export const LISTING_STATUS_TONE: Record<ListingStatus, BadgeTone> = {
  active: 'success',
  pending_review: 'warning',
  rejected: 'danger',
  sold: 'primary',
  draft: 'neutral',
  closed: 'neutral',
  expired: 'neutral',
};

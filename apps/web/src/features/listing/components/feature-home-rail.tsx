'use client';

// Một dải tin của trang chủ mini tính năng (config.home.rails — Pass đồ: "Gần {khu}", "Cho tặng miễn phí", "{danh mục} mới
// đăng"). Dùng ListingRail của trang chủ (cuộn ngang, "Xem tất cả", skeleton / lỗi + Thử lại). Dữ liệu server render sẵn
// (`initial`); server lỗi → tải lại ở trình duyệt bằng searchListings (@hp/core) với đúng bộ lọc homeRailQuery. Rỗng → ẩn dải.
// Icon / chữ tính ở client (component lucide không đi qua props từ Server Component).
import { searchListings, type Site } from '@hp/core';
import type { ListingFeature } from '@hp/shared';
import { Gift, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { ListingRail } from '@/features/home/components/listing-rail';
import type { RailData } from '@/features/home/types';
import { useLoadable } from '@/features/home/use-loadable';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ListingHomeRail } from '../feature-config';
import { homeRailHref, homeRailQuery } from '../feature-home';
import { LISTING_FEATURE_CONFIGS } from '../features';

export function FeatureHomeRail({
  feature,
  rail,
  site,
  initial,
  priorityCount = 0,
}: {
  feature: ListingFeature;
  rail: ListingHomeRail;
  /** Khu mặc định cho dải "Gần {khu}" (null = không đọc được danh mục khu → mọi khu). */
  site: Pick<Site, 'code' | 'name'> | null;
  initial: RailData | null;
  priorityCount?: number;
}) {
  const t = useTranslations();
  const cfg = LISTING_FEATURE_CONFIGS[feature];
  const siteCode = site?.code ?? null;
  const key = `feature-rail:${feature}:${rail.key}:${siteCode ?? '*'}`;

  const load = useCallback(async () => {
    const q = homeRailQuery(LISTING_FEATURE_CONFIGS[feature], rail, siteCode);
    const res = await searchListings(createBrowserClient(), {
      categories: [...q.categories],
      site: q.site ?? undefined,
      freeOnly: q.freeOnly,
      limit: q.size,
    });
    return res.error ? res : { data: { items: res.data.items, now: Date.now() }, error: null };
  }, [feature, rail, siteCode]);
  const [state, retry] = useLoadable<RailData>(key, load, initial ? { key, data: initial } : null);

  const seeAll = homeRailHref(cfg, rail, siteCode);
  const tone = { iconBox: cfg.tone.soft, iconFg: cfg.tone.fg };

  if (rail.kind === 'near') {
    return (
      <ListingRail
        id={`${feature}-${rail.key}`}
        title={site ? t('listing.feature_home.near_title', { site: site.name }) : t('listing.feature_home.near_title_any')}
        Icon={MapPin}
        iconBox="bg-primary-light"
        iconFg="text-primary"
        seeAll={seeAll}
        state={state}
        onRetry={retry}
        priorityCount={priorityCount}
      />
    );
  }
  if (rail.kind === 'free') {
    return (
      <ListingRail
        id={`${feature}-${rail.key}`}
        title={t('listing.feature_home.free_title')}
        subtitle={t('listing.feature_home.free_subtitle')}
        Icon={Gift}
        {...tone}
        seeAll={seeAll}
        state={state}
        onRetry={retry}
        priorityCount={priorityCount}
      />
    );
  }
  return (
    <ListingRail
      id={`${feature}-${rail.key}`}
      title={t('listing.feature_home.rail_category', { category: t(`listing.category_short.${rail.category}`) })}
      Icon={cfg.categoryIcons?.[rail.category] ?? cfg.Icon}
      {...tone}
      seeAll={seeAll}
      state={state}
      onRetry={retry}
      priorityCount={priorityCount}
    />
  );
}

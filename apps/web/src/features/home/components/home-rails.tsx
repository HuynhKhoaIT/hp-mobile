'use client';

// Ba loại dải tin của trang chủ (docs/design/home.md §4.7, §4.8):
// - "Gần {khu}": luôn hiện (khu mặc định cho khách), 10 tin mọi tính năng; rỗng → thẻ mời đăng tin.
// - "Dành cho bạn": chỉ khi đã đăng nhập và có mối quan tâm thuộc tính năng Listing; bỏ tin đã có ở "Gần bạn"; rỗng → ẩn.
// - Theo dịch vụ (Pass đồ, Tìm trọ, Tìm việc, Đồ thất lạc): 8 tin mới nhất, server render sẵn; rỗng → ẩn.
import { searchListings } from '@hp/core';
import { HOME_RAIL_SIZE, LISTING_FEATURES, type ListingCategory, type ListingFeature } from '@hp/shared';
import { MapPin, Plus, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { LISTING_FEATURE_CONFIGS } from '@/features/listing/features';
import { Link } from '@/i18n/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { SERVICE_VISUALS } from '../services';
import type { RailData } from '../types';
import { useLoadable } from '../use-loadable';
import { useHome } from './home-context';
import { ListingRail } from './listing-rail';

export function NearRail() {
  const t = useTranslations();
  const { site, near, retryNear } = useHome();
  return (
    <ListingRail
      id="near"
      title={site ? t('common.home.near_title', { site: site.name }) : t('common.home.latest_title')}
      Icon={MapPin}
      iconBox="bg-primary-light"
      iconFg="text-primary"
      seeAll={site ? { pathname: '/tin', query: { site: site.code } } : '/tin'}
      state={near}
      onRetry={retryNear}
      priorityCount={4}
      empty={
        <div className="flex flex-col items-start gap-3 rounded-lg bg-surface p-4 shadow-card sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-md font-semibold text-fg">{t('common.home.empty_title')}</p>
            <p className="text-sm text-muted">{t('common.home.empty_body')}</p>
          </div>
          <Button asChild variant="accent">
            <Link href="/dang-tin">
              <Plus aria-hidden strokeWidth={2} />
              {t('common.actions.post')}
            </Link>
          </Button>
        </div>
      }
    />
  );
}

const isListingFeature = (f: string): f is ListingFeature => f in LISTING_FEATURES;

export function ForYouRail() {
  const t = useTranslations('common.home');
  const { viewer, near } = useHome();
  const features = viewer.status === 'user' ? (viewer.profile?.interests ?? []).filter(isListingFeature) : [];
  const categories: ListingCategory[] = features.flatMap((f) => [...LISTING_FEATURES[f]]);
  const key = viewer.status === 'user' && categories.length > 0 ? `foryou:${viewer.id}:${categories.join(',')}` : null;
  const categoriesKey = categories.join(',');

  const load = useCallback(async () => {
    const res = await searchListings(createBrowserClient(), {
      categories: categoriesKey.split(',') as ListingCategory[],
      limit: HOME_RAIL_SIZE.forYou + HOME_RAIL_SIZE.near,
    });
    return res.error ? res : { data: { items: res.data.items, now: Date.now() }, error: null };
  }, [categoriesKey]);
  const [state, retry] = useLoadable<RailData>(key, load);

  // Bỏ tin đã có ở "Gần bạn" (lọc khi hiển thị — không phải đợi dải kia tải xong).
  const shown = useMemo(() => {
    if (state.status !== 'ready') return state;
    const seen = new Set(near.status === 'ready' ? near.data.items.map((l) => l.id) : []);
    return {
      status: 'ready' as const,
      data: { ...state.data, items: state.data.items.filter((l) => !seen.has(l.id)).slice(0, HOME_RAIL_SIZE.forYou) },
    };
  }, [state, near]);

  const only = features.length === 1 ? features[0] : undefined;
  return (
    <ListingRail
      id="for-you"
      title={t('for_you_title')}
      subtitle={t('for_you_hint')}
      Icon={Sparkles}
      iconBox="bg-accent/15"
      iconFg="text-accent"
      seeAll={only ? LISTING_FEATURE_CONFIGS[only].path : '/tin'}
      state={shown}
      onRetry={retry}
    />
  );
}

export function FeatureRail({ feature, initial }: { feature: ListingFeature; initial: RailData | null }) {
  const t = useTranslations('common.feature');
  const cfg = LISTING_FEATURE_CONFIGS[feature];
  const v = SERVICE_VISUALS[feature];
  const load = useCallback(async () => {
    const res = await searchListings(createBrowserClient(), { categories: [...LISTING_FEATURES[feature]], limit: HOME_RAIL_SIZE.feature });
    return res.error ? res : { data: { items: res.data.items, now: Date.now() }, error: null };
  }, [feature]);
  const [state, retry] = useLoadable<RailData>(`rail:${feature}`, load, initial ? { key: `rail:${feature}`, data: initial } : null);

  return (
    <ListingRail
      id={feature}
      title={t(feature)}
      Icon={v.Icon}
      iconBox={v.soft}
      iconFg={v.fg}
      seeAll={cfg.path}
      state={state}
      onRetry={retry}
    />
  );
}

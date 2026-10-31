// Trang chủ (Hub) kiểu super app — docs/design/home.md (thứ tự khối §3, thông số §10). Cùng thứ tự, chữ, dữ liệu với
// Hub của app (apps/mobile/app/(tabs)/index.tsx).
// Render (§5): Server Component không đọc cookie / searchParams → prerender tĩnh. Phần công khai (lưới, chip, banner, dải
// theo dịch vụ, dải "Gần {khu}" của khu mặc định, số liệu) render server + cache 300s (tag `listings` / `banners`; số liệu
// 1 giờ) nên HTML có tin thật kể cả khi tắt JS. Phần theo người dùng (lời chào, ảnh, chuông, khu đã chọn, thẻ cá nhân,
// "Dành cho bạn") đọc ở trình duyệt sau khi biết phiên (HomeProvider) — có skeleton, không làm trang thành dynamic.
// Header: điện thoại dùng header xanh của trang này (AppHeader ẩn ở "/"); từ 640px giữ AppHeader + dải chào (hub-header.tsx).
import { APP_NAME, type ListingFeature } from '@hp/shared';
import { Inbox, Plus } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { LISTING_FEATURE_ORDER } from '@/features/listing/features';
import { getPublicSites } from '@/features/listing/queries';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { getFeatureRail, getHomeBanners, getHomeStats, getNearRail } from '../queries';
import type { RailData } from '../types';
import { BannerCarousel } from './banner-carousel';
import { CommunitySection } from './community-section';
import { HomeProvider } from './home-context';
import { FeatureRail, ForYouRail, NearRail } from './home-rails';
import { HubHeader } from './hub-header';
import { HubSearch } from './hub-search';
import { PersonalCard } from './personal-card';
import { QuickSearch } from './quick-search';
import { ServiceGrid } from './service-grid';

export async function HomePage() {
  const t = await getTranslations();
  const locale = asLocale(await getLocale());
  const sites = await getPublicSites();
  const defaultSite = sites[0]?.code ?? null;

  const [banners, stats, near, featureRails] = await Promise.all([
    getHomeBanners(locale),
    getHomeStats(),
    defaultSite ? getNearRail(defaultSite) : Promise.resolve(null),
    Promise.all(
      LISTING_FEATURE_ORDER.map(async (feature): Promise<{ feature: ListingFeature; data: RailData | null }> => ({
        feature,
        data: await getFeatureRail(feature),
      })),
    ),
  ]);
  // Cả cộng đồng chưa có tin nào (đọc thành công, mọi dải rỗng) → một EmptyState thay cho chip + các dải.
  const noListings = featureRails.every((r) => r.data !== null && r.data.items.length === 0);
  const hasBanners = banners === null || banners.length > 0;

  return (
    <HomeProvider sites={sites} initialNear={defaultSite && near ? { site: defaultSite, data: near } : null}>
      <div className="flex flex-col">
        <h1 className="sr-only">{t('web.home.heading', { appName: APP_NAME })}</h1>
        <HubHeader />
        <HubSearch />
        {/* Phần đáy dải xanh (pb-16 của header) — lưới dịch vụ nổi đè lên 48px. */}
        <div aria-hidden className="h-13 rounded-b-xl bg-primary sm:h-16" />

        <div className="relative mx-auto -mt-12 flex w-full max-w-6xl flex-col gap-6 px-4 pb-6 sm:pb-10">
          <ServiceGrid />

          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:items-stretch">
            {hasBanners ? <BannerCarousel initial={banners} className="lg:col-span-2" /> : null}
            <PersonalCard className={cn(hasBanners ? 'lg:col-span-1' : 'lg:col-span-3')} />
          </div>

          {noListings ? (
            <EmptyState
              icon={Inbox}
              title={t('common.home.empty_title')}
              description={t('common.home.empty_body')}
              action={
                <Button asChild variant="accent">
                  <Link href="/dang-tin">
                    <Plus aria-hidden strokeWidth={2} />
                    {t('common.actions.post')}
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              <QuickSearch />
              <NearRail />
              <ForYouRail />
              {featureRails.map((r) => (
                <FeatureRail key={r.feature} feature={r.feature} initial={r.data} />
              ))}
            </>
          )}

          <CommunitySection stats={stats} />
        </div>
      </div>
    </HomeProvider>
  );
}

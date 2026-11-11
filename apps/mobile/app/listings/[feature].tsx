// Screen type: List
// Danh sách tin của một tính năng Listing (pass | room | job | lost-found) hoặc mọi tin (all) — một màn cho cả 4,
// khác nhau chỉ ở config.ts (quy tắc vàng; style Stitch: header xanh + ô tìm, chip lọc, lọc nhanh theo thông số, mẹo an
// toàn, thẻ theo điểm nhấn của tính năng). `?site=` đặt sẵn khu (Hub → Xem tất cả); `?shortcut=` (chip "Tìm nhanh") hoặc
// `?categories=a,b` ("Dành cho bạn") đặt sẵn bộ lọc (chip bỏ được). Nút Đăng → chọn danh mục của tính năng.
// Tính năng có config.home (Pass đồ) → trang chủ riêng (FeatureHome: danh mục, banner, dải tin "Gần {khu của Hub}"…) trên
// "Tất cả tin …" khi chưa lọc.
import { Redirect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { configOfCategory, LISTING_CONFIGS_BY_SLUG } from '@/features/configs';
import { ListingBrowser } from '@/features/listing/components/ListingBrowser';
import { useHomeSite } from '@/features/home/hooks';
import { FeatureHome } from '@/features/listing/components/FeatureHome';
import { useListingPreset, usePostListing } from '@/features/listing/hooks';
import { backOrHome } from '@/features/listing/navigation';
import { Fab, Screen, useScheme } from '@/ui';

export default function ListingListRoute() {
  const { t } = useTranslation('listing');
  const focused = useIsFocused();
  const scheme = useScheme();
  const { feature, site, shortcut, categories } = useLocalSearchParams<{
    feature: string;
    site?: string;
    shortcut?: string;
    categories?: string;
  }>();
  const config = LISTING_CONFIGS_BY_SLUG[feature ?? ''];
  const post = usePostListing(config?.key);
  const preset = useListingPreset({ shortcut, categories });
  // Khu đang chọn của Hub → dải "Gần {khu}" của trang chủ riêng (cùng nguồn với Hub).
  const homeSite = useHomeSite();
  if (!config) return <Redirect href="/" />;

  return (
    <Screen>
      {/* key: đổi tính năng / khu / bộ lọc đặt sẵn → state bộ lọc mới. */}
      <ListingBrowser
        key={`${config.slug}:${site ?? ''}:${shortcut ?? ''}:${categories ?? ''}`}
        config={config}
        configOf={config.key === 'all' ? configOfCategory : undefined}
        onBack={backOrHome}
        initialSite={site}
        initialPreset={preset}
        header={
          config.home
            ? (api) => (
                <FeatureHome
                  config={config}
                  browser={api}
                  site={homeSite.site}
                  siteLoading={homeSite.isLoading}
                  active={focused}
                />
              )
            : undefined
        }
      />
      <Fab label={t('list.post_cta')} icon={Plus} onPress={post} />
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}

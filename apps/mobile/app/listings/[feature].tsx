// Screen type: List
// Danh sách tin của một tính năng Listing (pass | room | job | lost-found) hoặc mọi tin (all) — một màn cho cả 4,
// khác nhau chỉ ở config.ts (quy tắc vàng). `?site=` đặt sẵn khu (Hub → Xem tất cả); `?shortcut=` (chip "Tìm nhanh") hoặc
// `?categories=a,b` ("Dành cho bạn") đặt sẵn bộ lọc (chip bỏ được). Nút Đăng → chọn danh mục của tính năng.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { LISTING_CONFIGS_BY_SLUG } from '@/features/configs';
import { ListingBrowser } from '@/features/listing/components/ListingBrowser';
import { useListingPreset, usePostListing } from '@/features/listing/hooks';
import { Fab, Header, Screen } from '@/ui';

export default function ListingListRoute() {
  const { t } = useTranslation('listing');
  const { feature, site, shortcut, categories } = useLocalSearchParams<{
    feature: string;
    site?: string;
    shortcut?: string;
    categories?: string;
  }>();
  const config = LISTING_CONFIGS_BY_SLUG[feature ?? ''];
  const post = usePostListing(config?.key);
  const preset = useListingPreset({ shortcut, categories });
  if (!config) return <Redirect href="/" />;

  return (
    <Screen>
      <Header title={t(config.titleKey)} />
      {/* key: đổi tính năng / khu / bộ lọc đặt sẵn → state bộ lọc mới. */}
      <ListingBrowser
        key={`${config.slug}:${site ?? ''}:${shortcut ?? ''}:${categories ?? ''}`}
        config={config}
        initialSite={site}
        initialPreset={preset}
      />
      <Fab label={t('list.post_cta')} icon={Plus} onPress={post} />
    </Screen>
  );
}

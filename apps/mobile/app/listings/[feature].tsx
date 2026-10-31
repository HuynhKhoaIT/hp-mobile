// Screen type: List
// Danh sách tin của một tính năng Listing (pass | room | job | lost-found) hoặc mọi tin (all) — một màn cho cả 4,
// khác nhau chỉ ở config.ts (quy tắc vàng). `?site=` đặt sẵn khu (Hub → Xem tất cả). Nút Đăng → chọn danh mục của tính năng.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { LISTING_CONFIGS_BY_SLUG } from '@/features/configs';
import { ListingBrowser } from '@/features/listing/components/ListingBrowser';
import { usePostListing } from '@/features/listing/hooks';
import { Fab, Header, Screen } from '@/ui';

export default function ListingListRoute() {
  const { t } = useTranslation('listing');
  const { feature, site } = useLocalSearchParams<{ feature: string; site?: string }>();
  const config = LISTING_CONFIGS_BY_SLUG[feature ?? ''];
  const post = usePostListing(config?.key);
  if (!config) return <Redirect href="/" />;

  return (
    <Screen>
      <Header title={t(config.titleKey)} />
      {/* key: đổi tính năng / khu ban đầu → state bộ lọc mới. */}
      <ListingBrowser key={`${config.slug}:${site ?? ''}`} config={config} initialSite={site} />
      <Fab label={t('list.post_cta')} icon={Plus} onPress={post} />
    </Screen>
  );
}

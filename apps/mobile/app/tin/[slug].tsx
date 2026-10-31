// Screen type: Detail
// Universal / App Link `https://tenapp.vn/tin/{slug}` → chi tiết tin (cùng nội dung với listing/[id]).
// Resolve theo slug qua get_listing_by_slug (short_id ở cuối slug); không còn / sai link → "Tin không còn".
import { useListingBySlug } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ListingDetailState } from '@/features/listing/components/ListingDetail';
import { ListingHeaderActions } from '@/features/listing/components/ListingHeaderActions';
import { backOrHome } from '@/features/listing/navigation';
import { Header, Screen } from '@/ui';

export default function ListingBySlugScreen() {
  const { t } = useTranslation('listing');
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useListingBySlug(slug);
  const listing = query.data;

  return (
    <Screen>
      {/* Mở từ link khi app chưa chạy → không có màn trước: nút quay lại về trang chủ. */}
      <Header
        title={t('detail.title')}
        back
        onBack={backOrHome}
        right={listing ? <ListingHeaderActions listing={listing} /> : undefined}
      />
      <ListingDetailState query={query} />
    </Screen>
  );
}

// Screen type: Detail
// Chi tiết tin theo id — điều hướng nội bộ (card, tin tương tự) và push `listing_*` (tuần 6).
// Mở ngay bằng dữ liệu tạm từ cache danh sách (useListing), rồi làm mới từ public_listings.
import { useListing } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ListingDetailState } from '@/features/listing/components/ListingDetail';
import { ListingHeaderActions } from '@/features/listing/components/ListingHeaderActions';
import { backOrHome } from '@/features/listing/navigation';
import { Header, Screen } from '@/ui';

export default function ListingDetailScreen() {
  const { t } = useTranslation('listing');
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useListing(id);
  const listing = query.data;

  return (
    <Screen>
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

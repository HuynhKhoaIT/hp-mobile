// Screen type: Detail
// Chi tiết tin theo id — điều hướng nội bộ (card, tin tương tự) và push `listing_*` (tuần 6).
// Mở ngay bằng dữ liệu tạm từ cache danh sách (useListing), rồi làm mới từ public_listings.
// `?mini=<slug>`: mở từ mini-app (Quản lý tin) → nút của chủ tin (Sửa tin, Tin của tôi) ở lại mini-app.
import { useListing } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { configOfCategory } from '@/features/configs';
import { ListingDetailState } from '@/features/listing/components/ListingDetail';
import { ListingHeaderActions } from '@/features/listing/components/ListingHeaderActions';
import { backOrHome, isMiniSlug } from '@/features/listing/navigation';
import { Header, Screen } from '@/ui';

export default function ListingDetailScreen() {
  const { t } = useTranslation('listing');
  const { id, mini } = useLocalSearchParams<{ id: string; mini?: string }>();
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
      <ListingDetailState query={query} configOf={configOfCategory} mini={isMiniSlug(mini) ? mini : undefined} />
    </Screen>
  );
}

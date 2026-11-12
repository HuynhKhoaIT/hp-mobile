// Screen type: Detail
// Chi tiết tin theo id — điều hướng nội bộ (card, tin tương tự) và push `listing_*` (tuần 6).
// Mở ngay bằng dữ liệu tạm từ cache danh sách (useListing), rồi làm mới từ public_listings.
// `?mini=<slug>`: mở từ mini-app (trang chủ, Đã lưu, Quản lý tin, chat) → màu mini-app; nút của chủ tin (Sửa tin, Tin của tôi)
// và Nhắn tin ở lại mini-app. Tiêu đề header theo config.detail.titleKey của tính năng (vd "Chi tiết phòng trọ").
import { useListing } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { configOfCategory, miniThemeOf } from '@/features/configs';
import { ListingDetailState } from '@/features/listing/components/ListingDetail';
import { ListingHeaderActions } from '@/features/listing/components/ListingHeaderActions';
import { backOrHome, isMiniSlug } from '@/features/listing/navigation';
import { AppThemeProvider, Header, Screen } from '@/ui';

function ListingDetailScreenBody() {
  const { t } = useTranslation('listing');
  const { id, mini } = useLocalSearchParams<{ id: string; mini?: string }>();
  const query = useListing(id);
  const listing = query.data;

  return (
    <Screen>
      <Header
        title={t(listing ? (configOfCategory(listing.category).detail?.titleKey ?? 'detail.title') : 'detail.title')}
        back
        onBack={backOrHome}
        right={listing ? <ListingHeaderActions listing={listing} /> : undefined}
      />
      <ListingDetailState query={query} configOf={configOfCategory} mini={isMiniSlug(mini) ? mini : undefined} />
    </Screen>
  );
}

/** Mở từ mini-app (`?mini=<slug>`) → giữ màu của mini-app (AppThemeProvider); ngoài mini-app không bọc gì. */
export default function ListingDetailScreen() {
  const { mini } = useLocalSearchParams<{ mini?: string }>();
  return (
    <AppThemeProvider theme={miniThemeOf(mini)}>
      <ListingDetailScreenBody />
    </AppThemeProvider>
  );
}

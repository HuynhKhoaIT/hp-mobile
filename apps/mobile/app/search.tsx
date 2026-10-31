// Screen type: List
// Tìm kiếm mọi tin (mở từ ô tìm kiếm ở Hub, `?q=` đặt sẵn từ khoá): bàn phím mở sẵn, lọc danh mục + khu, cuộn vô hạn.
// Khách xem / tìm được, không cần đăng nhập. Tìm có từ khoá → log_search + event `search`.
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { allListingsConfig } from '@/features/listing/config';
import { ListingBrowser } from '@/features/listing/components/ListingBrowser';
import { backOrHome } from '@/features/listing/navigation';
import { Header, Screen } from '@/ui';

export default function SearchScreen() {
  const { t } = useTranslation();
  const { q } = useLocalSearchParams<{ q?: string }>();
  return (
    <Screen>
      <Header title={t('nav.search')} back onBack={backOrHome} />
      <ListingBrowser config={allListingsConfig} initialQuery={q} autoFocus={!q} />
    </Screen>
  );
}

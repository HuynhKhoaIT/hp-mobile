// Screen type: List
// Tìm kiếm mọi tin (mở từ ô tìm kiếm ở Hub, `?q=` đặt sẵn từ khoá): header xanh + ô tìm (bàn phím mở sẵn), lọc danh mục +
// khu, cuộn vô hạn; thẻ lấy điểm nhấn theo tính năng của tin. Khách xem / tìm được, không cần đăng nhập. Tìm có từ khoá →
// log_search + event `search`.
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { configOfCategory } from '@/features/configs';
import { allListingsConfig } from '@/features/listing/config';
import { ListingBrowser } from '@/features/listing/components/ListingBrowser';
import { backOrHome } from '@/features/listing/navigation';
import { Screen, useScheme } from '@/ui';

export default function SearchScreen() {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const scheme = useScheme();
  const { q } = useLocalSearchParams<{ q?: string }>();
  return (
    <Screen>
      <ListingBrowser
        config={allListingsConfig}
        configOf={configOfCategory}
        title={t('nav.search')}
        onBack={backOrHome}
        initialQuery={q}
        autoFocus={!q}
      />
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}

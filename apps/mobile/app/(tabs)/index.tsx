// Screen type: Hub
// Trang chủ (docs/design/home.md): header xanh (chào + chip khu + chuông / Đăng nhập) → ô tìm kiếm dính trên cùng khi
// cuộn → lưới 8 dịch vụ nổi đè đáy header → banner trượt → thẻ cá nhân → Tìm nhanh → Gần {khu} / Dành cho bạn / dải
// theo dịch vụ → cộng đồng + an toàn + miễn trừ. Mỗi khối tự có khung chờ / lỗi riêng; kéo xuống làm mới mọi khối;
// mở app đọc cache MMKV trước rồi làm mới. Header thu gọn theo cuộn (Reduce Motion: chỉ mờ).
import { StatusBar } from 'expo-status-bar';
import { Link, useIsFocused } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { HomeBanners } from '@/features/home/components/HomeBanners';
import { HomeFooter } from '@/features/home/components/HomeFooter';
import { HomeListings } from '@/features/home/components/HomeListings';
import { HomeServices } from '@/features/home/components/HomeServices';
import { HomeTopBar } from '@/features/home/components/HomeTopBar';
import { PersonalCard } from '@/features/home/components/PersonalCard';
import { QuickSearch } from '@/features/home/components/QuickSearch';
import { useHomeRails, useHomeSite, useHomeViewEvent, useHubRefresh, useHubScroll } from '@/features/home/hooks';
import { openSearch } from '@/features/listing/navigation';
import { HomeHeaderCurve, HomeHeaderSearch, Screen, Text, useScheme } from '@/ui';

export default function HubScreen() {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const scheme = useScheme();
  const scroll = useHubScroll();
  const site = useHomeSite();
  const rails = useHomeRails(site.site?.code);
  const refresh = useHubRefresh(rails.refetchAll);
  useHomeViewEvent();

  return (
    <Screen
      scroll
      edgeToEdge
      tab
      statusBar="primary"
      onScroll={scroll.onScroll}
      stickyHeaderIndices={[1]}
      refreshing={refresh.refreshing}
      onRefresh={refresh.onRefresh}
    >
      <HomeTopBar scrollY={scroll.scrollY} site={site} />
      <HomeHeaderSearch placeholder={t('nav.search_placeholder')} onPress={openSearch} />
      <HomeHeaderCurve />

      <View className="-mt-12 gap-6">
        <HomeServices className="mx-4" />
        <HomeBanners active={focused} />
        <PersonalCard className="mx-4" />
        <QuickSearch />
        <HomeListings site={site} rails={rails} />
        <HomeFooter />
        {__DEV__ ? (
          <Link href="/ui-gallery" asChild>
            <Pressable accessibilityRole="link" className="min-h-12 items-center justify-center px-4">
              <Text variant="label" tone="primary">
                {t('dev.open_gallery')}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>

      {/* Header xanh: chữ / icon thanh trạng thái tương phản với primary (sáng → chữ trắng, tối → chữ tối). */}
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}

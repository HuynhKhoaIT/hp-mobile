// Screen type: List
// Tab "Quản lý tin" của mini-app (Stitch "Quản lý tin đăng"): hồ sơ + số liệu của tính năng, tab vòng đời có số, tìm / sắp
// tại chỗ, thẻ tin với thao tác theo tab. Khách → mời đăng nhập. `?tab=` (active | sold | pending | hidden): mở đúng tab khi
// quay về từ luồng đăng tin của mini-app (openMyListingsFrom); `?at=` (mốc giờ) đổi mỗi lần về → chuyển tab cả khi `tab`
// trùng lần trước.
import { FEATURE_LISTINGS_TABS, type FeatureListingsTab } from '@hp/core';
import { useLocalSearchParams } from 'expo-router';
import { MiniManage } from '@/features/listing/components/mini/MiniManage';
import { Screen } from '@/ui';

const isTab = (v: string | undefined): v is FeatureListingsTab => !!v && (FEATURE_LISTINGS_TABS as readonly string[]).includes(v);

export default function MiniManageScreen() {
  const { tab, at } = useLocalSearchParams<{ tab?: string; at?: string }>();
  return (
    <Screen tab statusBar="app">
      <MiniManage tab={isTab(tab) ? tab : undefined} requestKey={at} />
    </Screen>
  );
}

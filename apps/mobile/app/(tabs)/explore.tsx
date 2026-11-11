// Screen type: List
// Tab Khám phá (style Stitch "Khám phá & Bộ lọc tin đăng"): header xanh (tiêu đề + nút Tin đã lưu trong mờ + ô tìm kiếm)
// → chip lọc (khu, danh mục) → mọi tin cuộn vô hạn. Tuần 8: khi chưa tìm / lọc, đầu danh sách có dải nhóm sắp diễn ra
// (Ghép xe, Ghép trận — "Xem tất cả" mở danh sách nhóm), rồi tiêu đề "Tin mới đăng". Thẻ lấy điểm nhấn theo tính năng của tin.
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Heart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { configOfCategory, GROUP_CONFIGS } from '@/features/configs';
import { GroupRail } from '@/features/group/components/GroupRail';
import { ListingBrowser } from '@/features/listing/components/ListingBrowser';
import { allListingsConfig } from '@/features/listing/config';
import { openSavedListings } from '@/features/listing/navigation';
import { Col, IconButton, Screen, useScheme } from '@/ui';

export default function ExploreScreen() {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const scheme = useScheme();
  return (
    <Screen tab>
      <ListingBrowser
        config={allListingsConfig}
        configOf={configOfCategory}
        title={t('nav.explore')}
        heroRight={
          <IconButton icon={Heart} variant="glass" accessibilityLabel={t('listing:saved.title')} onPress={openSavedListings} />
        }
        header={
          <Col gap={5}>
            <GroupRail config={GROUP_CONFIGS.ride} />
            <GroupRail config={GROUP_CONFIGS.sport} />
          </Col>
        }
      />
      {/* Header xanh: chữ / icon thanh trạng thái tương phản với primary (sáng → chữ trắng, tối → chữ tối). */}
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}

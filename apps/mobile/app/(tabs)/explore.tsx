// Screen type: List
// Tab Khám phá: tìm + lọc mọi tin (danh mục, khu), cuộn vô hạn. Tuần 8: khi chưa tìm / lọc, đầu danh sách có dải nhóm
// sắp diễn ra (Ghép xe, Ghép trận — "Xem tất cả" mở danh sách nhóm), rồi tiêu đề "Tin mới đăng".
import { Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { GROUP_CONFIGS } from '@/features/configs';
import { GroupRail } from '@/features/group/components/GroupRail';
import { ListingBrowser } from '@/features/listing/components/ListingBrowser';
import { allListingsConfig } from '@/features/listing/config';
import { Col, Screen, SectionHeader, Text } from '@/ui';

export default function ExploreScreen() {
  const { t } = useTranslation();
  return (
    <Screen tab>
      <Text variant="heading" accessibilityRole="header" className="pb-3 pt-4">
        {t('nav.explore')}
      </Text>
      <ListingBrowser
        config={allListingsConfig}
        header={
          <Col gap={5}>
            <GroupRail config={GROUP_CONFIGS.ride} />
            <GroupRail config={GROUP_CONFIGS.sport} />
            <SectionHeader title={t('listing:hub.latest_title')} icon={{ icon: Sparkles, tone: 'primary' }} />
          </Col>
        }
      />
    </Screen>
  );
}

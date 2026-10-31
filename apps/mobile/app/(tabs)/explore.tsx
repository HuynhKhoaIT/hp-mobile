// Screen type: List
// Tab Khám phá (tuần 4): tìm + lọc mọi tin (danh mục, khu), cuộn vô hạn. Nhóm ghép xe / ghép trận thêm ở tuần 8.
import { useTranslation } from 'react-i18next';
import { allListingsConfig } from '@/features/listing/config';
import { ListingBrowser } from '@/features/listing/components/ListingBrowser';
import { Screen, Text } from '@/ui';

export default function ExploreScreen() {
  const { t } = useTranslation();
  return (
    <Screen tab>
      <Text variant="heading" accessibilityRole="header" className="pb-3 pt-4">
        {t('nav.explore')}
      </Text>
      <ListingBrowser config={allListingsConfig} />
    </Screen>
  );
}

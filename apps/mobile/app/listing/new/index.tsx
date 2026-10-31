// Screen type: Form
// Bước 0 của "Đăng nhanh" mở từ nút Đăng ở danh sách / Hub: chọn loại tin (đặt sẵn tính năng qua `?feature=`) rồi danh mục.
import { type ListingFeature, LISTING_FEATURES } from '@hp/shared';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PostPicker } from '@/features/listing/components/PostPicker';
import { backOrHome } from '@/features/listing/navigation';
import { Header, Screen } from '@/ui';

const isFeature = (v: string | undefined): v is ListingFeature => !!v && v in LISTING_FEATURES;

export default function NewListingPickerScreen() {
  const { t } = useTranslation('listing');
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  return (
    <Screen scroll>
      <Header title={t('form.title_new')} back onBack={backOrHome} />
      <PostPicker initialFeature={isFeature(feature) ? feature : undefined} />
    </Screen>
  );
}

// Screen type: Form
// Bước 0 của "Đăng nhanh" mở từ nút Đăng ở danh sách / Hub: chọn loại tin (đặt sẵn tính năng qua `?feature=`) rồi danh mục.
// `?mini=<slug>`: mở từ mini-app → chỉ danh mục của tính năng, đăng xong về "Quản lý tin" của mini-app.
import { type ListingFeature, LISTING_FEATURES } from '@hp/shared';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LISTING_CONFIGS, miniThemeOf } from '@/features/configs';
import { PostPicker } from '@/features/listing/components/PostPicker';
import { backOrHome, isMiniSlug } from '@/features/listing/navigation';
import { AppThemeProvider, Header, Screen } from '@/ui';

const isFeature = (v: string | undefined): v is ListingFeature => !!v && v in LISTING_FEATURES;

function NewListingPickerScreenBody() {
  const { t } = useTranslation('listing');
  const { feature, mini } = useLocalSearchParams<{ feature?: string; mini?: string }>();
  const locked = isMiniSlug(mini) && isFeature(feature);
  return (
    <Screen scroll>
      <Header
        title={locked ? t('form.hero_title', { feature: t(`common:feature.${feature}`) }) : t('form.title_new')}
        back
        onBack={backOrHome}
      />
      <PostPicker
        configs={LISTING_CONFIGS}
        initialFeature={isFeature(feature) ? feature : undefined}
        mini={isMiniSlug(mini) ? mini : undefined}
      />
    </Screen>
  );
}

/** Mở từ mini-app (`?mini=<slug>`) → giữ màu của mini-app (AppThemeProvider); ngoài mini-app không bọc gì. */
export default function NewListingPickerScreen() {
  const { mini } = useLocalSearchParams<{ mini?: string }>();
  return (
    <AppThemeProvider theme={miniThemeOf(mini)}>
      <NewListingPickerScreenBody />
    </AppThemeProvider>
  );
}

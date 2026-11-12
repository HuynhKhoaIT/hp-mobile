// Screen type: Form
// Form "Đăng nhanh" 3 bước cho một danh mục (mọi tính năng Listing, khác nhau ở config.ts + ATTRIBUTE_FIELDS).
// Cần đăng nhập + hồ sơ (khu mặc định = profile.site; SĐT để nhắc số nào hiện qua "Hiện số"). Danh mục sai → về bước chọn loại tin
// (luồng mini-app: bộ chọn của mini-app — giữ `mini` + tính năng).
// `?mini=<slug>`: luồng đăng của mini-app → lưu nháp / "Tin của tôi" về "Quản lý tin" của mini-app.
import { useMyProfile } from '@hp/core/react';
import { LISTING_CATEGORIES, type ListingCategory } from '@hp/shared';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getLocale } from '@/core/i18n';
import { configOfCategory, LISTING_CONFIGS_BY_SLUG, miniThemeOf } from '@/features/configs';
import { ListingForm } from '@/features/listing/form/ListingForm';
import { ListingFormSkeleton } from '@/features/listing/form/ListingFormSkeleton';
import { isMiniSlug } from '@/features/listing/navigation';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { AppThemeProvider, ErrorState, Header, Screen } from '@/ui';

const isCategory = (v: string | undefined): v is ListingCategory => !!v && (LISTING_CATEGORIES as readonly string[]).includes(v);

function NewListingScreenBody() {
  const { t } = useTranslation('listing');
  const { category, mini } = useLocalSearchParams<{ category: string; mini?: string }>();
  const me = useMyProfile();
  const miniSlug = isMiniSlug(mini) ? mini : undefined;
  if (!isCategory(category)) {
    const feature = miniSlug ? LISTING_CONFIGS_BY_SLUG[miniSlug]?.key : undefined;
    const params = miniSlug && feature && feature !== 'all' ? { mini: miniSlug, feature } : {};
    return <Redirect href={{ pathname: '/listing/new', params }} />;
  }

  if (!me.data) {
    return (
      <Screen>
        <Header title={t('form.title_new')} back />
        {me.isLoading ? (
          <ListingFormSkeleton />
        ) : me.isError ? (
          <ErrorState code={me.error.code} onRetry={() => void me.refetch()} />
        ) : (
          <SignInPrompt />
        )}
      </Screen>
    );
  }

  return (
    <Screen keyboard>
      <ListingForm
        key={category}
        mode={{ kind: 'new', category }}
        config={configOfCategory(category)}
        userId={me.data.id}
        defaultSite={me.data.site}
        lang={getLocale()}
        phone={me.data.phone}
        mini={miniSlug}
      />
    </Screen>
  );
}

/** Mở từ mini-app (`?mini=<slug>`) → giữ màu của mini-app (AppThemeProvider); ngoài mini-app không bọc gì. */
export default function NewListingScreen() {
  const { mini } = useLocalSearchParams<{ mini?: string }>();
  return (
    <AppThemeProvider theme={miniThemeOf(mini)}>
      <NewListingScreenBody />
    </AppThemeProvider>
  );
}

// Screen type: Form
// Form "Đăng nhanh" 3 bước cho một danh mục (mọi tính năng Listing, khác nhau ở config.ts + ATTRIBUTE_FIELDS).
// Cần đăng nhập + hồ sơ (khu mặc định = profile.site). Danh mục sai → về bước chọn loại tin.
import { useMyProfile } from '@hp/core/react';
import { LISTING_CATEGORIES, type ListingCategory } from '@hp/shared';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getLocale } from '@/core/i18n';
import { configOfCategory } from '@/features/configs';
import { ListingForm } from '@/features/listing/form/ListingForm';
import { ListingFormSkeleton } from '@/features/listing/form/ListingFormSkeleton';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { ErrorState, Header, Screen } from '@/ui';

const isCategory = (v: string | undefined): v is ListingCategory => !!v && (LISTING_CATEGORIES as readonly string[]).includes(v);

export default function NewListingScreen() {
  const { t } = useTranslation('listing');
  const { category } = useLocalSearchParams<{ category: string }>();
  const me = useMyProfile();
  if (!isCategory(category)) return <Redirect href="/listing/new" />;

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
      />
    </Screen>
  );
}

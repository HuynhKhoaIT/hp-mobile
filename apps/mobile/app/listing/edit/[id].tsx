// Screen type: Form
// Sửa tin của tôi: cùng form "Đăng nhanh", điền sẵn từ getMyListing (giữ ảnh cũ, upload ảnh mới, dọn ảnh bỏ).
// Chờ bản mới nhất từ server trước khi điền (tránh sửa trên dữ liệu cũ trong cache). Không phải tin của mình → "Tin không còn".
import { useMyListing, useMyProfile } from '@hp/core/react';
import { useLocalSearchParams } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocale } from '@/core/i18n';
import { configOfCategory } from '@/features/configs';
import { ListingForm } from '@/features/listing/form/ListingForm';
import { ListingFormSkeleton } from '@/features/listing/form/ListingFormSkeleton';
import { backOrHome } from '@/features/listing/navigation';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { EmptyState, ErrorState, Header, Screen } from '@/ui';

const NOT_FOUND = new Set(['not_found', 'invalid_input']);

export default function EditListingScreen() {
  const { t } = useTranslation('listing');
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMyProfile();
  const query = useMyListing(me.data ? id : undefined);
  const listing = query.data;
  const ready = !!listing && (query.isFetchedAfterMount || query.isError);

  if (me.data && listing && ready) {
    return (
      <Screen keyboard>
        <ListingForm
          key={listing.id}
          mode={{ kind: 'edit', listing }}
          config={configOfCategory(listing.category)}
          userId={me.data.id}
          defaultSite={me.data.site}
          lang={getLocale()}
        />
      </Screen>
    );
  }

  let body: ReactNode;
  if (me.isLoading) body = <ListingFormSkeleton />;
  else if (me.isError) body = <ErrorState code={me.error.code} onRetry={() => void me.refetch()} />;
  else if (!me.data) body = <SignInPrompt />;
  else if (query.isError && NOT_FOUND.has(query.error.code)) {
    body = (
      <EmptyState
        icon={SearchX}
        title={t('detail.not_found_title')}
        description={t('detail.not_found_body')}
        action={{ label: t('detail.back_to_list'), onPress: backOrHome }}
      />
    );
  } else if (query.isError) body = <ErrorState code={query.error.code} onRetry={() => void query.refetch()} />;
  else body = <ListingFormSkeleton />;

  return (
    <Screen>
      <Header title={t('form.title_edit')} back onBack={backOrHome} />
      {body}
    </Screen>
  );
}

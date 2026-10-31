// Screen type: List
// "Tin đã lưu": tin còn công khai mà người dùng đã bấm trái tim (mới lưu trước). Rỗng → mời đi Khám phá.
// Khách → mời đăng nhập.
import { useSavedListings, useSession } from '@hp/core/react';
import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { allListingsConfig } from '@/features/listing/config';
import { ListingFeed } from '@/features/listing/components/ListingFeed';
import { usePostListing } from '@/features/listing/hooks';
import { backOrHome } from '@/features/listing/navigation';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { Header, Screen } from '@/ui';

export default function SavedListingsScreen() {
  const { t } = useTranslation('listing');
  const session = useSession();
  const saved = useSavedListings({ enabled: !!session.userId });
  const post = usePostListing();

  return (
    <Screen>
      <Header title={t('saved.title')} back onBack={backOrHome} />
      {!session.isLoading && !session.userId ? (
        <SignInPrompt />
      ) : (
        <ListingFeed
          config={allListingsConfig}
          items={saved.data ?? []}
          isLoading={session.isLoading || saved.isLoading}
          isError={saved.isError}
          errorCode={saved.error?.code}
          isFiltered={false}
          isRefetching={saved.isRefetching}
          hasNextPage={false}
          isFetchingNextPage={false}
          isFetchNextPageError={false}
          fetchNextPage={() => undefined}
          refetch={() => void saved.refetch()}
          onPost={post}
          empty={{
            icon: Heart,
            title: t('saved.empty_title'),
            description: t('saved.empty_body'),
            action: { label: t('common:nav.explore'), onPress: () => router.navigate('/explore') },
          }}
        />
      )}
    </Screen>
  );
}

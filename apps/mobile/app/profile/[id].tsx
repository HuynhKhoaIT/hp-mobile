// Screen type: Detail
// Hồ sơ công khai: thẻ hồ sơ (public_profiles, không SĐT) → tin đang đăng (cursor). Mở từ người đăng ở chi tiết tin,
// avatar ở chat. Báo cáo / Chặn trên header (không hiện với chính mình). Người đã chặn mình: tin của họ ẩn (view).
import { useOwnerListings, usePublicProfile, useSession } from '@hp/core/react';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { Ban, Flag, Package } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useBlockAction, useReportAction } from '@/core/report';
import { backOrHome, openListing } from '@/features/listing/navigation';
import { PublicProfileCard, PublicProfileCardSkeleton } from '@/features/profile/components/PublicProfileCard';
import {
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  ListingCard,
  ReportSheet,
  Screen,
  SectionHeader,
  SkeletonListingCard,
} from '@/ui';

export default function PublicProfileScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useSession();
  const profile = usePublicProfile(id);
  const listings = useOwnerListings(id);
  const report = useReportAction({ type: 'profile', id: id ?? '' });
  const block = useBlockAction({ id, name: profile.data?.display_name });
  const isMe = !!userId && userId === id;

  const header = (
    <View className="gap-4 pb-3">
      {profile.isLoading ? <PublicProfileCardSkeleton /> : profile.data ? <PublicProfileCard profile={profile.data} /> : null}
      <SectionHeader title={t('profile.listings')} />
    </View>
  );

  return (
    <Screen>
      <Header
        title={t('profile.title')}
        back
        onBack={backOrHome}
        right={
          isMe || !profile.data ? undefined : (
            <>
              <IconButton icon={Flag} accessibilityLabel={t('actions.report')} onPress={report.open} />
              <IconButton
                icon={Ban}
                tone={block.isBlocked ? 'danger' : 'default'}
                accessibilityLabel={block.isBlocked ? t('block.unblock') : t('actions.block')}
                onPress={block.ask}
              />
            </>
          )
        }
      />
      {profile.isError ? (
        <ErrorState
          code={profile.error.code}
          title={profile.error.code === 'not_found' ? t('profile.not_found') : undefined}
          onRetry={() => void profile.refetch()}
        />
      ) : (
        <FlashList
          data={listings.items}
          keyExtractor={(l) => l.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View className="pb-3">
              <ListingCard listing={item} layout="row" onPress={() => openListing(item.id)} />
            </View>
          )}
          ListEmptyComponent={
            listings.isLoading ? (
              <View className="gap-3">
                <SkeletonListingCard layout="row" />
                <SkeletonListingCard layout="row" />
              </View>
            ) : listings.isError ? (
              <ErrorState compact code={listings.error.code} onRetry={() => void listings.refetch()} />
            ) : (
              <EmptyState compact icon={Package} title={t('profile.no_listings')} />
            )
          }
          onEndReached={() => {
            if (listings.hasNextPage && !listings.isFetchingNextPage) void listings.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
        />
      )}
      <ReportSheet {...report.sheetProps} />
      <ConfirmSheet {...block.confirmProps} />
    </Screen>
  );
}

// Screen type: Hub
// Trang chủ: header xanh (chào + đăng nhập / đăng xuất) → lưới 6 dịch vụ → "Tin mới" (quanh khu của người dùng
// nếu đã chọn khu) → dòng miễn trừ. Tuần sau chuyển vào (tabs)/index khi có TabBar; ô tìm kiếm khi có màn search.
import { useListingList, useMyProfile, useSites } from '@hp/core/react';
import { FEATURES, type Feature, type ListingFeature } from '@hp/shared';
import { Link, router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { requireAuth, signOutApp } from '@/core/auth';
import { ListingRail } from '@/features/listing/components/ListingRail';
import { usePostListing } from '@/features/listing/hooks';
import { LISTING_ROUTE_SLUG, openListingList } from '@/features/listing/navigation';
import { profileAvatarUrl } from '@/lib/images';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Screen,
  SectionHeader,
  ServiceTile,
  Skeleton,
  SkeletonListingCard,
  Text,
  toast,
} from '@/ui';

const isListingFeature = (f: Feature): f is ListingFeature => f in LISTING_ROUTE_SLUG;

function openFeature(f: Feature) {
  if (isListingFeature(f)) openListingList(LISTING_ROUTE_SLUG[f]);
  else router.push({ pathname: '/groups/[kind]', params: { kind: f } });
}

export default function HubScreen() {
  const { t } = useTranslation('listing');
  const me = useMyProfile();
  const sites = useSites();
  const site = me.data?.site ?? undefined;
  // Chờ hồ sơ để không tải hai lần (khách → không có khu).
  const latest = useListingList({ site, limit: 6 }, { enabled: !me.isLoading });
  const siteName = site ? sites.data?.find((s) => s.code === site)?.name : undefined;
  const post = usePostListing();

  const signOut = async () => {
    await signOutApp();
    toast.show(t('auth:signed_out'));
  };

  return (
    <Screen scroll edgeToEdge>
      <View className="gap-1 rounded-b-xl bg-primary px-4 pb-6 pt-4">
        <View className="min-h-12 flex-row items-center gap-3">
          <View className="flex-1 gap-1">
            <Text variant="heading" tone="onPrimary" accessibilityRole="header">
              {me.data?.full_name ? t('hub.greeting', { name: me.data.full_name }) : t('hub.greeting_guest')}
            </Text>
            <Text tone="onPrimary">{t('hub.subtitle')}</Text>
          </View>
          {me.isLoading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : me.data ? (
            <View className="flex-row items-center gap-1">
              <Avatar name={me.data.full_name || '?'} uri={profileAvatarUrl(me.data.avatar_url)} />
              <IconButton icon={LogOut} tone="onPrimary" accessibilityLabel={t('auth:sign_out')} onPress={() => void signOut()} />
            </View>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              label={t('auth:sign_in')}
              onPress={() => requireAuth(() => toast.show(t('auth:signed_in'), 'success'))}
            />
          )}
        </View>
      </View>

      {/* Lưới 3 cột: ô w-1/3 + p-1.5, khung px-2.5 → lề màn 16, khoảng cách ô 12. */}
      <View className="flex-row flex-wrap px-2.5 pt-3">
        {FEATURES.map((f) => (
          <View key={f} className="w-1/3 p-1.5">
            <ServiceTile service={f} label={t(`common:feature.${f}`)} onPress={() => openFeature(f)} />
          </View>
        ))}
      </View>

      <View className="gap-2 pt-4">
        <SectionHeader
          className="px-4"
          title={siteName ? t('hub.latest_near', { site: siteName }) : t('hub.latest_title')}
          action={{ label: t('hub.see_all'), onPress: () => openListingList('all', site ? { site } : {}) }}
        />
        {latest.isLoading || me.isLoading ? (
          <View className="px-4">
            <SkeletonListingCard count={3} horizontal />
          </View>
        ) : latest.isError ? (
          <ErrorState code={latest.error.code} onRetry={() => void latest.refetch()} />
        ) : latest.items.length === 0 ? (
          <EmptyState title={t('list.empty_title')} description={t('list.empty_body')} action={{ label: t('list.post_cta'), onPress: post }} />
        ) : (
          <ListingRail items={latest.items} />
        )}
      </View>

      <Text variant="caption" tone="muted" className="px-4 pt-6 text-center">
        {t('common:disclaimer')}
      </Text>

      {__DEV__ ? (
        <Link href="/ui-gallery" asChild>
          <Pressable accessibilityRole="link" className="min-h-12 items-center justify-center px-4">
            <Text variant="label" tone="primary">
              {t('common:dev.open_gallery')}
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </Screen>
  );
}

// Screen type: Detail
// Hồ sơ công khai người khác (style Stitch "Hồ sơ công khai người khác"): header xanh PageHero (quay lại · "Hồ sơ thành
// viên" + dòng phụ "không hiện SĐT" · Báo cáo / Chặn trong mờ — không hiện với chính mình) → thẻ hồ sơ (PublicProfileCard,
// public_profiles: tên "An N.", không SĐT, không vị trí) → nhắc: hồ sơ của mình / đã chặn (Bỏ chặn) → "Nhóm đang mở"
// (PublicProfileGroups, ẩn khi rỗng) → "Tin đang đăng" (cursor, ListingCard hàng; rỗng → CTA Khám phá) → mẹo an toàn → miễn trừ.
// Mở từ người đăng ở chi tiết tin (OwnerCard), người tạo nhóm (HostCard), avatar ở chat, "Xem hồ sơ" ở tab Tôi.
// Người đã chặn mình / mình chặn: tin + nhóm của họ ẩn (view). Bản web: /u/[id] (apps/web/app/[locale]/(app)/u/[id]).
// Khác Stitch (cố ý): không tab Tin / Kèo / Chuyến / Đánh giá (hiện thành các khối nối tiếp, giống web — không có số đếm
// tổng), không khối "Xác minh danh tính & Khu vực" (SĐT che, thẻ nhân viên, GPLX) và "Tuyến hoạt động thường xuyên" (không có
// dữ liệu / là PII), không "Đánh giá từ anh em" (chưa có view công khai cho nội dung đánh giá), không nút Chia sẻ hồ sơ (hồ sơ
// không có link chia sẻ trong shareUrl), không Zalo / Gọi / Theo dõi; thanh tab dưới không hiện ở màn chi tiết.
import { useOwnerListings, usePublicProfile, useSession } from '@hp/core/react';
import { FlashList } from '@shopify/flash-list';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ban, Compass, Flag, Package } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useBlockAction, useReportAction } from '@/core/report';
import { backOrHome, openListing } from '@/features/listing/navigation';
import { PublicProfileCard, PublicProfileCardSkeleton } from '@/features/profile/components/PublicProfileCard';
import { PublicProfileGroups } from '@/features/profile/components/PublicProfileGroups';
import {
  Button,
  Col,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  IconButton,
  ListingCard,
  Notice,
  PageHero,
  ReportSheet,
  Screen,
  SectionHeader,
  SkeletonListingCard,
  Text,
  useScheme,
} from '@/ui';

export default function PublicProfileScreen() {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const scheme = useScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useSession();
  const profile = usePublicProfile(id);
  const listings = useOwnerListings(id);
  const report = useReportAction({ type: 'profile', id: id ?? '' });
  const block = useBlockAction({ id, name: profile.data?.display_name });
  const isMe = !!userId && userId === id;

  const header = (
    <Col gap={5} className="pb-3 pt-4">
      {profile.isLoading ? <PublicProfileCardSkeleton /> : profile.data ? <PublicProfileCard profile={profile.data} /> : null}
      {isMe ? <Notice text={t('profile.own_notice')} /> : null}
      {!isMe && block.isBlocked ? (
        <Notice tone="danger" text={t('profile.blocked_notice')}>
          <View className="flex-row">
            <Button size="sm" variant="outline" label={t('block.unblock')} onPress={block.unblock} />
          </View>
        </Notice>
      ) : null}
      {id && profile.data ? <PublicProfileGroups userId={id} /> : null}
      <SectionHeader title={t('profile.listings')} bar="primary" size="md" />
    </Col>
  );

  const footer = (
    <Col gap={4} className="pb-6 pt-3">
      <Notice variant="bordered" tone="warning" title={t('listing:tip.title')} text={t('profile.safety_tip')} />
      <Text variant="caption" tone="muted" className="text-center">
        {t('disclaimer')}
      </Text>
    </Col>
  );

  return (
    <Screen>
      <PageHero
        title={t('profile.public_title')}
        subtitle={t('profile.public_subtitle')}
        onBack={backOrHome}
        right={
          isMe || !profile.data ? undefined : (
            <>
              <IconButton icon={Flag} variant="glass" accessibilityLabel={t('actions.report')} onPress={report.open} />
              <IconButton
                icon={Ban}
                variant="glass"
                accessibilityLabel={block.isBlocked ? t('block.unblock') : t('actions.block')}
                accessibilityState={{ selected: block.isBlocked }}
                onPress={block.ask}
              />
            </>
          )
        }
      />
      {profile.isError ? (
        <View className="flex-1 justify-center">
          <ErrorState
            code={profile.error.code}
            title={profile.error.code === 'not_found' ? t('profile.not_found') : undefined}
            onRetry={profile.error.code === 'not_found' ? undefined : () => void profile.refetch()}
          />
          {profile.error.code === 'not_found' ? (
            <View className="items-center pt-2">
              <Button variant="outline" icon={Compass} label={t('profile.browse_cta')} onPress={() => router.navigate('/explore')} />
            </View>
          ) : null}
        </View>
      ) : (
        <FlashList
          data={listings.items}
          keyExtractor={(l) => l.id}
          ListHeaderComponent={header}
          ListFooterComponent={profile.data ? footer : null}
          renderItem={({ item }) => (
            <View className="pb-3">
              <ListingCard listing={item} layout="row" onPress={() => openListing(item.id)} />
            </View>
          )}
          ListEmptyComponent={
            listings.isLoading || profile.isLoading ? (
              <View className="gap-3">
                <SkeletonListingCard layout="row" />
                <SkeletonListingCard layout="row" />
              </View>
            ) : listings.isError ? (
              <ErrorState compact code={listings.error.code} onRetry={() => void listings.refetch()} />
            ) : (
              <EmptyState
                compact
                icon={Package}
                title={t('profile.no_listings')}
                action={{ label: t('profile.browse_cta'), icon: Compass, onPress: () => router.navigate('/explore') }}
              />
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
      {/* Header xanh: chữ / icon thanh trạng thái tương phản với primary (sáng → chữ trắng, tối → chữ tối). */}
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}

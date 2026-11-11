// Tab "Đã lưu" của mini-app (style Stitch "Tin đã lưu"): header (← trang chủ mini-app, "Tin đã lưu" + viên cam số tin) →
// chip Tất cả / Đang bán / Ngừng bán kèm số → thẻ ngang: ảnh vuông (nhãn danh mục phủ đáy ảnh) · tiêu đề 2 dòng · tim bỏ
// lưu (lạc quan + rollback — useListingBookmark) · giá · nơi · thời gian · nhãn "Công nhân đã xác minh" khi người đăng có
// huy hiệu worker → dải dưới: mô tả ngắn + "Chat ngay" (mở / lấy lại hội thoại như CTA chi tiết tin; tin của mình thì
// không có). Tin ngừng bán (đã bán / đóng / hết hạn): ảnh mờ + nhãn trạng thái giữa ảnh, chữ muted, nút thùng rác bỏ lưu,
// dải dưới "Món này đã có người chốt" + "Tìm món tương tự" (→ trang chủ mini-app lọc theo danh mục đó) → hộp mẹo mua an toàn.
// Chỉ tin thuộc danh mục của tính năng (lọc tại chỗ trên useSavedListings — tối đa 200 tin lưu gần nhất).
// Khách → mời đăng nhập; đang tải → khung chờ thẻ; lỗi → thử lại; rỗng → "Xem tin mới" (trang chủ mini-app).
// Khác Stitch (cố ý): không hộp "Nhắc nhở … hạ giá", chip "Đã giảm giá", nhãn "-200K", "Giảm giá 12 phút trước", nút "Trả giá",
// "Gọi Zalo", "Hẹn xem tại cổng…", khối "Tạo chuông" (chưa có dữ liệu giá cũ / hẹn / nhắc tin); không nút lọc góc phải header.
import type { PublicListing } from '@hp/core';
import { useSavedListings, useSession } from '@hp/core/react';
import type { ListingCategory } from '@hp/shared';
import { FlashList } from '@shopify/flash-list';
import { Heart, MapPin, MessageCircle, Search, ShieldCheck, Trash2 } from 'lucide-react-native';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, View } from 'react-native';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { formatRelative } from '@/lib/format';
import { usePriceText, useSiteText } from '@/lib/listing';
import {
  Badge,
  BookmarkButton,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterBar,
  Icon,
  IconButton,
  ListingCover,
  Notice,
  Skeleton,
  StaggerItem,
  Text,
  useTheme,
} from '@/ui';
import { useContactListing, useIsOwner, useListingBookmark } from '../../hooks';
import { useMiniApp, useMiniFilterState } from '../../miniApp';
import { openListing, openMiniTab } from '../../navigation';
import { MiniTabHeader } from './MiniHeader';

type SavedTab = 'all' | 'active' | 'inactive';

/** Tin còn bán: đang đăng và chưa hết hạn. */
const isLive = (l: Pick<PublicListing, 'status' | 'is_expired'>) => l.status === 'active' && !l.is_expired;

export function MiniSaved() {
  const { t } = useTranslation('listing');
  const { space, colors } = useTheme();
  const { config } = useMiniApp();
  const filters = useMiniFilterState();
  const session = useSession();
  const saved = useSavedListings({ enabled: !!session.userId });
  const [tab, setTab] = useState<SavedTab>('all');

  const items = useMemo(() => (saved.data ?? []).filter((l) => config.categories.includes(l.category)), [saved.data, config.categories]);
  const live = items.filter(isLive);
  const visible = tab === 'all' ? items : tab === 'active' ? live : items.filter((l) => !isLive(l));

  // "Tìm món tương tự": trang chủ mini-app lọc đúng danh mục (bỏ bộ lọc khác).
  const findSimilar = (category: ListingCategory) => {
    filters.update(() => ({ ...filters.initial, category }));
    openMiniTab(config.slug, 'index');
  };
  const goHome = () => openMiniTab(config.slug, 'index');

  let body: ReactNode;
  if (!session.isLoading && !session.userId) body = <SignInPrompt />;
  else if (session.isLoading || saved.isLoading) {
    body = (
      <View className="gap-3 pt-4">
        <SavedRowSkeleton />
        <SavedRowSkeleton />
        <SavedRowSkeleton />
      </View>
    );
  } else if (saved.isError) body = <ErrorState code={saved.error.code} onRetry={() => void saved.refetch()} />;
  else if (items.length === 0) {
    body = (
      <EmptyState
        icon={Heart}
        title={t('mini_app.saved.empty_title')}
        description={t('mini_app.saved.empty_body')}
        action={{ label: t('mini_app.saved.empty_cta'), onPress: goHome }}
      />
    );
  } else {
    body = (
      <>
        <View className="pt-3">
          <FilterBar
            bleed
            appearance="solid"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: t('mini_app.saved.tab_all', { count: items.length }) },
              { value: 'active', label: t('mini_app.saved.tab_active', { count: live.length }) },
              { value: 'inactive', label: t('mini_app.saved.tab_inactive', { count: items.length - live.length }) },
            ]}
          />
        </View>
        <FlashList
          data={visible}
          keyExtractor={(l) => l.id}
          renderItem={({ item, index }) => (
            <StaggerItem index={index} className="pb-3">
              <SavedRow listing={item} onSimilar={findSimilar} />
            </StaggerItem>
          )}
          contentContainerStyle={{ paddingTop: space[3], paddingBottom: space[6] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={saved.isRefetching}
              onRefresh={() => void saved.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          ListEmptyComponent={
            <EmptyState
              compact
              icon={Heart}
              title={t('mini_app.saved.empty_title')}
              action={{ label: t('mini_app.saved.tab_all', { count: items.length }), onPress: () => setTab('all') }}
            />
          }
          ListFooterComponent={
            <View className="pt-1">
              <Notice variant="bordered" tone="warning" icon={ShieldCheck} title={t('mini_app.saved.tip_title')} text={t('mini_app.saved.tip_body')} />
            </View>
          }
        />
      </>
    );
  }

  return (
    <>
      <MiniTabHeader title={t('mini_app.saved.title')} badge={items.length > 0 ? String(items.length) : undefined} />
      {body}
    </>
  );
}

function SavedRow({ listing, onSimilar }: { listing: PublicListing; onSimilar: (category: ListingCategory) => void }) {
  const { t } = useTranslation('listing');
  const price = usePriceText()(listing);
  const site = useSiteText()(listing);
  const bookmark = useListingBookmark(listing.id);
  const isOwner = useIsOwner(listing);
  const contact = useContactListing();
  const live = isLive(listing);
  const status = listing.status === 'sold' ? t('mini_app.saved.sold_badge') : t(`common:status.${listing.is_expired ? 'expired' : listing.status}`);
  const meta = [site, formatRelative(listing.created_at)].filter(Boolean).join(' · ');
  const worker = listing.owner_badges.includes('worker');
  const remove = t('mini_app.saved.remove_a11y', { title: listing.title });
  const note = listing.description?.trim().split('\n')[0] ?? '';

  return (
    <Card padded={false}>
      <View className="p-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={[listing.title, live ? null : status, price, meta].filter(Boolean).join(', ')}
          onPress={() => openListing(listing.id)}
          className="flex-row items-start gap-3 pr-10 active:opacity-80"
        >
          <View className="size-28 overflow-hidden rounded-md border border-border">
            <ListingCover listing={listing} className={['size-full', live ? null : 'opacity-50'].filter(Boolean).join(' ')} />
            <View className="absolute bottom-1.5 left-1.5 right-1.5">
              <Badge overlay label={t(`category_short.${listing.category}`)} numberOfLines={1} />
            </View>
            {live ? null : (
              <View className="absolute inset-0 items-center justify-center">
                <Badge overlay label={status} tone={listing.status === 'sold' ? 'primary' : 'neutral'} numberOfLines={1} />
              </View>
            )}
          </View>
          <View className="flex-1 gap-1">
            <Text variant="label" weight="semibold" tone={live ? 'default' : 'muted'} numberOfLines={2}>
              {listing.title}
            </Text>
            {price ? (
              <Text variant="price" tone={live ? 'primary' : 'muted'} numberOfLines={1}>
                {price}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-1">
              {site ? <Icon icon={MapPin} tone="muted" size={14} /> : null}
              <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
                {meta}
              </Text>
            </View>
            {worker && live ? <Badge label={t('owner_badge.worker')} tone="primary" numberOfLines={1} /> : null}
          </View>
        </Pressable>
        {/* Bỏ lưu: anh em của vùng mở tin (trình đọc màn hình bấm riêng được), vùng chạm 44. */}
        <View className="absolute right-1 top-1">
          {live ? (
            <BookmarkButton saved={bookmark.saved} onToggle={bookmark.onToggle} labels={{ save: bookmark.labels.save, unsave: remove }} size="button" />
          ) : (
            <IconButton icon={Trash2} tone="muted" size="button" accessibilityLabel={remove} onPress={() => bookmark.onToggle(false)} />
          )}
        </View>
      </View>
      <View className="min-h-14 flex-row items-center gap-2 rounded-b-lg border-t border-border bg-surface-2 px-3 py-2">
        {live ? (
          <>
            <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
              {note}
            </Text>
            {isOwner ? null : (
              <Button size="sm" icon={MessageCircle} label={t('mini_app.saved.chat')} loading={contact.isPending} onPress={() => contact.open(listing)} />
            )}
          </>
        ) : (
          <>
            <Icon icon={Search} tone="muted" size={16} />
            <Text variant="caption" tone="muted" className="flex-1">
              {t('mini_app.saved.inactive_hint')}
            </Text>
            <Button size="sm" variant="ghost" label={t('mini_app.saved.find_similar')} onPress={() => onSimilar(listing.category)} />
          </>
        )}
      </View>
    </Card>
  );
}

/** Khung chờ đúng hình thẻ đã lưu (ảnh vuông · tiêu đề · giá · meta · dải nút). */
function SavedRowSkeleton() {
  return (
    <Card padded={false}>
      <View className="flex-row gap-3 p-3">
        <Skeleton className="size-28" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </View>
      </View>
      <View className="flex-row items-center gap-2 border-t border-border px-3 py-2">
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-11 w-28" />
      </View>
    </Card>
  );
}

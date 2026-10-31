// "Tin của tôi": tab Đang đăng / Chờ duyệt / Nháp / Đã đóng (khớp web) → danh sách tin của chủ tin (cursor).
// Mỗi dòng: ảnh bìa, badge trạng thái, tiêu đề, giá, hết hạn + lượt xem; chờ duyệt / bị từ chối kèm lý do.
// "Thêm thao tác" (BottomSheet): Sửa · Gửi duyệt lại (bị từ chối) · Đánh dấu đã bán · Đóng tin · Mở lại · Gia hạn · Xoá tin — chỉ hiện thao tác
// hợp lệ với trạng thái (DB guard vẫn là nơi quyết định); đã bán / xoá hỏi lại bằng BottomSheet có nút ghi rõ việc.
import type { MyListing, MyListingsTab } from '@hp/core';
import { useMyListings } from '@hp/core/react';
import { featureOfCategory } from '@hp/shared';
import { FlashList } from '@shopify/flash-list';
import { Archive, CalendarClock, CheckCircle2, MoreVertical, Pencil, RotateCcw, Send, Trash2 } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatDate } from '@/lib/format';
import { LISTING_STATUS_TONE, usePriceText } from '@/lib/listing';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Col,
  EmptyState,
  ErrorState,
  FilterBar,
  IconButton,
  ListingCover,
  Row,
  SkeletonListingCard,
  StaggerItem,
  Text,
  useTheme,
} from '@/ui';
import { ownerActions, useOwnerListingActions, usePostListing } from '../hooks';
import { openEditListing, openListing } from '../navigation';

export const MY_LISTING_TABS: readonly MyListingsTab[] = ['active', 'pending', 'draft', 'closed'];

export const isMyListingsTab = (v: string | undefined): v is MyListingsTab => !!v && (MY_LISTING_TABS as readonly string[]).includes(v);

export function MyListings({ initialTab = 'active' }: { initialTab?: MyListingsTab }) {
  const { t } = useTranslation('listing');
  const { space } = useTheme();
  const [tab, setTab] = useState<MyListingsTab>(initialTab);
  const list = useMyListings(tab);
  const post = usePostListing();
  const [menuFor, setMenuFor] = useState<MyListing | null>(null);

  const tabs = MY_LISTING_TABS.map((value) => ({ value, label: t(`manage.tab.${value}`) }));

  let content: ReactNode;
  if (list.isLoading) content = <SkeletonListingCard count={4} layout="row" />;
  else if (list.isError && list.items.length === 0) content = <ErrorState code={list.error.code} onRetry={() => void list.refetch()} />;
  else if (list.items.length === 0) {
    content = (
      <EmptyState title={t('manage.empty_title')} description={t('manage.empty_body')} action={{ label: t('list.post_cta'), onPress: post }} />
    );
  } else {
    content = (
      <FlashList
        data={list.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <StaggerItem index={index} className="pb-3">
            <MyListingRow listing={item} onMore={() => setMenuFor(item)} />
          </StaggerItem>
        )}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        onEndReachedThreshold={1.5}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        ListFooterComponent={list.isFetchingNextPage ? <SkeletonListingCard layout="row" /> : null}
        contentContainerStyle={{ paddingTop: space[2], paddingBottom: space[8] }}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <>
      <View className="pb-2">
        <FilterBar options={tabs} value={tab} onChange={setTab} />
      </View>
      <View className="flex-1">{content}</View>
      <ListingActionsSheet listing={menuFor} onClose={() => setMenuFor(null)} />
    </>
  );
}

function MyListingRow({ listing, onMore }: { listing: MyListing; onMore: () => void }) {
  const { t, i18n } = useTranslation('listing');
  const priceText = usePriceText();
  const actions = ownerActions(listing);
  const status = actions.expired ? 'expired' : listing.status;
  const reasons = listing.moderation_reasons.filter((r) => i18n.exists(`listing:manage.reason.${r}`));
  const meta = [
    listing.expires_at && (listing.status === 'active' || listing.status === 'expired')
      ? t('manage.expires_on', { date: formatDate(listing.expires_at) })
      : null,
    t('detail.views', { count: listing.view_count }),
  ]
    .filter(Boolean)
    .join(' · ');
  // Tin công khai (đang đăng / đã bán / đóng / hết hạn) → xem như người khác thấy; còn lại → sửa.
  const open = () =>
    listing.status === 'draft' || listing.status === 'pending_review' || listing.status === 'rejected'
      ? openEditListing(listing.id)
      : openListing(listing.id);

  return (
    <Card onPress={open} accessibilityLabel={[listing.title, t(`common:status.${status}`), priceText(listing)].join(', ')}>
      <View className="flex-row items-start gap-3">
        <ListingCover listing={listing} className="aspect-avatar w-20 rounded-sm" />
        <View className="flex-1 gap-1">
          <Badge label={t(`common:status.${status}`)} tone={LISTING_STATUS_TONE[status]} numberOfLines={1} />
          <Text variant="label" numberOfLines={2}>
            {listing.title}
          </Text>
          <Text variant="price" numberOfLines={1}>
            {priceText(listing)}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <IconButton icon={MoreVertical} accessibilityLabel={t('manage.more')} onPress={onMore} />
      </View>
      {listing.status === 'pending_review' || listing.status === 'rejected' ? (
        <Col gap={2} className="pt-3">
          <Text variant="caption" tone={listing.status === 'rejected' ? 'danger' : 'warning'}>
            {listing.status === 'rejected' ? t('manage.rejected_note') : t('manage.pending_note')}
          </Text>
          {reasons.length > 0 ? (
            <Row gap={1} wrap>
              {reasons.map((r) => (
                <Badge key={r} label={t(`manage.reason.${r}`)} tone={listing.status === 'rejected' ? 'danger' : 'warning'} />
              ))}
            </Row>
          ) : null}
        </Col>
      ) : null}
    </Card>
  );
}

type SheetView = 'menu' | 'sold' | 'delete';

/** Menu thao tác + xác nhận (cùng một BottomSheet đổi nội dung). */
function ListingActionsSheet({ listing, onClose }: { listing: MyListing | null; onClose: () => void }) {
  const { t } = useTranslation('listing');
  const run = useOwnerListingActions();
  const [view, setView] = useState<SheetView>('menu');
  const close = () => {
    setView('menu');
    onClose();
  };
  if (!listing) return <BottomSheet open={false} onClose={close} />;

  const a = ownerActions(listing);
  const feature = featureOfCategory(listing.category);
  // "Đã bán" có nghĩa với đồ pass và phòng trọ; việc làm / đồ thất lạc dùng "Đóng tin".
  const canSell = a.markSold && (feature === 'pass' || feature === 'room');
  const act = (fn: (id: string) => void) => () => {
    fn(listing.id);
    close();
  };

  return (
    <BottomSheet
      open
      onClose={close}
      title={view === 'sold' ? t('manage.sold_title') : view === 'delete' ? t('manage.delete_title') : listing.title}
    >
      {view === 'sold' ? (
        <Col gap={3}>
          <Text tone="muted">{t('manage.sold_body')}</Text>
          <Button label={t('manage.sold_confirm')} fullWidth onPress={act(run.markSold)} />
          <Button label={t('common:actions.cancel')} variant="outline" fullWidth onPress={() => setView('menu')} />
        </Col>
      ) : view === 'delete' ? (
        <Col gap={3}>
          <Text tone="muted">{t('manage.delete_body')}</Text>
          <Button label={t('manage.delete_confirm')} variant="danger" fullWidth onPress={act(run.remove)} />
          <Button label={t('common:actions.cancel')} variant="outline" fullWidth onPress={() => setView('menu')} />
        </Col>
      ) : (
        <Col gap={2}>
          {a.resubmit ? <Button label={t('manage.resubmit')} icon={Send} fullWidth onPress={act(run.resubmit)} /> : null}
          <Button label={t('manage.edit')} icon={Pencil} variant="outline" fullWidth onPress={act((id) => openEditListing(id))} />
          {canSell ? <Button label={t('manage.mark_sold')} icon={CheckCircle2} variant="outline" fullWidth onPress={() => setView('sold')} /> : null}
          {a.close ? <Button label={t('manage.mark_closed')} icon={Archive} variant="outline" fullWidth onPress={act(run.close)} /> : null}
          {a.reopen ? <Button label={t('manage.reopen')} icon={RotateCcw} variant="outline" fullWidth onPress={act(run.reopen)} /> : null}
          {a.renew ? <Button label={t('manage.renew')} icon={CalendarClock} variant="outline" fullWidth onPress={act(run.renew)} /> : null}
          <Button label={t('manage.delete')} icon={Trash2} variant="ghost" fullWidth onPress={() => setView('delete')} />
        </Col>
      )}
    </BottomSheet>
  );
}

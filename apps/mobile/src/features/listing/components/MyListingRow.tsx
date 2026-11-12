// Thẻ quản lý một tin của tôi (style Stitch "Quản lý tin đăng") — dùng ở màn "Tin của tôi" và khối xem trước ở tab Tôi.
// Card p-3: ảnh bìa vuông 96 (badge trạng thái phủ góc trái trên ảnh) → tiêu đề 2 dòng + nút ⋮ (BottomSheet đủ thao tác)
// → giá text-lg đậm primary → meta (icon mắt + lượt xem · hết hạn). Chờ duyệt / bị từ chối: hộp nhạt warning/danger kèm
// lý do. Hàng thao tác nhanh dưới vạch ngăn theo ownerActions (khớp web): bị từ chối → Gửi duyệt lại + Sửa; nháp / chờ
// duyệt → Sửa; đang đăng → (Gia hạn accent khi sắp hết hạn) + Sửa + Đã bán (pass / phòng, hỏi lại) hoặc Đóng tin; hết hạn
// → Gia hạn + Sửa; đã đóng / đã bán → Mở lại + Sửa. Đủ 3 nút → nút viền bỏ icon cho vừa 360 px. Xoá chỉ trong menu ⋮
// (hỏi lại). DB guard vẫn quyết định; lỗi → toast.
// Tin đã đóng / đã bán / hết hạn: viền nét đứt, tiêu đề + giá màu muted (vẫn ≥ 4,5:1), ảnh mờ 80% — chữ không mờ.
// Vùng mở tin (ảnh + chữ) là một nút riêng, ⋮ và các nút nhanh là nút anh em → trình đọc màn hình tới được từng nút.
// Đồ thất lạc (style Stitch L2 "Đồ thất lạc của tôi"): nhãn Mất đồ / Nhặt được dưới tiêu đề; đang đăng → nút chính
// "Đã nhận lại đồ" / "Đã trả cho chủ" (ReturnedSheet → mark_listing_returned) + Sửa, Đóng tin vào menu ⋮; đã trả lại →
// badge "Đã trả lại" thay "Đã đóng", không còn Mở lại; nút chính "Cảm ơn người trả đồ" / "Đánh giá người nhận"
// (ListingRateSheet → RPC rate_listing; đã chấm → sheet hiện "Bạn đã đánh giá …").
import type { MyListing } from '@hp/core';
import { featureOfCategory } from '@hp/shared';
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock,
  Eye,
  type LucideIcon,
  MoreVertical,
  PackageCheck,
  Pencil,
  RotateCcw,
  Send,
  Star,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { formatDate } from '@/lib/format';
import { isReturned, LISTING_STATUS_TONE, usePriceText } from '@/lib/listing';
import { Badge, BottomSheet, Button, type ButtonVariant, Card, Col, Icon, IconButton, ListingCover, Skeleton, Text } from '@/ui';
import { ownerActions, useOwnerListingActions } from '../hooks';
import { type MiniSlug, openEditListing, openListing } from '../navigation';
import { ListingRateSheet } from './ListingRateSheet';
import { ReturnedSheet, returnedLabelKeys } from './ReturnedSheet';

export type MyListingQuickAction = 'edit' | 'resubmit' | 'renew' | 'sold' | 'close' | 'reopen' | 'returned' | 'rate';

const QUICK: Record<MyListingQuickAction, { label: string; icon: LucideIcon; a11y?: string }> = {
  edit: { label: 'manage.edit', icon: Pencil },
  resubmit: { label: 'manage.resubmit', icon: Send },
  renew: { label: 'manage.renew', icon: CalendarClock },
  // Nút ngắn "Đã bán"; trình đọc màn hình đọc đủ "Đánh dấu đã bán".
  sold: { label: 'manage.sold_confirm', icon: CheckCircle2, a11y: 'manage.mark_sold' },
  close: { label: 'manage.mark_closed', icon: Archive },
  reopen: { label: 'manage.reopen', icon: RotateCcw },
  // Chữ theo loại tin (mất / nhặt) — MyListingRow truyền labelKey của returnedLabelKeys.
  returned: { label: 'lost_found.mark_returned', icon: PackageCheck },
  // Chữ theo loại tin — rateLabelKey.
  rate: { label: 'lost_found.rate_cta_lost', icon: Star },
};

/** Đánh giá sau khi trả đồ: tin mất đồ → "Cảm ơn người trả đồ", tin nhặt được → "Đánh giá người nhận". */
function rateLabelKey(category: MyListing['category']) {
  return category === 'found' ? 'lost_found.rate_cta_found' : 'lost_found.rate_cta_lost';
}

type QuickRow = { primary?: { action: MyListingQuickAction; variant: Extract<ButtonVariant, 'primary' | 'accent'> }; secondary: MyListingQuickAction[] };

/** "Đã bán" có nghĩa với đồ pass và phòng trọ; việc làm / đồ thất lạc dùng "Đóng tin". */
export function canSellOf(listing: Pick<MyListing, 'category'>, markSold: boolean) {
  const feature = featureOfCategory(listing.category);
  return markSold && (feature === 'pass' || feature === 'room');
}

/** Đồ thất lạc đang đăng, chưa trả lại → được "Đã nhận lại đồ" (RPC mark_listing_returned; DB vẫn quyết định). */
function canMarkReturnedOf(listing: MyListing, expired: boolean) {
  return featureOfCategory(listing.category) === 'lostFound' && listing.status === 'active' && !expired && !isReturned(listing);
}

/**
 * Nút nhanh theo trạng thái (khớp quickActions của web, apps/web/src/features/listing/manage.ts): tối đa 1 nút chính +
 * 2 nút viền. Bị từ chối → Gửi duyệt lại + Sửa; nháp / chờ duyệt → Sửa; đang đăng → (Gia hạn khi sắp hết hạn) + Sửa +
 * Đã bán / Đóng tin; hết hạn → Gia hạn + Sửa; đã bán / đã đóng → Mở lại + Sửa.
 */
function quickRowOf(listing: MyListing): QuickRow {
  const a = ownerActions(listing);
  if (a.resubmit) return { primary: { action: 'resubmit', variant: 'primary' }, secondary: ['edit'] };
  if (listing.status === 'draft' || listing.status === 'pending_review') return { primary: { action: 'edit', variant: 'primary' }, secondary: [] };
  if (a.expired) return { primary: a.renew ? { action: 'renew', variant: 'accent' } : undefined, secondary: ['edit'] };
  if (canMarkReturnedOf(listing, a.expired)) return { primary: { action: 'returned', variant: 'primary' }, secondary: ['edit'] };
  if (isReturned(listing)) return { primary: { action: 'rate', variant: 'primary' }, secondary: ['edit'] };
  if (listing.status === 'active') {
    const end: MyListingQuickAction[] = canSellOf(listing, a.markSold) ? ['sold'] : a.close ? ['close'] : [];
    return { primary: a.renew ? { action: 'renew', variant: 'accent' } : undefined, secondary: ['edit', ...end] };
  }
  return { secondary: a.reopen ? ['reopen', 'edit'] : ['edit'] };
}

export type MyListingRowProps = {
  listing: MyListing;
  onMore: () => void;
  onAction: (action: MyListingQuickAction) => void;
};

export function MyListingRow({ listing, onMore, onAction }: MyListingRowProps) {
  const { t, i18n } = useTranslation('listing');
  const price = usePriceText()(listing);
  const a = ownerActions(listing);
  const status = a.expired ? 'expired' : listing.status;
  const returned = isReturned(listing);
  const lostFound = featureOfCategory(listing.category) === 'lostFound';
  const inactive = status === 'sold' || status === 'closed' || status === 'expired';
  const review = listing.status === 'pending_review' || listing.status === 'rejected';
  const rejected = listing.status === 'rejected';
  const reasons = listing.moderation_reasons.filter((r) => i18n.exists(`listing:manage.reason.${r}`));
  const meta = [
    t('detail.views', { count: listing.view_count }),
    listing.expires_at && (listing.status === 'active' || listing.status === 'expired')
      ? t('manage.expires_on', { date: formatDate(listing.expires_at) })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const quick = quickRowOf(listing);
  // Tin công khai (đang đăng / đã bán / đóng / hết hạn) → xem như người khác thấy; còn lại → sửa.
  const open = () => (review || listing.status === 'draft' ? openEditListing(listing.id) : openListing(listing.id));

  return (
    <Card padded={false} className={['p-3', inactive && 'border-dashed'].filter(Boolean).join(' ')}>
      <View className="flex-row items-start gap-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={[listing.title, t(`common:status.${status}`), price, meta].filter(Boolean).join(', ')}
          onPress={open}
          className="flex-1 flex-row items-start gap-3 active:opacity-80"
        >
          <View className="size-24 overflow-hidden rounded-md border border-border">
            <ListingCover listing={listing} className={['size-full', inactive && 'opacity-80'].filter(Boolean).join(' ')} />
            <View className="absolute left-1.5 right-1.5 top-1.5">
              <Badge
                overlay
                label={returned ? t('lost_found.returned_badge') : t(`common:status.${status}`)}
                tone={returned ? 'success' : LISTING_STATUS_TONE[status]}
                numberOfLines={1}
              />
            </View>
          </View>
          <View className="flex-1 gap-1">
            <Text variant="label" weight="semibold" tone={inactive ? 'muted' : 'default'} numberOfLines={2}>
              {listing.title}
            </Text>
            {lostFound ? (
              <Badge
                label={t(listing.category === 'found' ? 'lost_found.kind_found' : 'lost_found.kind_lost')}
                tone={listing.category === 'found' ? 'success' : 'danger'}
                numberOfLines={1}
              />
            ) : null}
            {price ? (
              <Text variant="price" tone={inactive ? 'muted' : 'primary'} numberOfLines={1}>
                {price}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-1">
              <Icon icon={Eye} tone="muted" size={16} />
              <Text variant="caption" tone="muted" numberOfLines={1} className="shrink">
                {meta}
              </Text>
            </View>
          </View>
        </Pressable>
        <IconButton icon={MoreVertical} accessibilityLabel={t('manage.more')} onPress={onMore} className="-mr-2 -mt-2" />
      </View>

      {review ? (
        <View className={`mt-3 flex-row items-start gap-2 rounded-md px-2.5 py-1.5 ${rejected ? 'bg-danger/10' : 'bg-warning/10'}`}>
          <View className="pt-0.5">
            <Icon icon={rejected ? CircleAlert : Clock} tone={rejected ? 'danger' : 'warning'} size={16} />
          </View>
          <View className="flex-1">
            <Text variant="caption">{rejected ? t('manage.rejected_note') : t('manage.pending_note')}</Text>
            {reasons.length > 0 ? (
              <Text variant="caption" tone="muted">
                {reasons.map((r) => t(`manage.reason.${r}`)).join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {quick.primary || quick.secondary.length > 0 ? (
        <View className="mt-3 flex-row gap-2 border-t border-border pt-2.5">
          {quick.primary ? (
            <View className="flex-1">
              <QuickButton
                action={quick.primary.action}
                variant={quick.primary.variant}
                labelKey={
                  quick.primary.action === 'returned'
                    ? returnedLabelKeys(listing.category).action
                    : quick.primary.action === 'rate'
                      ? rateLabelKey(listing.category)
                      : undefined
                }
                fill
                onPress={onAction}
              />
            </View>
          ) : null}
          {quick.secondary.map((action) =>
            quick.primary ? (
              <QuickButton key={action} action={action} variant="outline" bare={quick.secondary.length > 1} onPress={onAction} />
            ) : (
              <View key={action} className="flex-1">
                <QuickButton action={action} variant="outline" fill onPress={onAction} />
              </View>
            ),
          )}
        </View>
      ) : null}
    </Card>
  );
}

function QuickButton({
  action,
  variant,
  labelKey,
  fill = false,
  bare = false,
  onPress,
}: {
  action: MyListingQuickAction;
  variant: ButtonVariant;
  /** Đè chữ mặc định của QUICK (vd "Đã trả cho chủ" cho tin nhặt được). */
  labelKey?: string;
  fill?: boolean;
  /** Bỏ icon (hàng đủ 3 nút). */
  bare?: boolean;
  onPress: (action: MyListingQuickAction) => void;
}) {
  const { t } = useTranslation('listing');
  const q = QUICK[action];
  return (
    <Button
      size="sm"
      variant={variant}
      icon={bare ? undefined : q.icon}
      label={t(labelKey ?? q.label)}
      accessibilityLabel={q.a11y ? t(q.a11y) : undefined}
      fullWidth={fill}
      onPress={() => onPress(action)}
    />
  );
}

/** Khung chờ đúng hình thẻ quản lý (ảnh vuông · tiêu đề · giá · meta · hàng nút). */
export function MyListingRowSkeleton() {
  return (
    <Card padded={false} className="p-3">
      <View className="flex-row gap-3">
        <Skeleton className="size-24" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </View>
      </View>
      <View className="mt-3 flex-row gap-2 border-t border-border pt-2.5">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 w-24" />
      </View>
    </Card>
  );
}

// ── Menu ⋮ + xác nhận ────────────────────────────────────────────────────────────

type SheetView = 'menu' | 'sold' | 'delete' | 'returned' | 'rate';
type SheetState = { listing: MyListing; view: SheetView } | null;

/**
 * Thao tác trên thẻ quản lý (dùng chung màn "Tin của tôi", khối xem trước ở tab Tôi và tab "Quản lý tin" của mini-app):
 * `onMore` mở menu ⋮, `onAction` chạy nút nhanh (Đã bán → hỏi lại trong cùng sheet), `sheet` truyền thẳng cho
 * <ListingActionsSheet>. `mini`: trong mini-app → "Sửa" giữ luồng sửa ở lại mini-app.
 */
export function useMyListingActions(opts: { mini?: MiniSlug } = {}) {
  const run = useOwnerListingActions();
  const [state, setState] = useState<SheetState>(null);
  const edit = (id: string) => openEditListing(id, { mini: opts.mini });
  const onAction = (listing: MyListing, action: MyListingQuickAction) => {
    switch (action) {
      case 'edit':
        return edit(listing.id);
      case 'sold':
        return setState({ listing, view: 'sold' });
      case 'returned':
        return setState({ listing, view: 'returned' });
      case 'rate':
        return setState({ listing, view: 'rate' });
      case 'resubmit':
        return run.resubmit(listing.id);
      case 'renew':
        return run.renew(listing.id);
      case 'close':
        return run.close(listing.id);
      case 'reopen':
        return run.reopen(listing.id);
    }
  };
  return {
    onMore: (listing: MyListing) => setState({ listing, view: 'menu' }),
    onAction,
    sheet: { state, run, edit, onView: (view: SheetView) => setState((s) => (s ? { ...s, view } : s)), onClose: () => setState(null) },
  };
}

/** Menu thao tác + xác nhận (cùng một BottomSheet đổi nội dung). */
export function ListingActionsSheet({ sheet }: { sheet: ReturnType<typeof useMyListingActions>['sheet'] }) {
  const { t } = useTranslation('listing');
  const { state, run, edit, onView, onClose } = sheet;
  if (!state) return <BottomSheet open={false} onClose={onClose} />;

  const { listing, view } = state;
  // Sheet riêng (thẻ món đồ + nhắc đối chiếu) — style Stitch "Popup xác minh nhận lại đồ".
  if (view === 'returned') return <ReturnedSheet listing={listing} open onClose={onClose} />;
  if (view === 'rate') return <ListingRateSheet listingId={listing.id} open onClose={onClose} />;
  const a = ownerActions(listing);
  const canSell = canSellOf(listing, a.markSold);
  const canReturn = canMarkReturnedOf(listing, a.expired);
  const canReopen = a.reopen && !isReturned(listing);
  const canRate = featureOfCategory(listing.category) === 'lostFound' && isReturned(listing);
  const act = (fn: (id: string) => void) => () => {
    fn(listing.id);
    onClose();
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={view === 'sold' ? t('manage.sold_title') : view === 'delete' ? t('manage.delete_title') : listing.title}
    >
      {view === 'sold' ? (
        <Col gap={3}>
          <Text tone="muted">{t('manage.sold_body')}</Text>
          <Button label={t('manage.sold_confirm')} fullWidth onPress={act(run.markSold)} />
          <Button label={t('common:actions.cancel')} variant="outline" fullWidth onPress={onClose} />
        </Col>
      ) : view === 'delete' ? (
        <Col gap={3}>
          <Text tone="muted">{t('manage.delete_body')}</Text>
          <Button label={t('manage.delete_confirm')} variant="danger" fullWidth onPress={act(run.remove)} />
          <Button label={t('common:actions.cancel')} variant="outline" fullWidth onPress={() => onView('menu')} />
        </Col>
      ) : (
        <Col gap={2}>
          {a.resubmit ? <Button label={t('manage.resubmit')} icon={Send} fullWidth onPress={act(run.resubmit)} /> : null}
          <Button label={t('manage.edit')} icon={Pencil} variant="outline" fullWidth onPress={act(edit)} />
          {canSell ? <Button label={t('manage.mark_sold')} icon={CheckCircle2} variant="outline" fullWidth onPress={() => onView('sold')} /> : null}
          {canReturn ? (
            <Button
              label={t(returnedLabelKeys(listing.category).action)}
              icon={PackageCheck}
              variant="outline"
              fullWidth
              onPress={() => onView('returned')}
            />
          ) : null}
          {canRate ? (
            <Button label={t(rateLabelKey(listing.category))} icon={Star} variant="outline" fullWidth onPress={() => onView('rate')} />
          ) : null}
          {a.close ? <Button label={t('manage.mark_closed')} icon={Archive} variant="outline" fullWidth onPress={act(run.close)} /> : null}
          {canReopen ? <Button label={t('manage.reopen')} icon={RotateCcw} variant="outline" fullWidth onPress={act(run.reopen)} /> : null}
          {a.renew ? <Button label={t('manage.renew')} icon={CalendarClock} variant="outline" fullWidth onPress={act(run.renew)} /> : null}
          <Button label={t('manage.delete')} icon={Trash2} variant="ghost" fullWidth onPress={() => onView('delete')} />
        </Col>
      )}
    </BottomSheet>
  );
}

// Thẻ một tin ở tab "Quản lý tin" của mini-app (style Stitch "Quản lý tin đăng"): ảnh vuông 96 (tab Đang bán: nhãn danh mục;
// tab khác: nhãn trạng thái — Nháp / Chờ duyệt / Bị từ chối / Hết hạn / Đã ẩn / Đã bán) → tiêu đề 2 dòng + ⋮ (menu thao tác
// của "Tin của tôi": rút tin, gia hạn, xoá có hỏi lại…) → giá → nơi · thời gian → dải lượt xem (+ hết hạn) → chờ duyệt /
// bị từ chối: hộp lý do → hàng nút theo tab:
//   Đang bán: [Gia hạn (sắp hết hạn) | Đã bán (pass / phòng) | Đóng tin] + Sửa + Chia sẻ (icon, link web tenapp.vn/tin/…).
//   Chờ duyệt: bị từ chối → Gửi duyệt lại + Sửa; chờ → Sửa.
//   Đã bán: Đăng lại (mở lại tin) + Sửa + Chia sẻ.
//   Đã ẩn: nháp → Sửa; hết hạn → Gia hạn + Sửa; đã đóng → Đăng lại + Sửa.
// Thao tác chạy qua useMyListingActions (nơi gọi) — mutation lạc quan + toast ở engine, DB guard vẫn quyết định.
// Tin ngừng hiện (đã bán / ẩn / hết hạn): viền nét đứt, ảnh mờ 80%, chữ muted (vẫn ≥ 4,5:1) — trạng thái có nhãn chữ.
import type { FeatureListingsTab, MyListing } from '@hp/core';
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock,
  Eye,
  type LucideIcon,
  MapPin,
  MoreVertical,
  Pencil,
  RotateCcw,
  Send,
  Share2,
  Archive,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { formatDate, formatRelative } from '@/lib/format';
import { LISTING_STATUS_TONE, usePriceText } from '@/lib/listing';
import { Badge, Button, type ButtonVariant, Card, Icon, IconButton, ListingCover, Text } from '@/ui';
import { ownerActions, useShareListing } from '../../hooks';
import { useMiniApp, useMiniT } from '../../miniApp';
import { openEditListing, openListing } from '../../navigation';
import { canSellOf, type MyListingQuickAction } from '../MyListingRow';

export type MiniManageRowProps = {
  listing: MyListing;
  tab: FeatureListingsTab;
  /** Tên khu của tin (sites), null khi không gắn khu. */
  siteName: string | null;
  onMore: () => void;
  onAction: (action: MyListingQuickAction) => void;
};

type RowButton = { action: MyListingQuickAction | 'share'; label: string; icon: LucideIcon; variant: ButtonVariant };

/** Nhãn trạng thái ngắn của mini-app (key mini_app.manage.*_badge; đã bán / đang bán dùng common:status). */
const STATUS_KEY: Partial<Record<string, string>> = {
  draft: 'mini_app.manage.draft_badge',
  pending_review: 'mini_app.manage.pending_badge',
  rejected: 'mini_app.manage.rejected_badge',
  expired: 'mini_app.manage.expired_badge',
  closed: 'mini_app.manage.closed_badge',
};

/** Nút chính (rộng) + các nút icon theo tab và trạng thái — khớp chú thích đầu file. */
function buttonsOf(
  listing: MyListing,
  t: (key: string) => string,
  mt: (key: string) => string,
): { main: RowButton | null; icons: RowButton[] } {
  const a = ownerActions(listing);
  const edit: RowButton = { action: 'edit', label: mt('manage.edit'), icon: Pencil, variant: 'outline' };
  const share: RowButton = { action: 'share', label: mt('manage.share'), icon: Share2, variant: 'outline' };
  const renew: RowButton = { action: 'renew', label: mt('manage.renew'), icon: CalendarClock, variant: 'accent' };
  const repost: RowButton = { action: 'reopen', label: mt('manage.repost'), icon: RotateCcw, variant: 'outline' };
  if (listing.status === 'rejected') {
    return { main: { action: 'resubmit', label: t('manage.resubmit'), icon: Send, variant: 'primary' }, icons: [edit] };
  }
  if (listing.status === 'draft' || listing.status === 'pending_review') return { main: { ...edit, variant: 'primary' }, icons: [] };
  if (a.expired) return a.renew ? { main: renew, icons: [edit] } : { main: edit, icons: [] };
  if (listing.status === 'active') {
    if (a.renew) return { main: renew, icons: [edit, share] };
    if (canSellOf(listing, a.markSold)) {
      return { main: { action: 'sold', label: mt('manage.mark_sold'), icon: CheckCircle2, variant: 'outline' }, icons: [edit, share] };
    }
    return { main: a.close ? { action: 'close', label: t('manage.mark_closed'), icon: Archive, variant: 'outline' } : edit, icons: a.close ? [edit, share] : [share] };
  }
  if (listing.status === 'sold') return { main: a.reopen ? repost : edit, icons: a.reopen ? [edit, share] : [share] };
  return { main: a.reopen ? repost : edit, icons: a.reopen ? [edit] : [] };
}

export function MiniManageRow({ listing, tab, siteName, onMore, onAction }: MiniManageRowProps) {
  const { t, i18n } = useTranslation('listing');
  const mt = useMiniT();
  const { config } = useMiniApp();
  const price = usePriceText()(listing);
  const share = useShareListing();
  const a = ownerActions(listing);
  const status = a.expired ? 'expired' : listing.status;
  const statusKey = STATUS_KEY[status];
  const statusLabel = statusKey ? t(statusKey) : t(`common:status.${status}`);
  const inactive = status === 'sold' || status === 'closed' || status === 'expired';
  const review = listing.status === 'pending_review' || listing.status === 'rejected';
  const rejected = listing.status === 'rejected';
  const reasons = listing.moderation_reasons.filter((r) => i18n.exists(`listing:manage.reason.${r}`));
  const place = siteName ?? listing.address_text;
  const meta = [place, formatRelative(listing.created_at)].filter(Boolean).join(' · ');
  const views = [
    mt('manage.views', { count: listing.view_count }),
    listing.expires_at && listing.status === 'active' && !a.expired ? t('manage.expires_on', { date: formatDate(listing.expires_at) }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const { main, icons } = buttonsOf(listing, t, mt);
  // Tin công khai → xem như người khác thấy; nháp / chờ duyệt / bị từ chối → sửa. Cả hai giữ mini-app (`mini`).
  const mini = config.slug;
  const open = () => (review || listing.status === 'draft' ? openEditListing(listing.id, { mini }) : openListing(listing.id, { mini }));
  const press = (b: RowButton) => (b.action === 'share' ? share(listing) : onAction(b.action));

  return (
    <Card padded={false} className={['p-3', inactive && 'border-dashed'].filter(Boolean).join(' ')}>
      <View className="flex-row items-start gap-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={[listing.title, statusLabel, price, meta, views].filter(Boolean).join(', ')}
          onPress={open}
          className="flex-1 flex-row items-start gap-3 active:opacity-80"
        >
          <View className="size-24 overflow-hidden rounded-md border border-border">
            <ListingCover listing={listing} className={['size-full', inactive && 'opacity-80'].filter(Boolean).join(' ')} />
            <View className="absolute left-1.5 right-1.5 top-1.5">
              {tab === 'active' ? (
                <Badge overlay label={t(`category_short.${listing.category}`)} numberOfLines={1} />
              ) : (
                <Badge overlay label={statusLabel} tone={LISTING_STATUS_TONE[status]} numberOfLines={1} />
              )}
            </View>
          </View>
          <View className="flex-1 gap-1">
            <Text variant="label" weight="semibold" tone={inactive ? 'muted' : 'default'} numberOfLines={2}>
              {listing.title}
            </Text>
            {price ? (
              <Text variant="price" tone={inactive ? 'muted' : 'primary'} numberOfLines={1}>
                {price}
              </Text>
            ) : null}
            {meta ? (
              <View className="flex-row items-center gap-1">
                <Icon icon={MapPin} tone="muted" size={14} />
                <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
                  {meta}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        <IconButton
          icon={MoreVertical}
          accessibilityLabel={mt('manage.more_a11y', { title: listing.title })}
          onPress={onMore}
          className="-mr-2 -mt-2"
        />
      </View>

      <View className="mt-3 flex-row items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1.5">
        <Icon icon={Eye} tone="muted" size={16} />
        <Text variant="caption" tone="muted" className="flex-1">
          {views}
        </Text>
      </View>

      {review ? (
        <View className={`mt-2 flex-row items-start gap-2 rounded-md px-2.5 py-1.5 ${rejected ? 'bg-danger/10' : 'bg-warning/10'}`}>
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

      {main ? (
        <View className="mt-3 flex-row gap-2">
          <View className="flex-1">
            <Button size="sm" variant={main.variant} icon={main.icon} label={main.label} fullWidth onPress={() => press(main)} />
          </View>
          {icons.map((b) => (
            <Button key={b.action} size="sm" variant={b.variant} icon={b.icon} label={b.label} iconOnly onPress={() => press(b)} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

// Khối riêng của chi tiết tin theo config.detail.sections (style Stitch "Chi tiết phòng trọ") — dữ liệu theo ATTRIBUTE_GROUPS
// (@hp/shared, cùng nguồn với web), chữ theo config.detail.texts (thiếu → nhãn chung):
//   CostTable  — "Bảng chi phí sinh hoạt": ô 2 cột (icon nền primary-light + nhãn + giá trị đậm; giá 0 → "Miễn phí" màu
//                success kèm chữ) cho nhóm `costs`, trừ khoá đã lên dòng dưới giá (config.detail.priceNote).
//   SiteDistances — "Vị trí & khoảng cách": địa chỉ (address_text) + "vị trí gần đúng" → 3 khu gần nhất (distanceM từ toạ độ
//                đã làm tròn ~300 m của tin tới site_locations — useSiteLocations, sắp tăng dần; "1,5 km · ~3 phút xe máy" —
//                motorbikeMinutes) → nút mở bản đồ (texts.mapCta). Tin không có toạ độ → chỉ địa chỉ. Đang tải: khung chờ 3
//                hàng; lỗi: hàng lỗi gọn có Thử lại.
//   AmenityGrid — "Tiện nghi": ô 2 cột icon + nhãn cho thông số bool = true của nhóm `amenities` (không có → ẩn khối).
//   rulesLines — dòng nội quy (nhóm `rules`: "Giờ giấc: …", "Ở tối đa: 2 người") gộp vào thẻ mô tả ("Mô tả & nội quy").
// Khác Stitch (cố ý): không "Công tơ riêng", "Hoặc 12.000 đ/m³", ghi chú "Đặc thù ca kíp", địa điểm phụ (chợ, tạp hoá) — không
// có dữ liệu; khoảng cách là đường chim bay (không theo đường đi).
import type { PublicListing } from '@hp/core';
import { useSiteLocations } from '@hp/core/react';
import { ATTRIBUTE_GROUPS, type AttributeGroupKey, distanceM, motorbikeMinutes, readAttributes } from '@hp/shared';
import { BriefcaseBusiness, Factory, Map as MapIcon, MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatDistance } from '@/lib/format';
import { useAttributeText } from '@/lib/listing';
import { Button, Card, ErrorState, Icon, SectionHeader, Skeleton, Text } from '@/ui';
import { useOpenMap } from '../hooks';
import type { ListingDetailConfig } from '../types';
import { ATTRIBUTE_ICON } from './AttributeList';

type Source = Pick<PublicListing, 'category' | 'attributes'>;
type Texts = NonNullable<ListingDetailConfig['texts']>;

/** Số khu gần nhất hiện ở "Vị trí & khoảng cách". */
const NEAREST_SITES = 3;

/** Dòng readAttributes thuộc một nhóm ATTRIBUTE_GROUPS của category (theo thứ tự nhóm). */
function groupRows(listing: Source, group: AttributeGroupKey) {
  const keys = ATTRIBUTE_GROUPS[listing.category]?.find((g) => g.key === group)?.keys ?? [];
  const rows = readAttributes(listing.category, listing.attributes);
  return keys.flatMap((k) => rows.filter((r) => r.field.key === k));
}

export function CostTable({ listing, texts, skip }: { listing: Source; texts?: Texts; skip?: string }) {
  const { t } = useTranslation('listing');
  const text = useAttributeText();
  const rows = groupRows(listing, 'costs').filter((r) => r.field.key !== skip);
  if (rows.length === 0) return null;
  return (
    <View className="gap-2">
      <SectionHeader title={t(texts?.costs ?? 'attr_group.costs')} bar="primary" />
      <Card padded={false} className="flex-row flex-wrap gap-2 p-3">
        {rows.map(({ field, value }) => {
          const free = field.kind === 'money' && Number(value) === 0;
          const shown = free ? t('common:price.free') : text(field, value);
          return (
            <View
              key={field.key}
              accessible
              accessibilityLabel={`${t(`attr.${field.key}`)}: ${shown}`}
              className="min-h-16 min-w-36 flex-1 grow flex-row items-start gap-2.5 rounded-md border border-border bg-bg p-2.5"
            >
              <View className="size-9 items-center justify-center rounded-full bg-primary-light">
                <Icon icon={ATTRIBUTE_ICON[field.key] ?? BriefcaseBusiness} tone="primary" size={18} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text variant="caption" tone="muted">
                  {t(`attr.${field.key}`)}
                </Text>
                <Text variant="label" weight="bold" tone={free ? 'success' : undefined} selectable>
                  {shown}
                </Text>
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

export function SiteDistances({
  listing,
  texts,
}: {
  listing: Pick<PublicListing, 'lat' | 'lng' | 'address_text' | 'site_name'>;
  texts?: Texts;
}) {
  const { t } = useTranslation('listing');
  const point = listing.lat !== null && listing.lng !== null ? { lat: listing.lat, lng: listing.lng } : null;
  const sites = useSiteLocations({ enabled: !!point });
  const openMap = useOpenMap();
  const address = listing.address_text?.trim() || listing.site_name;
  if (!point && !address) return null;

  const nearest = point
    ? (sites.data ?? [])
        .map((s) => ({ ...s, meters: distanceM(point, s) }))
        .sort((a, b) => a.meters - b.meters)
        .slice(0, NEAREST_SITES)
    : [];
  const valueOf = (meters: number) =>
    texts?.distanceValue
      ? t(texts.distanceValue, { distance: formatDistance(meters), minutes: motorbikeMinutes(meters) })
      : formatDistance(meters);

  return (
    <View className="gap-2">
      <SectionHeader title={t(texts?.distance ?? 'detail.location')} bar="primary" />
      <Card className="gap-3">
        {address ? (
          <View className="flex-row items-start gap-2">
            <Icon icon={MapPin} tone="primary" size={18} />
            <View className="flex-1 gap-0.5">
              <Text variant="label" weight="semibold" selectable>
                {address}
              </Text>
              <Text variant="caption" tone="muted">
                {t('detail.approx_location')}
              </Text>
            </View>
          </View>
        ) : null}
        {point && sites.isLoading ? (
          <View className="gap-2">
            {Array.from({ length: NEAREST_SITES }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </View>
        ) : point && sites.isError ? (
          <ErrorState compact code={sites.error.code} onRetry={() => void sites.refetch()} />
        ) : (
          nearest.map((s) => (
            <View
              key={s.code}
              accessible
              accessibilityLabel={`${s.name}: ${valueOf(s.meters)}`}
              className="min-h-14 flex-row items-center gap-3 rounded-md border border-border bg-bg px-3 py-2"
            >
              <View className="size-9 items-center justify-center rounded-full bg-primary-light">
                <Icon icon={Factory} tone="primary" size={18} />
              </View>
              <Text variant="label" weight="semibold" className="flex-1">
                {s.name}
              </Text>
              <Text variant="caption" weight="semibold" tone="primary" className="shrink text-right">
                {valueOf(s.meters)}
              </Text>
            </View>
          ))
        )}
        {point && texts?.mapCta ? <Button variant="outline" icon={MapIcon} fullWidth label={t(texts.mapCta)} onPress={() => openMap(point)} /> : null}
      </Card>
    </View>
  );
}

export function AmenityGrid({ listing, texts }: { listing: Source; texts?: Texts }) {
  const { t } = useTranslation('listing');
  const rows = groupRows(listing, 'amenities').filter((r) => r.field.kind === 'bool' && r.value === true);
  if (rows.length === 0) return null;
  return (
    <View className="gap-2">
      <SectionHeader title={t(texts?.amenities ?? 'attr_group.amenities')} bar="primary" />
      <Card padded={false} className="flex-row flex-wrap gap-2 p-3">
        {rows.map(({ field }) => (
          <View
            key={field.key}
            accessible
            accessibilityLabel={t(`attr.${field.key}`)}
            className="min-h-12 min-w-36 flex-1 grow flex-row items-center gap-2.5 rounded-md bg-primary-light px-3 py-2"
          >
            <Icon icon={ATTRIBUTE_ICON[field.key] ?? BriefcaseBusiness} tone="primary" size={18} />
            <Text variant="label" weight="medium" className="flex-1">
              {t(`attr.${field.key}`)}
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

/** Dòng nội quy "Nhãn: giá trị" (nhóm `rules`) — gộp vào thẻ mô tả. */
export function useRulesLines() {
  const { t } = useTranslation('listing');
  const text = useAttributeText();
  return (listing: Source): string[] =>
    groupRows(listing, 'rules').map(({ field, value }) => `${t(`attr.${field.key}`)}: ${text(field, value)}`);
}

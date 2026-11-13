// Thông tin tin theo readAttributes (@hp/shared — cùng nguồn với Zod và web), style Stitch: lưới ô 2 cột trong Card —
// mỗi ô có icon theo thông số (ô size-8 nền primary-light), nhãn `attr.<key>` text-sm muted, giá trị đậm (chữ qua
// useAttributeText của @/lib/listing). Thông số chữ dài (yêu cầu, đặc điểm nhận dạng, nơi mất / nhặt, giờ giấc) chiếm cả
// hàng. `returned` không hiện ở đây (nhãn "Đã trả lại" + thông báo ở đầu chi tiết). Icon theo khoá thông số (giống web).
// Khối có tiêu đề riêng theo groupAttributeRows (@hp/shared — cùng nguồn với web, style Stitch "Chi tiết phòng trọ" /
// "Chi tiết việc làm"): trọ "Chi phí" (điện, nước, wifi, rác, cọc) · "Tiện nghi" · "Nội quy" (giờ giấc, số người); việc "Người
// phụ trách" (tên — SĐT chỉ qua Gọi ở thanh liên hệ) · "Yêu cầu" (đoạn chữ trong thẻ). Thông số còn lại ở lưới "Thông tin".
// Nhóm có khối riêng ở chi tiết (config.detail.sections — DetailSections) được bỏ qua ở đây (`skipGroups`).
import type { PublicListing } from '@hp/core';
import { type AttributeField, type AttributeValue, groupAttributeRows, readAttributes } from '@hp/shared';
import {
  AirVent,
  Baby,
  Bike,
  BriefcaseBusiness,
  Calendar,
  Cctv,
  CircleDollarSign,
  Clock,
  CookingPot,
  Droplet,
  Dumbbell,
  Gauge,
  HardDrive,
  Hash,
  Layers,
  ListChecks,
  type LucideIcon,
  MapPin,
  Package,
  Refrigerator,
  Ruler,
  ScanSearch,
  Shirt,
  ShieldCheck,
  Smartphone,
  Sofa,
  Sparkles,
  Tag,
  Toilet,
  Trash,
  User,
  Users,
  UserX,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useAttributeText } from '@/lib/listing';
import { Card, Icon, SectionHeader, Text } from '@/ui';

/** Icon theo khoá thông số (khoá trùng giữa các category — vd item_type — dùng chung một icon). Dùng lại ở DetailSections. */
export const ATTRIBUTE_ICON: Record<string, LucideIcon> = {
  brand: Tag,
  model: Smartphone,
  condition: Sparkles,
  warranty_months: ShieldCheck,
  vehicle_type: Bike,
  year: Calendar,
  odometer_km: Gauge,
  plate_prefix: Hash,
  item_type: Package,
  size: Ruler,
  area_m2: Ruler,
  electricity_price: Zap,
  water_price: Droplet,
  wifi_price: Wifi,
  trash_price: Trash,
  deposit_months: Wallet,
  has_loft: Layers,
  has_ac: AirVent,
  private_wc: Toilet,
  has_kitchen: CookingPot,
  has_wifi: Wifi,
  has_camera: Cctv,
  has_parking: Bike,
  free_hours: Clock,
  no_landlord: UserX,
  curfew: Clock,
  max_people: Users,
  shift: Clock,
  salary_min: CircleDollarSign,
  salary_max: CircleDollarSign,
  pay_type: Wallet,
  requirements: ListChecks,
  contact_name: User,
  lost_at: Clock,
  place: MapPin,
  identifying_marks: ScanSearch,
  device_type: Smartphone,
  storage: HardDrive,
  home_type: Sofa,
  appliance_type: Refrigerator,
  capacity: Gauge,
  fashion_type: Shirt,
  sport_type: Dumbbell,
  tool_type: Wrench,
  baby_type: Baby,
  age_range: Baby,
};

/** Thông số chữ dài → ô chiếm cả hàng. */
const WIDE = new Set(['requirements', 'identifying_marks', 'place', 'curfew']);
const HIDDEN = new Set(['returned']);

type Row = { field: AttributeField; value: AttributeValue };

/** Thông tin. `skipGroups`: nhóm đã có khối riêng ở chi tiết (config.detail.sections — chi phí, tiện nghi, nội quy). */
export function AttributeList({
  listing,
  skipGroups,
}: {
  listing: Pick<PublicListing, 'category' | 'attributes'>;
  skipGroups?: readonly string[];
}) {
  const { t } = useTranslation('listing');
  const text = useAttributeText();
  const rows = readAttributes(listing.category, listing.attributes).filter((r) => !HIDDEN.has(r.field.key));
  if (rows.length === 0) return null;
  const grouped = groupAttributeRows(listing.category, rows);
  const general = grouped.general;
  const groups = grouped.groups.filter((g) => !skipGroups?.includes(g.key));
  return (
    <>
      {general.length > 0 ? (
        <View className="gap-2">
          <SectionHeader title={t('detail.attributes')} bar="primary" />
          <AttributeCells rows={general} />
        </View>
      ) : null}
      {groups.map((g) => (
        <View key={g.key} className="gap-2">
          <SectionHeader title={t(`attr_group.${g.key}`)} bar="primary" />
          {g.layout === 'text' ? (
            <Card className="gap-2">
              {g.rows.map(({ field, value }) => (
                <Text key={field.key} selectable>
                  {text(field, value)}
                </Text>
              ))}
            </Card>
          ) : (
            <AttributeCells rows={g.rows} />
          )}
        </View>
      ))}
    </>
  );
}

/** Lưới ô thông số (icon + nhãn + giá trị) trong Card. */
function AttributeCells({ rows }: { rows: Row[] }) {
  const { t } = useTranslation('listing');
  const text = useAttributeText();
  return (
    <Card padded={false} className="flex-row flex-wrap gap-2 p-3">
      {rows.map(({ field, value }) => (
        <View
          key={field.key}
          accessible
          accessibilityLabel={`${t(`attr.${field.key}`)}: ${text(field, value)}`}
          // Hai ô / hàng: basis-[48%] không dùng được (giá trị tuỳ ý) → grow + min-w-36 cho ô ngắn, w-full cho ô chữ dài.
          className={[
            'min-h-14 flex-row items-start gap-2.5 rounded-md border border-border bg-bg p-2.5',
            WIDE.has(field.key) ? 'w-full' : 'min-w-36 flex-1 grow',
          ].join(' ')}
        >
          <View className="size-8 items-center justify-center rounded-sm bg-primary-light">
            <Icon icon={ATTRIBUTE_ICON[field.key] ?? BriefcaseBusiness} tone="primary" size={18} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text variant="caption" tone="muted">
              {t(`attr.${field.key}`)}
            </Text>
            <Text variant="label" weight="semibold" selectable>
              {text(field, value)}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

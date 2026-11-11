// Thông tin tin (readAttributes của @hp/shared) dạng lưới ô — style Stitch, khớp AttributeList của app: mỗi ô có icon theo
// thông số (ô size-8 nền primary-light), nhãn text-sm muted, giá trị đậm; thông số chữ dài (yêu cầu, đặc điểm nhận dạng,
// nơi mất / nhặt, giờ giấc) chiếm cả hàng. `returned` không hiện (nhãn "Đã trả lại" ở đầu trang). Server Component.
// AttributeSections (khớp AttributeList của app): lưới "Thông tin" chung + khối có tiêu đề theo groupAttributeRows của
// @hp/shared — trọ "Chi phí" / "Nội quy", việc "Người phụ trách" (tên; SĐT chỉ qua Gọi) / "Yêu cầu" (đoạn chữ).
import { type AttributeField, type AttributeValue, groupAttributeRows, type ListingCategory } from '@hp/shared';
import {
  Baby,
  Bike,
  BriefcaseBusiness,
  Calendar,
  CalendarRange,
  CircleDollarSign,
  Clock,
  Droplet,
  Dumbbell,
  Gauge,
  HardDrive,
  Hash,
  Layers,
  ListChecks,
  type LucideIcon,
  MapPin,
  MonitorSmartphone,
  Package,
  Refrigerator,
  Ruler,
  Scale,
  ScanSearch,
  Shirt,
  ShieldCheck,
  Smartphone,
  Sofa,
  Sparkles,
  Tag,
  User,
  Users,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarHeading } from './safety-tip';

/** Icon theo khoá thông số — giống ATTRIBUTE_ICON của app (apps/mobile/src/features/listing/components/AttributeList.tsx). */
const ATTRIBUTE_ICON: Record<string, LucideIcon> = {
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
  has_loft: Layers,
  has_parking: Bike,
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
  // Loại đồ theo danh mục Pass đồ (cùng icon với thẻ danh mục — features/pass/config.ts).
  device_type: MonitorSmartphone,
  storage: HardDrive,
  home_type: Sofa,
  appliance_type: Refrigerator,
  capacity: Scale,
  fashion_type: Shirt,
  sport_type: Dumbbell,
  tool_type: Wrench,
  baby_type: Baby,
  age_range: CalendarRange,
};

const WIDE = new Set(['requirements', 'identifying_marks', 'place', 'curfew']);
export const HIDDEN_ATTRIBUTES = new Set(['returned']);

export function AttributeGrid({
  rows,
  label,
  valueText,
  lang,
}: {
  rows: { field: AttributeField; value: AttributeValue }[];
  /** Nhãn thông số (`listing.attr.<key>`). */
  label: (key: string) => string;
  valueText: (field: AttributeField, value: AttributeValue) => string;
  /** Ngôn ngữ của tin (giá trị chữ do người đăng nhập). */
  lang: string;
}) {
  return (
    <dl className="grid gap-2 rounded-lg border border-border bg-surface p-3 grid-cols-2 shadow-card">
      {rows.map(({ field, value }) => {
        const Icon = ATTRIBUTE_ICON[field.key] ?? BriefcaseBusiness;
        return (
          <div
            key={field.key}
            className={cn('flex min-h-14 items-start gap-2.5 rounded-md border border-border bg-bg p-2.5', (WIDE.has(field.key) || rows.length === 1) && 'col-span-2')}
          >
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary-light text-primary">
              <Icon strokeWidth={1.75} className="size-4.5" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-sm text-muted">{label(field.key)}</dt>
              <dd lang={field.kind === 'text' ? lang : undefined} className="text-md font-semibold break-words text-fg">
                {valueText(field, value)}
              </dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

type Row = { field: AttributeField; value: AttributeValue };

/** Các khối thông số của trang chi tiết: "Thông tin" (lưới chung) + khối theo nhóm của category. Không có dòng → null. */
export function AttributeSections({
  category,
  rows,
  title,
  groupTitle,
  label,
  valueText,
  lang,
}: {
  category: ListingCategory;
  rows: Row[];
  /** Tiêu đề lưới chung (`listing.detail.attributes`). */
  title: string;
  /** Tiêu đề khối (`listing.attr_group.<key>`). */
  groupTitle: (key: string) => string;
  label: (key: string) => string;
  valueText: (field: AttributeField, value: AttributeValue) => string;
  lang: string;
}) {
  if (rows.length === 0) return null;
  const { general, groups } = groupAttributeRows(category, rows);
  return (
    <>
      {general.length > 0 ? (
        <section aria-labelledby="attributes-heading" className="flex flex-col gap-2">
          <BarHeading id="attributes-heading" tone="primary">
            {title}
          </BarHeading>
          <AttributeGrid rows={general} label={label} valueText={valueText} lang={lang} />
        </section>
      ) : null}
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`attributes-${g.key}-heading`} className="flex flex-col gap-2">
          <BarHeading id={`attributes-${g.key}-heading`} tone="primary">
            {groupTitle(g.key)}
          </BarHeading>
          {g.layout === 'text' ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-card">
              {g.rows.map(({ field, value }) => (
                <p key={field.key} lang={lang} className="text-md whitespace-pre-line break-words text-fg">
                  {valueText(field, value)}
                </p>
              ))}
            </div>
          ) : (
            <AttributeGrid rows={g.rows} label={label} valueText={valueText} lang={lang} />
          )}
        </section>
      ))}
    </>
  );
}

// Thông tin tin (readAttributes của @hp/shared) dạng lưới ô — style Stitch, khớp AttributeList của app: mỗi ô có icon theo
// thông số (ô size-8 nền primary-light), nhãn text-sm muted, giá trị đậm; thông số chữ dài (yêu cầu, đặc điểm nhận dạng,
// nơi mất / nhặt, giờ giấc) chiếm cả hàng. `returned` không hiện (nhãn "Đã trả lại" ở đầu trang). Server Component.
import type { AttributeField, AttributeValue } from '@hp/shared';
import {
  Bike,
  BriefcaseBusiness,
  Calendar,
  CircleDollarSign,
  Clock,
  Droplet,
  Gauge,
  Hash,
  Layers,
  ListChecks,
  type LucideIcon,
  MapPin,
  Package,
  Ruler,
  ScanSearch,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  User,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
            className={cn('flex min-h-14 items-start gap-2.5 rounded-md border border-border bg-bg p-2.5', WIDE.has(field.key) && 'col-span-2')}
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

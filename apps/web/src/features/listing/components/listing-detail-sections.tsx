// Khối trang chi tiết theo config tính năng (config.detail.sections — Stitch "Chi tiết phòng trọ", khớp app), Server
// Component. Thay khối thông số + mô tả mặc định của listing-detail.tsx khi tính năng có `detail.sections`:
// - costs: "Bảng chi phí sinh hoạt" 2×2 — các khoản tiền của nhóm `costs` (ATTRIBUTE_GROUPS: điện / nước / wifi / rác) trừ
//   `exclude` (tháng cọc — đã ở dưới giá); 0 → "Miễn phí".
// - distance: "Vị trí & khoảng cách" — khu vực (address_text: thôn / xã người đăng tự nhập, không phải địa chỉ chi tiết) +
//   `nearest` khu gần nhất: khoảng cách chim bay từ toạ độ ĐÃ LÀM TRÒN ~300 m của view public_listings tới toạ độ khu
//   (site_locations, cache theo giờ) + phút xe máy ước lượng (distanceM / motorbikeMinutes của @hp/shared) + link bản đồ
//   Google Maps chỉ căn giữa toạ độ gần đúng (map_action=map, KHÔNG thả ghim) + dòng "Vị trí gần đúng (~300 m)".
// - amenities: "Tiện nghi" — ô icon + tên các thông số bool = true của nhóm `amenities`.
// - attributes: lưới "Thông tin" các thông số còn lại (diện tích…).
// - description: "Mô tả & nội quy" — mô tả (nút Dịch như cũ) + thông số nhóm `group` (giờ giấc, ở tối đa).
// Khối không có dữ liệu → không hiện. Khác Stitch (cố ý): không mốc "Chợ / KCN VSIP" ngoài bảng sites, không ghi chú dưới từng
// khoản ("Đồng hồ riêng…"), không "Đặc thù ca kíp" — chưa có dữ liệu.
import type { PublicListing, SiteLocation } from '@hp/core';
import {
  ATTRIBUTE_GROUPS,
  type AttributeField,
  type AttributeValue,
  distanceM,
  formatDistance,
  type Locale,
  motorbikeMinutes,
} from '@hp/shared';
import { CircleCheck, Factory, MapPin, Navigation } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { asLocale, attributeText } from '../display';
import type { ListingDetailDisplay, ListingDetailSection } from '../feature-config';
import { getSiteLocations } from '../queries';
import { AttributeGrid, attributeIcon } from './attribute-grid';
import { TranslatableText } from './listing-translation';
import { BarHeading } from './safety-tip';

type Row = { field: AttributeField; value: AttributeValue };

const CARD = 'rounded-lg border border-border bg-surface p-4 shadow-card';

/** Khoá thông số đã có chỗ trong các khối của trang (không lặp ở lưới "Thông tin"). */
function takenKeys(listing: PublicListing, detail: ListingDetailDisplay): Set<string> {
  const groups = ATTRIBUTE_GROUPS[listing.category] ?? [];
  const keysOf = (key: string) => groups.find((g) => g.key === key)?.keys ?? [];
  const taken = new Set<string>(detail.priceNote ? [detail.priceNote.attribute] : []);
  for (const s of detail.sections ?? []) {
    const keys = s.kind === 'costs' || s.kind === 'amenities' ? keysOf(s.kind) : s.kind === 'description' && s.group ? keysOf(s.group) : [];
    for (const k of keys) taken.add(k);
  }
  return taken;
}

/** Các khối `sections` (theo thứ tự) — `all` là cả danh sách của config (để biết thông số nào đã có chỗ). */
export async function ListingDetailSections({
  listing,
  detail,
  sections,
  rows,
}: {
  listing: PublicListing;
  detail: ListingDetailDisplay;
  sections: readonly ListingDetailSection[];
  rows: Row[];
}) {
  const locale = asLocale(await getLocale());
  const needsSites = sections.some((s) => s.kind === 'distance');
  const sites = needsSites ? await getSiteLocations() : [];
  return sections.map((s) => (
    <Section key={s.kind} section={s} listing={listing} detail={detail} rows={rows} sites={sites} locale={locale} />
  ));
}

async function Section({
  section,
  listing,
  detail,
  rows,
  sites,
  locale,
}: {
  section: ListingDetailSection;
  listing: PublicListing;
  detail: ListingDetailDisplay;
  rows: Row[];
  sites: SiteLocation[];
  locale: Locale;
}) {
  const t = await getTranslations();
  const groups = ATTRIBUTE_GROUPS[listing.category] ?? [];
  const byKey = new Map(rows.map((r) => [r.field.key, r]));
  const groupRows = (key: string) =>
    (groups.find((g) => g.key === key)?.keys ?? []).map((k) => byKey.get(k)).filter((r): r is Row => r !== undefined);
  const id = `detail-${section.kind}-heading`;
  const heading = (title: string) => (
    <BarHeading id={id} tone="primary">
      {title}
    </BarHeading>
  );

  switch (section.kind) {
    case 'costs': {
      const exclude = new Set(section.exclude ?? []);
      const costs = groupRows('costs').filter((r) => r.field.kind === 'money' && !exclude.has(r.field.key));
      if (costs.length === 0) return null;
      return (
        <section aria-labelledby={id} className="flex flex-col gap-2">
          {heading(t(section.titleKey))}
          <dl className={cn(CARD, 'grid grid-cols-2 gap-2 p-3')}>
            {costs.map(({ field, value }) => {
              const Icon = attributeIcon(field.key);
              const free = Number(value) === 0;
              return (
                <div key={field.key} className="flex min-h-16 items-start gap-2.5 rounded-md border border-border bg-bg p-3">
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary-light text-primary">
                    <Icon strokeWidth={1.75} className="size-5" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <dt className="text-sm text-muted">{t(`listing.attr.${field.key}`)}</dt>
                    <dd className={free ? 'text-md font-bold text-primary' : 'text-md font-bold break-words text-fg'}>
                      {free ? t(section.freeKey) : attributeText(field, value, t, locale)}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </section>
      );
    }

    case 'distance': {
      const address = listing.address_text?.trim();
      const origin = listing.lat !== null && listing.lng !== null ? { lat: listing.lat, lng: listing.lng } : null;
      const nearest = origin
        ? sites
            .map((s) => ({ site: s, m: distanceM(origin, s) }))
            .sort((a, b) => a.m - b.m)
            .slice(0, section.nearest)
        : [];
      if (!address && nearest.length === 0 && !listing.site_name) return null;
      const mapHref = origin
        ? `https://www.google.com/maps/@?api=1&map_action=map&center=${origin.lat},${origin.lng}&zoom=15`
        : null;
      return (
        <section aria-labelledby={id} className="flex flex-col gap-2">
          {heading(t(section.titleKey))}
          <div className={cn(CARD, 'flex flex-col gap-3')}>
            {address || listing.site_name ? (
              <p className="flex items-start gap-2 text-md font-medium text-fg" lang={address ? listing.lang : undefined}>
                <MapPin aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-primary" />
                {address || listing.site_name}
              </p>
            ) : null}
            {nearest.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {nearest.map(({ site, m }) => (
                  <li key={site.code} className="flex items-center gap-3 rounded-md border border-border bg-bg p-3">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary-light text-primary">
                      <Factory strokeWidth={1.75} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1 text-md font-semibold text-fg">{site.name}</span>
                    <span className="shrink-0 text-right text-sm font-semibold text-primary">
                      {t(section.valueKey, { distance: formatDistance(m, locale), minutes: motorbikeMinutes(m) })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {mapHref ? (
              <Button asChild variant="outline" size="lg" className="font-semibold text-primary">
                <a href={mapHref} target="_blank" rel="noopener noreferrer">
                  <Navigation aria-hidden strokeWidth={1.75} />
                  {t(section.mapKey)}
                </a>
              </Button>
            ) : null}
            <p className="text-sm text-muted">{t('listing.detail.approx_location')}</p>
          </div>
        </section>
      );
    }

    case 'amenities': {
      const on = groupRows('amenities').filter((r) => r.field.kind === 'bool' && r.value === true);
      if (on.length === 0) return null;
      return (
        <section aria-labelledby={id} className="flex flex-col gap-2">
          {heading(t(section.titleKey))}
          <ul className={cn(CARD, 'grid grid-cols-2 gap-2 p-3')}>
            {on.map(({ field }) => {
              const Icon = attributeIcon(field.key);
              return (
                <li key={field.key} className="flex min-h-12 items-center gap-2.5 rounded-md bg-primary-light/60 px-3 py-2 text-md font-medium text-fg">
                  <Icon aria-hidden strokeWidth={1.75} className="size-5 shrink-0 text-primary" />
                  {t(`listing.attr.${field.key}`)}
                </li>
              );
            })}
          </ul>
        </section>
      );
    }

    case 'attributes': {
      const taken = takenKeys(listing, detail);
      const rest = rows.filter((r) => !taken.has(r.field.key));
      if (rest.length === 0) return null;
      return (
        <section aria-labelledby={id} className="flex flex-col gap-2">
          {heading(t('listing.detail.attributes'))}
          <AttributeGrid
            rows={rest}
            label={(key) => t(`listing.attr.${key}`)}
            valueText={(field, value) => attributeText(field, value, t, locale)}
            lang={listing.lang}
          />
        </section>
      );
    }

    case 'description': {
      const rules = section.group ? groupRows(section.group) : [];
      return (
        <section aria-labelledby={id} className="flex flex-col gap-2">
          {heading(t(section.titleKey))}
          <div className={cn(CARD, 'flex flex-col gap-3')}>
            {listing.description?.trim() ? (
              <TranslatableText
                as="p"
                field="description"
                original={listing.description}
                lang={listing.lang}
                className="text-md whitespace-pre-line text-fg"
              />
            ) : (
              <p className="text-md text-muted">{t('listing.detail.no_description')}</p>
            )}
            {rules.length > 0 ? (
              <dl className="flex flex-col gap-2 border-t border-border pt-3">
                {rules.map(({ field, value }) => (
                  <div key={field.key} className="flex items-start gap-2">
                    <dt className="flex shrink-0 items-start gap-2 text-md text-muted">
                      <CircleCheck aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-primary" />
                      {t(`listing.attr.${field.key}`)}
                    </dt>
                    <dd lang={field.kind === 'text' ? listing.lang : undefined} className="min-w-0 text-md font-semibold break-words text-fg">
                      {attributeText(field, value, t, locale)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>
      );
    }
  }
}

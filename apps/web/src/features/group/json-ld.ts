// JSON-LD trang chi tiết nhóm theo loại trong config.ts (.claude/rules/web-seo-public.md: ghép trận `Event`; ghép xe cũng
// là một sự kiện có giờ + nơi tập trung thật — đổi `jsonLd: null` trong features/ride/config.ts nếu không muốn).
// Chỉ dữ liệu có thật: không toạ độ (kể cả đã làm tròn), không thông tin liên hệ; người tổ chức chỉ tên rút gọn "An N.".
// Nhóm đã huỷ → eventStatus EventCancelled (Google khuyên giữ trang + đánh dấu huỷ thay vì gỡ).
// Ghép trận chọn sân trong danh mục (venue_id): Place = tên + địa chỉ sân (dữ liệu công khai đã duyệt, không toạ độ).
import type { PublicGroup } from '@hp/core';
import { groupVenueText } from './display';
import type { GroupFeatureConfig } from './feature-config';

type JsonLdObject = Record<string, unknown>;

export function groupJsonLd(
  group: PublicGroup,
  kind: GroupFeatureConfig['jsonLd'],
  opts: { url: string; subKindName: string },
): JsonLdObject | null {
  if (!kind) return null;
  const fee = Number(group.fee_per_person);
  const seatsLeft = group.seats_left ?? Math.max(0, group.seats_total - group.seats_taken);
  const place = group.destination_text ? group.origin_text : groupVenueText(group);
  const location = group.destination_text ? `${group.origin_text} → ${group.destination_text}` : place;
  const street = !group.destination_text && group.venue_address?.trim() ? { streetAddress: group.venue_address.trim() } : {};

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: group.title,
    description: group.description?.trim() || `${opts.subKindName} · ${location}`,
    url: opts.url,
    startDate: group.starts_at,
    ...(group.ends_at ? { endDate: group.ends_at } : {}),
    eventStatus: group.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: place,
      address: group.site_name
        ? { '@type': 'PostalAddress', ...street, addressLocality: group.site_name, addressCountry: 'VN' }
        : { '@type': 'PostalAddress', ...street, addressCountry: 'VN' },
    },
    ...(group.host_name ? { organizer: { '@type': 'Person', name: group.host_name } } : {}),
    maximumAttendeeCapacity: group.seats_total,
    remainingAttendeeCapacity: seatsLeft,
    offers: {
      '@type': 'Offer',
      price: Number.isFinite(fee) ? fee : 0,
      priceCurrency: 'VND',
      availability: group.status === 'open' && seatsLeft > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      url: opts.url,
      validFrom: group.created_at,
    },
  };
}

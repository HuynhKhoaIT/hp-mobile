// JSON-LD trang chi tiết tin theo loại trong config.ts (.claude/rules/web-seo-public.md): pass đồ Product + Offer (VND),
// việc làm JobPosting (validThrough = expires_at), trọ Accommodation. Chỉ dữ liệu có thật: trường trống thì bỏ,
// không bịa hãng / nhà tuyển dụng. Không đưa toạ độ (kể cả đã làm tròn) và không đưa thông tin người đăng.
import type { PublicListing } from '@hp/core';
import { type AttributeValue, priceLabel, readAttributes } from '@hp/shared';
import { listingImageUrl } from '@/lib/images';
import type { ListingFeatureConfig } from './feature-config';

type JsonLdObject = Record<string, unknown>;

const PAY_UNIT = { hour: 'HOUR', day: 'DAY', month: 'MONTH' } as const;
const CONDITION = {
  new: 'https://schema.org/NewCondition',
  like_new: 'https://schema.org/UsedCondition',
  used: 'https://schema.org/UsedCondition',
} as const;

function attrs(listing: PublicListing): Record<string, AttributeValue> {
  return Object.fromEntries(readAttributes(listing.category, listing.attributes).map((a) => [a.field.key, a.value]));
}

const address = (listing: PublicListing) =>
  listing.site_name
    ? { '@type': 'PostalAddress', addressLocality: listing.site_name, addressCountry: 'VN' }
    : { '@type': 'PostalAddress', addressCountry: 'VN' };

export function listingJsonLd(
  listing: PublicListing,
  kind: ListingFeatureConfig['jsonLd'],
  opts: { url: string; categoryName: string },
): JsonLdObject | null {
  if (!kind) return null;
  const a = attrs(listing);
  const images = listing.images.map((p) => listingImageUrl(p, 'full'));
  const description = listing.description?.trim() || listing.title;
  const base = { '@context': 'https://schema.org', name: listing.title, description, url: opts.url, ...(images.length ? { image: images } : {}) };
  const price = priceLabel(listing);

  if (kind === 'product') {
    const condition = typeof a.condition === 'string' && a.condition in CONDITION ? CONDITION[a.condition as keyof typeof CONDITION] : undefined;
    const amount = price.type === 'money' ? price.amount : price.type === 'free' ? 0 : null;
    return {
      ...base,
      '@type': 'Product',
      category: opts.categoryName,
      ...(typeof a.brand === 'string' ? { brand: { '@type': 'Brand', name: a.brand } } : {}),
      // Giá "thoả thuận" không có con số thật → không có Offer.
      ...(amount !== null
        ? {
            offers: {
              '@type': 'Offer',
              price: amount,
              priceCurrency: 'VND',
              availability: 'https://schema.org/InStock',
              url: opts.url,
              ...(condition ? { itemCondition: condition } : {}),
              ...(listing.expires_at ? { priceValidUntil: listing.expires_at.slice(0, 10) } : {}),
            },
          }
        : {}),
    };
  }

  if (kind === 'job') {
    const unit = price.type === 'range' || price.type === 'money' ? (price.per ? PAY_UNIT[price.per] : undefined) : undefined;
    const salary =
      price.type === 'range'
        ? { '@type': 'QuantitativeValue', minValue: price.min, ...(price.max !== null ? { maxValue: price.max } : {}), ...(unit ? { unitText: unit } : {}) }
        : price.type === 'money'
          ? { '@type': 'QuantitativeValue', value: price.amount, ...(unit ? { unitText: unit } : {}) }
          : null;
    return {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: listing.title,
      description,
      url: opts.url,
      datePosted: listing.created_at,
      ...(listing.expires_at ? { validThrough: listing.expires_at } : {}),
      employmentType: listing.category === 'job_parttime' ? 'PART_TIME' : 'FULL_TIME',
      ...(typeof a.contact_name === 'string' ? { hiringOrganization: { '@type': 'Organization', name: a.contact_name } } : {}),
      jobLocation: { '@type': 'Place', address: address(listing) },
      ...(salary ? { baseSalary: { '@type': 'MonetaryAmount', currency: 'VND', value: salary } } : {}),
    };
  }

  // accommodation
  return {
    ...base,
    '@type': 'Accommodation',
    address: address(listing),
    ...(typeof a.area_m2 === 'number' ? { floorSize: { '@type': 'QuantitativeValue', value: a.area_m2, unitCode: 'MTK' } } : {}),
    ...(typeof a.max_people === 'number' ? { occupancy: { '@type': 'QuantitativeValue', maxValue: a.max_people } } : {}),
  };
}

// Input đăng / sửa tin — form app + web dùng chung, khớp ràng buộc cột public.listings (migration 20261031110000).
// Mã lỗi (message) là key ns errors. Kiểm duyệt nội dung ở DB (trigger), không ở đây.
import { z } from 'zod';
import { LISTING_CATEGORIES, PRICE_TYPES, type ListingCategory } from '../../enums';
import { LOCALES } from '../../locales';
import { featureOfCategory } from '../../listing-display';
import { SiteCode } from '../profile';
import { ListingAttributes } from './attributes';

/** Path ảnh trong bucket listing-images: {user_id}/{listing_id}/{tên}.webp|jpg */
export const ListingImagePath = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[\w.-]+\.(webp|jpg)$/, 'invalid_input');

export const MAX_LISTING_IMAGES = 10;

/** Giá bắt buộc khi "giá cố định" — trừ việc làm (lương ở attributes) và đồ thất lạc (không có giá). */
export function priceRequired(category: ListingCategory, priceType: string): boolean {
  const feature = featureOfCategory(category);
  return priceType === 'fixed' && feature !== 'job' && feature !== 'lostFound';
}

const fields = {
  title: z.string().trim().min(5, 'too_short').max(120, 'too_long'),
  description: z.string().trim().max(5000, 'too_long').nullable(),
  price_type: z.enum(PRICE_TYPES),
  price: z.number().int('invalid_input').min(0, 'invalid_input').max(100_000_000_000, 'invalid_input').nullable(),
  attributes: z.record(z.string(), z.unknown()),
  site: SiteCode.nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  address_text: z.string().trim().max(200, 'too_long').nullable(),
  images: z.array(ListingImagePath).max(MAX_LISTING_IMAGES, 'too_many_images'),
  lang: z.enum(LOCALES),
};

type Checked = {
  category: ListingCategory;
  price_type?: string;
  price?: number | null;
  attributes?: Record<string, unknown>;
};

/** Kiểm attributes theo category + giá bắt buộc. Lỗi gắn vào path để form hiện dưới đúng ô. */
function refineListing(v: Checked, ctx: z.RefinementCtx) {
  if (v.attributes) {
    const parsed = ListingAttributes[v.category].safeParse(v.attributes);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: 'custom', path: ['attributes', ...issue.path], message: issue.code === 'unrecognized_keys' ? 'invalid_input' : issue.message.startsWith('too_') ? issue.message : 'invalid_input' });
      }
    }
  }
  if (v.price_type && priceRequired(v.category, v.price_type) && !(v.price && v.price > 0)) {
    ctx.addIssue({ code: 'custom', path: ['price'], message: 'price_required' });
  }
}

/** Đăng tin mới. status: draft (lưu nháp / chờ upload ảnh) hoặc active (đăng ngay; DB có thể chuyển chờ duyệt). */
export const CreateListingInput = z
  .object({
    category: z.enum(LISTING_CATEGORIES),
    status: z.enum(['draft', 'active']).default('active'),
    title: fields.title,
    description: fields.description.default(null),
    price_type: fields.price_type.default('fixed'),
    price: fields.price.default(null),
    attributes: fields.attributes.default({}),
    site: fields.site.default(null),
    lat: fields.lat.default(null),
    lng: fields.lng.default(null),
    address_text: fields.address_text.default(null),
    images: fields.images.default([]),
    lang: fields.lang.default('vi'),
  })
  .strict()
  .superRefine(refineListing);
export type CreateListingInput = z.input<typeof CreateListingInput>;

/** Sửa tin (category không đổi được — DB guard). Chỉ gửi trường đổi; category gửi kèm để kiểm attributes / giá. */
export const UpdateListingInput = z
  .object({
    id: z.uuid('invalid_input'),
    category: z.enum(LISTING_CATEGORIES),
    status: z.enum(['draft', 'active']).optional(),
    title: fields.title.optional(),
    description: fields.description.optional(),
    price_type: fields.price_type.optional(),
    price: fields.price.optional(),
    attributes: fields.attributes.optional(),
    site: fields.site.optional(),
    lat: fields.lat.optional(),
    lng: fields.lng.optional(),
    address_text: fields.address_text.optional(),
    images: fields.images.optional(),
    lang: fields.lang.optional(),
  })
  .strict()
  .superRefine(refineListing);
export type UpdateListingInput = z.input<typeof UpdateListingInput>;

/** Trạng thái chủ tin tự đặt được (khớp trg_listings_guard). */
export const OWNER_LISTING_STATUSES = ['draft', 'active', 'sold', 'closed'] as const;
export type OwnerListingStatus = (typeof OWNER_LISTING_STATUSES)[number];

// Zod cho Gọi thợ: yêu cầu, báo giá, đánh giá, bộ lọc. Khớp ràng buộc cột public.service_requests / service_quotes +
// trigger trg_service_requests_guard + RPC submit_quote_tx (migration 20261128090000_service_requests). Mã lỗi = key ns errors.
import { z } from 'zod';
import { SERVICE_TRADES, SERVICE_URGENCIES } from '../../enums';
import { LOCALES } from '../../locales';
import { SERVICE_REQUEST_RULES as R } from '../../service-request-display';
import { SiteCode } from '../profile';

const lat = z.number().min(-90).max(90).nullable();
const lng = z.number().min(-180).max(180).nullable();
const money = z.number().int('invalid_input').min(0, 'invalid_input').max(R.priceMax, 'invalid_input');

const fields = {
  title: z.string().trim().min(R.titleMin, 'too_short').max(R.titleMax, 'too_long'),
  description: z.string().trim().max(R.descriptionMax, 'too_long').nullable(),
  /** Path trong bucket request-images, thư mục đầu = customer_id (trigger guard kiểm). */
  images: z.array(z.string().min(1, 'invalid_input')).max(R.maxImages, 'too_many_images'),
  addressText: z.string().trim().min(2, 'too_short').max(R.addressMax, 'too_long').nullable(),
  budgetMin: money.nullable(),
  budgetMax: money.nullable(),
  urgency: z.enum(SERVICE_URGENCIES),
};

/** Ngân sách tối đa không nhỏ hơn tối thiểu (CHECK service_requests). */
function refineBudget(v: { budgetMin?: number | null; budgetMax?: number | null }, ctx: z.RefinementCtx) {
  if (typeof v.budgetMin === 'number' && typeof v.budgetMax === 'number' && v.budgetMax < v.budgetMin) {
    ctx.addIssue({ code: 'custom', path: ['budgetMax'], message: 'invalid_input' });
  }
}

/** Đăng yêu cầu. customer_id / status / expires_at do server đặt; site mặc định theo hồ sơ nếu bỏ trống. */
export const CreateServiceRequestInput = z
  .object({
    trade: z.enum(SERVICE_TRADES),
    title: fields.title,
    description: fields.description.default(null),
    images: fields.images.default([]),
    site: SiteCode.nullable().default(null),
    addressText: fields.addressText.default(null),
    lat: lat.default(null),
    lng: lng.default(null),
    budgetMin: fields.budgetMin.default(null),
    budgetMax: fields.budgetMax.default(null),
    urgency: fields.urgency.default('flexible'),
    lang: z.enum(LOCALES).default('vi'),
  })
  .strict()
  .superRefine(refineBudget);
export type CreateServiceRequestInput = z.input<typeof CreateServiceRequestInput>;
export type CreateServiceRequestValues = z.output<typeof CreateServiceRequestInput>;

/** Sửa yêu cầu (chỉ khi còn mở và chưa có báo giá; trade / site không đổi). Chỉ gửi trường đổi. */
export const UpdateServiceRequestInput = z
  .object({
    id: z.uuid('invalid_input'),
    title: fields.title.optional(),
    description: fields.description.optional(),
    images: fields.images.optional(),
    addressText: fields.addressText.optional(),
    lat: lat.optional(),
    lng: lng.optional(),
    budgetMin: fields.budgetMin.optional(),
    budgetMax: fields.budgetMax.optional(),
    urgency: fields.urgency.optional(),
  })
  .strict()
  .superRefine(refineBudget);
export type UpdateServiceRequestInput = z.input<typeof UpdateServiceRequestInput>;

/** Gửi / sửa / gửi lại báo giá (RPC submit_quote_tx). */
export const SubmitQuoteInput = z
  .object({
    requestId: z.uuid('invalid_input'),
    price: z.number().int('invalid_input').min(R.priceMin, 'invalid_input').max(R.priceMax, 'invalid_input'),
    availableAt: z.iso.datetime({ offset: true, message: 'invalid_input' }).nullable().default(null),
    note: z.string().trim().max(R.noteMax, 'too_long').nullable().default(null),
  })
  .strict();
export type SubmitQuoteInput = z.input<typeof SubmitQuoteInput>;

/** Rút báo giá / chọn báo giá. */
export const QuoteIdInput = z.object({ quoteId: z.uuid('invalid_input') }).strict();
export type QuoteIdInput = z.input<typeof QuoteIdInput>;

/** Huỷ / hoàn thành yêu cầu. */
export const RequestIdInput = z.object({ requestId: z.uuid('invalid_input') }).strict();
export type RequestIdInput = z.input<typeof RequestIdInput>;

/** Mở chat: chủ chỉ rõ thợ (proId), thợ bỏ trống (RPC start_request_conversation). */
export const StartRequestConversationInput = z
  .object({ requestId: z.uuid('invalid_input'), proId: z.uuid('invalid_input').nullable().default(null) })
  .strict();
export type StartRequestConversationInput = z.input<typeof StartRequestConversationInput>;

/** Đánh giá hai chiều sau khi hoàn thành (RPC rate_service_request). */
export const RateServiceRequestInput = z
  .object({
    requestId: z.uuid('invalid_input'),
    score: z.number().int('invalid_input').min(1, 'invalid_input').max(5, 'invalid_input'),
    comment: z.string().trim().max(R.ratingCommentMax, 'too_long').nullable().default(null),
  })
  .strict();
export type RateServiceRequestInput = z.input<typeof RateServiceRequestInput>;

/** Bộ lọc danh sách yêu cầu (search params web, state app). Khớp tham số RPC search_service_requests. */
export const ServiceRequestFilters = z
  .object({
    trade: z.enum(SERVICE_TRADES),
    urgency: z.enum(SERVICE_URGENCIES),
    query: z.string().trim().max(100, 'too_long'),
    site: SiteCode,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusM: z.number().int().min(100).max(100_000),
  })
  .partial()
  .strict();
export type ServiceRequestFilters = z.infer<typeof ServiceRequestFilters>;

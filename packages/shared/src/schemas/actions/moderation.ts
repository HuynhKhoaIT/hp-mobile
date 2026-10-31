// Input Server Action / @hp/core cho kiểm duyệt tin (web /admin/moderation). Mã lỗi (message) là key ns errors.
import { z } from 'zod';
import {
  BULK_REVIEW_MAX,
  MODERATION_MAX_PAGE_SIZE,
  MODERATION_PAGE_SIZE,
  MODERATION_REASONS,
  MODERATION_STATUSES,
  REJECT_REASONS,
  REVIEW_NOTE_MAX,
} from '../../moderation';

/** Bộ lọc hàng chờ (searchParams `status`, `reason`, `page`). Giá trị lạ → mặc định, không lỗi (URL gõ tay). */
export const ModerationQueueQuery = z.object({
  status: z.enum(MODERATION_STATUSES).catch('pending').default('pending'),
  reason: z.enum(MODERATION_REASONS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1).default(1),
  limit: z.coerce.number().int().min(1).max(MODERATION_MAX_PAGE_SIZE).catch(MODERATION_PAGE_SIZE).default(MODERATION_PAGE_SIZE),
});
export type ModerationQueueQuery = z.input<typeof ModerationQueueQuery>;

/** Duyệt / từ chối một tin. Từ chối bắt buộc chọn lý do mẫu (REJECT_REASONS); ghi chú tự do không bắt buộc. */
export const ReviewListingInput = z
  .object({
    listingId: z.uuid('invalid_input'),
    approve: z.boolean(),
    reason: z.enum(REJECT_REASONS, 'invalid_input').optional(),
    note: z.string().trim().max(REVIEW_NOTE_MAX, 'too_long').optional(),
  })
  .refine((v) => v.approve || v.reason !== undefined, { message: 'reason_required', path: ['reason'] });
export type ReviewListingInput = z.input<typeof ReviewListingInput>;

/** Duyệt hàng loạt (chỉ duyệt; từ chối luôn từng tin để chọn lý do). */
export const BulkApproveInput = z.object({
  listingIds: z.array(z.uuid('invalid_input')).min(1, 'invalid_input').max(BULK_REVIEW_MAX, 'invalid_input'),
});
export type BulkApproveInput = z.input<typeof BulkApproveInput>;

/** Mở chi tiết một dòng hàng chờ. */
export const ModerationItemInput = z.object({ id: z.uuid('invalid_input') });

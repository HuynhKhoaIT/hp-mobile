// Input @hp/core / Server Action cho chat + báo cáo. Mã lỗi (message) là key ns errors.
import { z } from 'zod';
import { CHAT, REPORT_DETAIL_MAX } from '../../chat';
import { REPORT_REASONS, REPORT_TARGETS } from '../../enums';

/**
 * Gửi tin nhắn. `id` do client sinh (uuid v4) để upload ảnh trước theo path `{conversationId}/{id}.webp`
 * và gửi lại sau lỗi mạng không tạo bản trùng. Cần chữ hoặc ảnh.
 */
export const SendMessageInput = z
  .object({
    id: z.uuid('invalid_input'),
    conversationId: z.uuid('invalid_input'),
    body: z.string().trim().max(CHAT.bodyMax, 'too_long').optional(),
    imagePath: z
      .string()
      .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/, 'invalid_input')
      .optional(),
  })
  .refine((v) => !!v.body || !!v.imagePath, { message: 'required', path: ['body'] });
export type SendMessageInput = z.input<typeof SendMessageInput>;

/** Báo cáo tin / nhóm / hồ sơ / tin nhắn. */
export const ReportInput = z.object({
  targetType: z.enum(REPORT_TARGETS, 'invalid_input'),
  targetId: z.uuid('invalid_input'),
  reason: z.enum(REPORT_REASONS, 'reason_required'),
  detail: z.string().trim().max(REPORT_DETAIL_MAX, 'too_long').optional(),
});
export type ReportInput = z.input<typeof ReportInput>;

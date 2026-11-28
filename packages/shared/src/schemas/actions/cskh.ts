// CSKH cho admin (web /admin/cskh): chăm sóc sau khi đơn Gọi thợ hoàn thành. Mỗi đơn có 2 bên (khách, thợ được chọn); staff gọi
// hoặc nhắn Zalo rồi ghi kết quả. Hợp đồng với migration 20261129100000_cskh_care (bảng cskh_cases, view cskh_queue, RPC
// save_cskh_case / reveal_cskh_phone). Điểm là ghi chép nội bộ của staff, không phải đánh giá thật trong app.
import { z } from 'zod';

/** Bên được chăm sóc trong một đơn. */
export const CSKH_PARTIES = ['customer', 'pro'] as const;
export type CskhParty = (typeof CSKH_PARTIES)[number];

/** Trạng thái chăm sóc: pending = chưa có dòng kết quả. */
export const CSKH_STATUSES = ['pending', 'contacted', 'no_answer', 'done'] as const;
export type CskhStatus = (typeof CSKH_STATUSES)[number];

export const CSKH_CHANNELS = ['call', 'zalo'] as const;
export type CskhChannel = (typeof CSKH_CHANNELS)[number];

/** Điểm hài lòng 1–5 theo lời khách (chỉ khi đã liên hệ được: contacted / done). */
export const CSKH_SCORES = [1, 2, 3, 4, 5] as const;
export type CskhScore = (typeof CSKH_SCORES)[number];
export const CSKH_SCORE_STATUSES = ['contacted', 'done'] as const satisfies readonly CskhStatus[];

export const CSKH_LIMITS = { noteMax: 500 } as const;

/** Staff ghi kết quả chăm sóc cho (đơn, bên). */
export const SaveCskhCaseInput = z
  .object({
    requestId: z.uuid('invalid_input'),
    party: z.enum(CSKH_PARTIES, 'invalid_input'),
    status: z.enum(CSKH_STATUSES, 'invalid_input'),
    channel: z.enum(CSKH_CHANNELS, 'invalid_input').optional(),
    note: z.string('invalid_input').trim().max(CSKH_LIMITS.noteMax, 'too_long').optional(),
    score: z.number('invalid_input').int('invalid_input').min(1, 'invalid_input').max(5, 'invalid_input').optional(),
  })
  .refine((v) => v.score === undefined || (CSKH_SCORE_STATUSES as readonly string[]).includes(v.status), {
    message: 'invalid_input',
    path: ['score'],
  });
export type SaveCskhCaseInput = z.input<typeof SaveCskhCaseInput>;

/** Staff lấy SĐT của một bên để gọi (RPC ghi audit, 60 / giờ). */
export const RevealCskhPhoneInput = z.object({
  requestId: z.uuid('invalid_input'),
  party: z.enum(CSKH_PARTIES, 'invalid_input'),
});
export type RevealCskhPhoneInput = z.input<typeof RevealCskhPhoneInput>;

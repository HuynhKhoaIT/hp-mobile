// Input Edge Function request-badge / translate-content (@hp/core functions.ts gọi). Function Deno kiểm lại cùng luật
// trong supabase/functions/_shared/week10.ts (Deno không phân giải import không đuôi).
import { z } from 'zod';
import { REQUESTABLE_BADGES } from '../../constants';
import { LOCALES } from '../../locales';

export const RequestBadgeInput = z.object({
  badge: z.enum(REQUESTABLE_BADGES),
  documentPath: z.string().regex(/^[0-9a-f-]{36}\/[a-z]+\/[0-9]{10,16}\.(webp|jpg|pdf)$/, 'invalid_input'),
});
export type RequestBadgeInput = z.input<typeof RequestBadgeInput>;

export const TranslateContentInput = z.object({
  listingId: z.uuid('invalid_input'),
  lang: z.enum(LOCALES),
});
export type TranslateContentInput = z.input<typeof TranslateContentInput>;

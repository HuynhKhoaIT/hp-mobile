// Input Edge Function join-group / respond-join (@hp/core functions.ts gọi). Function Deno kiểm lại cùng luật
// (UUID + độ dài lời nhắn) mà không import file này (Deno không phân giải import không đuôi).
import { z } from 'zod';
import { GROUP_RULES } from '../../group-display';

export const JoinGroupInput = z.object({
  groupId: z.uuid('invalid_input'),
  note: z.string().trim().max(GROUP_RULES.noteMax, 'too_long').optional(),
});
export type JoinGroupInput = z.input<typeof JoinGroupInput>;

export const RespondJoinInput = z.object({
  groupId: z.uuid('invalid_input'),
  userId: z.uuid('invalid_input'),
  accept: z.boolean(),
});
export type RespondJoinInput = z.input<typeof RespondJoinInput>;

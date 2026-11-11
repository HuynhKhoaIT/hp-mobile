// Đánh giá + lời cảm ơn sau khi trao trả đồ thất lạc (migration 20261111090000_rate_listing).
// - listListingCounterparts: người đã nhắn tin với mình về tin (chủ tin: mọi người; người khác: chủ tin) — "An N." + avatar.
// - rateListing: RPC rate_listing (một lần / tin / người chấm). Lỗi: listing_not_returned, listing_already_rated,
//   cannot_rate_self, rating_no_chat, forbidden, not_found, banned, message_has_phone, message_profanity, rate_limited.
// Đánh giá nhóm vẫn ở groups.ts (rateGroup).
import type { Database } from '@hp/db';
import { LISTING_RATING_COMMENT_MAX, RateListingInput } from '@hp/shared';
import { flattenIssues } from './profile';
import { type Client, type Result, fail, fromSupabase, ok } from './result';

type CounterpartRow = Database['public']['Functions']['list_listing_counterparts']['Returns'][number];

/** Một người đã nhắn tin về tin. `myScore` = điểm mình đã chấm người này trong tin (null = chưa). */
export type ListingCounterpart = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isOwner: boolean;
  conversationId: string;
  lastMessageAt: string | null;
  myScore: number | null;
};

const toCounterpart = (r: CounterpartRow): ListingCounterpart => ({
  userId: r.user_id,
  displayName: r.display_name ?? '',
  avatarUrl: r.avatar_url ?? null,
  isOwner: !!r.is_owner,
  conversationId: r.conversation_id,
  lastMessageAt: r.last_message_at ?? null,
  myScore: r.my_score ?? null,
});

/** Người có thể đánh giá trong tin (đã có tin nhắn), mới nhất trước, tối đa 50. Khách / người ngoài → []. */
export async function listListingCounterparts(client: Client, listingId: string): Promise<Result<ListingCounterpart[]>> {
  const res = fromSupabase<CounterpartRow[]>(await client.rpc('list_listing_counterparts', { p_listing_id: listingId }));
  return res.error ? res : ok((res.data ?? []).map(toCounterpart));
}

/** Đã chấm ai trong tin này chưa (unique một lần / tin) — người đã được mình chấm, hoặc null. */
export function ratedCounterpart(list: readonly ListingCounterpart[]): ListingCounterpart | null {
  return list.find((c) => c.myScore !== null) ?? null;
}

/** Lời khen nhanh trong form đánh giá (khoá i18n listing.lost_found.rate.compliment_<mã>) — app và web cùng thứ tự. */
export const RATING_COMPLIMENTS = ['honest', 'careful', 'on_time', 'clear', 'helpful'] as const;
export type RatingCompliment = (typeof RATING_COMPLIMENTS)[number];

/**
 * Chip lời khen (thuần UI): chip "đang chọn" ⇔ lời cảm ơn chứa câu đó. Bấm → chèn "<câu>. " vào đầu; đã có → bỏ câu đó.
 * Không vượt `max` (vượt → giữ nguyên).
 */
export function toggleRatingPhrase(comment: string, phrase: string, max = LISTING_RATING_COMMENT_MAX): string {
  if (!phrase) return comment;
  if (comment.includes(phrase)) {
    const withDot = `${phrase}. `;
    const next = comment.includes(withDot) ? comment.replace(withDot, '') : comment.replace(`${phrase}.`, '').replace(phrase, '');
    return next.trimStart();
  }
  const next = comment.trim() ? `${phrase}. ${comment.trimStart()}` : `${phrase}.`;
  return next.length > max ? comment : next;
}

/** Chấm 1–5 + lời cảm ơn (không bắt buộc, ≤ 500) sau khi trao trả đồ thất lạc. */
export async function rateListing(client: Client, input: RateListingInput): Promise<Result<null>> {
  const parsed = RateListingInput.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const code = first && /^[a-z_]+$/.test(first.message) ? first.message : 'invalid_input';
    return fail(code, 'invalid_input', flattenIssues(parsed.error.issues));
  }
  const res = await client.rpc('rate_listing', {
    p_listing_id: parsed.data.listingId,
    p_ratee_id: parsed.data.rateeId,
    p_score: parsed.data.score,
    p_comment: parsed.data.comment ?? undefined,
  });
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

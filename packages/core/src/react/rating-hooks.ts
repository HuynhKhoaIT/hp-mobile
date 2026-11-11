// Hook đánh giá + lời cảm ơn sau khi trao trả đồ thất lạc (ratings.ts). Dùng chung app và web.
import type { RateListingInput } from '@hp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keys } from '../keys';
import { type ListingCounterpart, listListingCounterparts, rateListing } from '../ratings';
import type { AppError } from '../result';
import { unwrap, useSession } from './hooks';
import { useSupabase } from './provider';

/** Người đã nhắn tin với mình về tin (chủ tin: mọi người; người khác: chủ tin). Khách → không gọi. */
export function useListingCounterparts(listingId: string | undefined, opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  const { userId } = useSession();
  return useQuery<ListingCounterpart[], AppError>({
    queryKey: keys.listingCounterparts(listingId ?? ''),
    queryFn: () => unwrap(listListingCounterparts(client, listingId ?? '')),
    enabled: !!listingId && !!userId && (opts.enabled ?? true),
    staleTime: 30_000,
  });
}

/**
 * Chấm 1–5 + lời cảm ơn. Optimistic: người được chấm hiện "Bạn đã chấm N/5" ngay trong danh sách người đã chat; lỗi →
 * trả lại. Xong → làm mới danh sách + hồ sơ người được chấm (rating_avg / rating_count do trigger tính).
 */
export function useRateListing(listingId: string) {
  const client = useSupabase();
  const qc = useQueryClient();
  const key = keys.listingCounterparts(listingId);
  return useMutation<null, AppError, Omit<RateListingInput, 'listingId'>, { prev?: ListingCounterpart[] }>({
    mutationFn: (v) => unwrap(rateListing(client, { ...v, listingId })),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ListingCounterpart[]>(key);
      qc.setQueryData<ListingCounterpart[]>(key, (old) =>
        old?.map((c) => (c.userId === v.rateeId ? { ...c, myScore: v.score } : c)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: (_d, _e, v) => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: keys.profile(v.rateeId) });
    },
  });
}

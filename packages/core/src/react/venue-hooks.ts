// Hook danh mục sân (tuần 8): chọn sân khi tạo kèo, góp sân mới.
import type { ContributeVenueInput } from '@hp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { keys } from '../keys';
import type { AppError } from '../result';
import { contributeVenue, type ContributedVenue, searchVenues, type Venue, type VenueQuery } from '../venues';
import { unwrap } from './hooks';
import { useSupabase } from './provider';

/** Sân đã duyệt (anon được). Danh mục ít đổi → staleTime 5 phút. */
export function useVenues(query: VenueQuery, opts: { enabled?: boolean } = {}) {
  const client = useSupabase();
  return useQuery<Venue[], AppError>({
    queryKey: keys.venues(query),
    queryFn: () => unwrap(searchVenues(client, query)),
    enabled: opts.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

/** Góp sân mới (pending — chưa hiện trong danh sách cho tới khi moderator duyệt). */
export function useContributeVenue() {
  const client = useSupabase();
  const qc = useQueryClient();
  return useMutation<ContributedVenue, AppError, ContributeVenueInput>({
    mutationFn: (input) => unwrap(contributeVenue(client, input)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.myVenues() }),
  });
}

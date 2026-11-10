// Danh mục sân (migration 20261103090000_venues). Đọc sân đã duyệt qua RPC search_venues (anon được);
// góp sân mới qua PostgREST + RLS (luôn pending, 5 sân / ngày — trigger trg_venues_guard).
import type { Database } from '@hp/db';
import { ContributeVenueInput } from '@hp/shared';
import { flattenIssues } from './profile';
import { type Client, fail, fromSupabase, ok, requireUserId, type Result } from './result';

export type Venue = Database['public']['Functions']['search_venues']['Returns'][number];
export type VenueQuery = { sport?: string; site?: string; query?: string; lat?: number; lng?: number; limit?: number };

/** Sân đã duyệt theo môn / khu / chữ; có toạ độ → gần nhất trước. */
export async function searchVenues(client: Client, q: VenueQuery = {}): Promise<Result<Venue[]>> {
  const res = fromSupabase<Venue[]>(
    await client.rpc('search_venues', {
      p_sport: q.sport,
      p_site: q.site,
      p_query: q.query?.trim() || undefined,
      p_lat: q.lat,
      p_lng: q.lng,
      p_limit: q.limit,
    }),
  );
  return res.error ? res : ok(res.data ?? []);
}

export type ContributedVenue = { id: string; status: string };

/** Góp sân mới (chờ moderator duyệt). Lỗi: rate_limited, phone_invalid, forbidden (bị cấm). */
export async function contributeVenue(client: Client, input: ContributeVenueInput): Promise<Result<ContributedVenue>> {
  const parsed = ContributeVenueInput.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(first && /^[a-z_]+$/.test(first.message) ? first.message : 'invalid_input', 'invalid_input', flattenIssues(parsed.error.issues));
  }
  const uid = await requireUserId(client);
  if (uid.error) return uid;
  const { lat, lng, ...v } = parsed.data;
  return fromSupabase<ContributedVenue>(
    await client
      .from('venues')
      .insert({ ...v, created_by: uid.data, location: lat != null && lng != null ? `SRID=4326;POINT(${lng} ${lat})` : null })
      .select('id,status')
      .single(),
  );
}

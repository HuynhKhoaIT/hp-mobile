// Dữ liệu riêng của trang chủ (Hub) — docs/design/home.md §8. Banner + thẻ "Tin của bạn" + số liệu cộng đồng.
import type { Database } from '@hp/db';
import type { Locale } from '@hp/shared';
import { type Client, type Result, fromSupabase, ok } from './result';

export type Banner = Pick<
  Database['public']['Tables']['banners']['Row'],
  'id' | 'placement' | 'locale' | 'title' | 'subtitle' | 'cta_label' | 'link_url' | 'image_path' | 'tone' | 'sort'
>;
export type BannerPlacement = Banner['placement'];

const BANNER_COLUMNS = 'id,placement,locale,title,subtitle,cta_label,link_url,image_path,tone,sort' as const;

/** Banner đang hiệu lực (RLS lọc khung giờ / is_active) của placement, đúng ngôn ngữ hoặc mọi ngôn ngữ. Tối đa 5. */
export async function listBanners(client: Client, v: { placement: BannerPlacement; locale: Locale }): Promise<Result<Banner[]>> {
  const res = fromSupabase<Banner[]>(
    await client
      .from('banners')
      .select(BANNER_COLUMNS)
      .eq('placement', v.placement)
      .eq('is_active', true)
      .or(`locale.is.null,locale.eq.${v.locale}`)
      .order('sort')
      .limit(5),
  );
  return res.error ? res : ok(res.data ?? []);
}

export type MyListingStats = Database['public']['Functions']['my_listing_stats']['Returns'][number];
const EMPTY_STATS: MyListingStats = { active: 0, pending: 0, rejected: 0, drafts: 0, expiring_soon: 0, total_views: 0 };

/** Thẻ "Tin của bạn". Khách → toàn 0 (không gọi RPC). */
export async function getMyListingStats(client: Client): Promise<Result<MyListingStats>> {
  const { data } = await client.auth.getSession();
  if (!data.session) return ok(EMPTY_STATS);
  const res = fromSupabase<MyListingStats[]>(await client.rpc('my_listing_stats'));
  return res.error ? res : ok(res.data?.[0] ?? EMPTY_STATS);
}

export type PublicStats = Database['public']['Functions']['public_stats']['Returns'][number];

/** Số liệu cộng đồng (chỉ đếm, anon được). */
export async function getPublicStats(client: Client): Promise<Result<PublicStats>> {
  const res = fromSupabase<PublicStats[]>(await client.rpc('public_stats'));
  return res.error ? res : ok(res.data?.[0] ?? { users: 0, listings: 0, sites: 0 });
}

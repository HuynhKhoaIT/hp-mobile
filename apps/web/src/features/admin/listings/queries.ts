// Đọc mọi tin cho /admin/listings (staff thấy mọi trạng thái trừ đã xoá mềm; không đọc toạ độ). Theo request.
import 'server-only';
import { type AdminListing, type AdminPage, listAdminListings, listSites } from '@hp/core';
import { pageOf, pick, pickQuery, type Query, type SearchParams } from '../lib/params';
import { staffOrThrow, unwrap } from '../lib/server';

export const LISTING_QUERY_KEYS = ['q', 'status', 'category', 'site', 'owner', 'sort', 'page'] as const;

export type ListingsData = { page: AdminPage<AdminListing>; query: Query; sites: { code: string; name: string }[]; now: number };

export async function getListingsPage(params: SearchParams): Promise<ListingsData> {
  const staff = await staffOrThrow();
  const [page, sites] = await Promise.all([
    listAdminListings(staff.supabase, {
      q: pick(params, 'q'),
      status: pick(params, 'status'),
      category: pick(params, 'category'),
      site: pick(params, 'site'),
      owner: pick(params, 'owner'),
      sort: pick(params, 'sort'),
      page: pageOf(params),
    }),
    listSites(staff.supabase),
  ]);
  return { page: unwrap(page), query: pickQuery(params, LISTING_QUERY_KEYS), sites: sites.data ?? [], now: Date.now() };
}

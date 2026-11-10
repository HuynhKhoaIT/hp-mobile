// Đọc danh mục cho /admin/catalog (theo request). Tab sân: moderator+; tab khu / từ khoá cấm: chỉ admin
// (moderator mở tab đó thấy thông báo "chỉ quản trị viên" — RLS vẫn là chốt cuối).
import 'server-only';
import {
  type AdminKeyword,
  type AdminPage,
  type AdminSite,
  type AdminVenue,
  listAdminSites,
  listAdminVenues,
  listBannedKeywords,
} from '@hp/core';
import type { StaffRole } from '../roles';
import { pageOf, pick, pickQuery, type Query, type SearchParams } from '../lib/params';
import { staffOrThrow, unwrap } from '../lib/server';

export const CATALOG_TABS = ['venues', 'sites', 'keywords'] as const;
export type CatalogTab = (typeof CATALOG_TABS)[number];

export type CatalogData =
  | { tab: 'venues'; venues: AdminPage<AdminVenue>; sites: AdminSite[]; query: Query; role: StaffRole; now: number }
  | { tab: 'sites'; sites: AdminSite[]; query: Query; role: StaffRole }
  | { tab: 'keywords'; keywords: AdminKeyword[]; query: Query; role: StaffRole }
  | { tab: 'sites' | 'keywords'; forbidden: true; query: Query; role: StaffRole };

export async function getCatalogPage(params: SearchParams): Promise<CatalogData> {
  const staff = await staffOrThrow();
  const tabRaw = pick(params, 'tab');
  const tab: CatalogTab = (CATALOG_TABS as readonly string[]).includes(tabRaw ?? '') ? (tabRaw as CatalogTab) : 'venues';
  const query = pickQuery(params, ['tab', 'vstatus', 'q', 'action', 'page']);
  const role = staff.role;

  if (tab === 'venues') {
    const vstatus = pick(params, 'vstatus');
    const [venues, sites] = await Promise.all([
      listAdminVenues(staff.supabase, {
        status: vstatus === 'hidden' ? undefined : vstatus,
        hidden: vstatus === 'hidden',
        q: pick(params, 'q'),
        page: pageOf(params),
      }),
      listAdminSites(staff.supabase),
    ]);
    return { tab, venues: unwrap(venues), sites: sites.data ?? [], query, role, now: Date.now() };
  }
  if (role !== 'admin') return { tab, forbidden: true, query, role };
  if (tab === 'sites') return { tab, sites: unwrap(await listAdminSites(staff.supabase)), query, role };
  return { tab, keywords: unwrap(await listBannedKeywords(staff.supabase, { q: pick(params, 'q'), action: pick(params, 'action') })), query, role };
}

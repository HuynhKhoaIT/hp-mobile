// CSKH — hàng chờ chăm sóc sau đơn Gọi thợ hoàn thành (moderator+; view cskh_queue chỉ trả dòng cho staff).
import 'server-only';
import { type AdminPage, type CskhItem, listCskhQueue } from '@hp/core';
import { pageOf, pick, pickQuery, type Query, type SearchParams } from '../lib/params';
import { staffOrThrow, unwrap } from '../lib/server';

export const CSKH_QUERY_KEYS = ['status', 'party', 'q', 'page'] as const;

export type CskhData = { page: AdminPage<CskhItem>; query: Query };

export async function getCskhPage(params: SearchParams): Promise<CskhData> {
  const staff = await staffOrThrow();
  const page = await listCskhQueue(staff.supabase, {
    status: pick(params, 'status'),
    party: pick(params, 'party'),
    q: pick(params, 'q'),
    page: pageOf(params),
  });
  return { page: unwrap(page), query: pickQuery(params, CSKH_QUERY_KEYS) };
}

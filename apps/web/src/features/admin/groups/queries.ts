// Đọc nhóm ghép cho /admin/groups (staff thấy mọi trạng thái, trừ đã xoá mềm). Theo request.
import 'server-only';
import { type AdminGroup, type AdminPage, listAdminGroups } from '@hp/core';
import { pageOf, pick, pickQuery, type Query, type SearchParams } from '../lib/params';
import { staffOrThrow, unwrap } from '../lib/server';

export const GROUP_QUERY_KEYS = ['q', 'kind', 'status', 'host', 'sort', 'page'] as const;

export type GroupsData = { page: AdminPage<AdminGroup>; query: Query; now: number };

export async function getGroupsPage(params: SearchParams): Promise<GroupsData> {
  const staff = await staffOrThrow();
  const page = await listAdminGroups(staff.supabase, {
    q: pick(params, 'q'),
    kind: pick(params, 'kind'),
    status: pick(params, 'status'),
    host: pick(params, 'host'),
    sort: pick(params, 'sort'),
    page: pageOf(params),
  });
  return { page: unwrap(page), query: pickQuery(params, GROUP_QUERY_KEYS), now: Date.now() };
}

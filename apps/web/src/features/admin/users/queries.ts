// Đọc người dùng cho /admin/users và /admin/users/[id] (staff, theo request). SĐT luôn đã che (@hp/core).
import 'server-only';
import { notFound } from 'next/navigation';
import { type AdminPage, type AdminUser, type AdminUserDetail, getAdminUser, listSites, listUsers } from '@hp/core';
import type { StaffRole } from '../roles';
import { pageOf, pick, pickQuery, type Query, type SearchParams } from '../lib/params';
import { staffOrThrow, unwrap } from '../lib/server';

export const USER_QUERY_KEYS = ['q', 'role', 'state', 'sort', 'page'] as const;

export type UsersData = { page: AdminPage<AdminUser>; query: Query; now: number; viewer: { id: string; role: StaffRole } };

export async function getUsersPage(params: SearchParams): Promise<UsersData> {
  const staff = await staffOrThrow();
  const page = await listUsers(staff.supabase, {
    q: pick(params, 'q'),
    role: pick(params, 'role'),
    state: pick(params, 'state'),
    sort: pick(params, 'sort'),
    page: pageOf(params),
  });
  return { page: unwrap(page), query: pickQuery(params, USER_QUERY_KEYS), now: Date.now(), viewer: { id: staff.userId, role: staff.role } };
}

export type UserDetailData = {
  user: AdminUserDetail;
  siteName: string | null;
  now: number;
  viewer: { id: string; role: StaffRole };
};

export async function getUserDetail(id: string): Promise<UserDetailData> {
  const staff = await staffOrThrow();
  const [user, sites] = await Promise.all([getAdminUser(staff.supabase, id), listSites(staff.supabase)]);
  if (user.error?.code === 'not_found' || user.error?.code === 'invalid_input') notFound();
  const data = unwrap(user);
  return {
    user: data,
    siteName: (sites.data ?? []).find((s) => s.code === data.site)?.name ?? data.site,
    now: Date.now(),
    viewer: { id: staff.userId, role: staff.role },
  };
}

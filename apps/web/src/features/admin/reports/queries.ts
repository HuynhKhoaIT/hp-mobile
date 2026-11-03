// Đọc hàng chờ báo cáo cho /admin/reports (staff, theo request). Client theo phiên staff (policy is_staff()).
import 'server-only';
import { type AdminPage, type AdminReport, countReports, listReports, type ReportFilter } from '@hp/core';
import { pageOf, pick, pickQuery, type Query, type SearchParams } from '../lib/params';
import { staffOrThrow, unwrap } from '../lib/server';

export const REPORT_QUERY_KEYS = ['status', 'type', 'reason', 'page'] as const;

export type ReportsData = {
  page: AdminPage<AdminReport>;
  counts: Record<ReportFilter, number>;
  query: Query;
  now: number;
};

export async function getReportsPage(params: SearchParams): Promise<ReportsData> {
  const staff = await staffOrThrow();
  const [page, counts] = await Promise.all([
    listReports(staff.supabase, {
      status: pick(params, 'status'),
      targetType: pick(params, 'type'),
      reason: pick(params, 'reason'),
      page: pageOf(params),
    }),
    countReports(staff.supabase),
  ]);
  return { page: unwrap(page), counts: unwrap(counts), query: pickQuery(params, REPORT_QUERY_KEYS), now: Date.now() };
}

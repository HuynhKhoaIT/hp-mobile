// Lead marketing (moderator+ xem / xử lý — policy marketing_leads_*_staff). Xuất CSV chỉ admin (RPC ghi `lead.export`).
import 'server-only';
import { type AdminLead, type AdminPage, exportLeads, leadsCsv, listLeads } from '@hp/core';
import { requireStaff } from '../session';
import { pageOf, pick, pickQuery, type Query, type SearchParams } from '../lib/params';
import { unwrap } from '../lib/server';

export const LEAD_QUERY_KEYS = ['status', 'kind', 'q', 'page'] as const;

export type LeadsData = { page: AdminPage<AdminLead>; query: Query; canExport: boolean };

export async function getLeadsPage(params: SearchParams): Promise<LeadsData> {
  const check = await requireStaff();
  if (!check.ok) throw new Error(check.code);
  const page = await listLeads(check.staff.supabase, {
    status: pick(params, 'status'),
    kind: pick(params, 'kind'),
    q: pick(params, 'q'),
    page: pageOf(params),
  });
  return { page: unwrap(page), query: pickQuery(params, LEAD_QUERY_KEYS), canExport: check.staff.role === 'admin' };
}

export type LeadsExport = { ok: true; csv: string; filename: string } | { ok: false; status: 401 | 403 | 500; code: string };

/** Gọi từ route handler /admin/leads/export. */
export async function exportLeadsCsv(params: URLSearchParams): Promise<LeadsExport> {
  const check = await requireStaff('admin');
  if (!check.ok) return { ok: false, status: check.code === 'forbidden' ? 403 : 401, code: check.code };
  const res = await exportLeads(check.staff.supabase, { status: params.get('status') ?? undefined, limit: 10000 });
  if (res.error) return { ok: false, status: res.error.code === 'forbidden' ? 403 : 500, code: res.error.code };
  const stamp = new Date().toISOString().slice(0, 10);
  return { ok: true, csv: leadsCsv(res.data), filename: `leads-${stamp}.csv` };
}

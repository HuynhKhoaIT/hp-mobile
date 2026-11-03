// Nhật ký hệ thống (chỉ admin — policy audit_log_select_admin). Xem: phân trang + lọc ngày / tiền tố hành động / người làm /
// đối tượng. Xuất CSV: RPC export_audit_log (ghi `audit.export`), ≤ 10.000 dòng.
import 'server-only';
import { type AdminPage, type AuditEntry, auditCsv, exportAuditLog, listAuditLog } from '@hp/core';
import { requireStaff } from '../session';
import { pageOf, pick, pickQuery, type Query, type SearchParams } from '../lib/params';
import { unwrap } from '../lib/server';

export const AUDIT_QUERY_KEYS = ['from', 'to', 'action', 'actor', 'target', 'page'] as const;

export type AuditData = { forbidden: true } | { forbidden: false; page: AdminPage<AuditEntry>; query: Query; now: number };

export async function getAuditPage(params: SearchParams): Promise<AuditData> {
  const check = await requireStaff('admin');
  if (!check.ok) {
    if (check.code === 'forbidden') return { forbidden: true };
    throw new Error(check.code);
  }
  const page = await listAuditLog(check.staff.supabase, {
    from: pick(params, 'from'),
    to: pick(params, 'to'),
    action: pick(params, 'action'),
    actor: pick(params, 'actor'),
    target: pick(params, 'target'),
    page: pageOf(params),
  });
  return { forbidden: false, page: unwrap(page), query: pickQuery(params, AUDIT_QUERY_KEYS), now: Date.now() };
}

export type AuditExport = { ok: true; csv: string; filename: string } | { ok: false; status: 401 | 403 | 500; code: string };

/** CSV theo bộ lọc (bỏ actor / target: RPC chỉ lọc ngày + tiền tố). Gọi từ route handler /admin/audit/export. */
export async function exportAuditCsv(params: URLSearchParams): Promise<AuditExport> {
  const check = await requireStaff('admin');
  if (!check.ok) return { ok: false, status: check.code === 'forbidden' ? 403 : 401, code: check.code };
  const res = await exportAuditLog(check.staff.supabase, {
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    action: params.get('action') ?? undefined,
    limit: 10000,
  });
  if (res.error) return { ok: false, status: res.error.code === 'forbidden' ? 403 : 500, code: res.error.code };
  const stamp = new Date().toISOString().slice(0, 10);
  return { ok: true, csv: auditCsv(res.data), filename: `audit-log-${stamp}.csv` };
}

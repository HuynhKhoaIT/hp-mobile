// GET /admin/audit/export?from=&to=&action= — tải CSV nhật ký (chỉ admin; proxy.ts chặn khách / không staff / chưa MFA,
// exportAuditCsv kiểm lại vai trò; RPC export_audit_log ghi `audit.export`). Không cache, noindex.
import { exportAuditCsv } from '@/features/admin/audit/queries';

export async function GET(request: Request) {
  const result = await exportAuditCsv(new URL(request.url).searchParams);
  const base = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  if (!result.ok) {
    return new Response(JSON.stringify({ code: result.code }), { status: result.status, headers: { ...base, 'Content-Type': 'application/json' } });
  }
  return new Response(result.csv, {
    status: 200,
    headers: {
      ...base,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  });
}

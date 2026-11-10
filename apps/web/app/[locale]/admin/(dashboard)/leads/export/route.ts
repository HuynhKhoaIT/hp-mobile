// GET /admin/leads/export?status= — tải CSV lead (chỉ admin; proxy.ts chặn khách / không staff / chưa MFA, exportLeadsCsv kiểm
// lại vai trò; RPC export_marketing_leads ghi `lead.export`). Không cache, noindex.
import { exportLeadsCsv } from '@/features/admin/leads/queries';

export async function GET(request: Request) {
  const result = await exportLeadsCsv(new URL(request.url).searchParams);
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

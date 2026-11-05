// Marketing công khai (web landing / /cho-chu-tro) — migration 20261106090000_marketing_leads.
// submitLead nhận client SERVICE ROLE (chỉ Server Action lead của web tạo, supabase/CLAUDE.md mục 4 "Marketing"):
// bảng marketing_leads không cho anon / authenticated insert. Xử lý lead (staff) ở admin.ts.
import type { TablesInsert } from '@hp/db';
import { CONSENT_VERSION, LeadInput, type LeadParsed } from '@hp/shared';
import { type Client, fail, fromSupabase, ok, type Result } from './result';

function leadRow(v: LeadParsed, site: string | null): TablesInsert<'marketing_leads'> {
  return {
    contact: v.contact,
    contact_type: v.contactType,
    kind: v.kind,
    name: v.name ?? null,
    site,
    message: v.message ?? null,
    source: v.source,
    locale: v.locale,
    utm: Object.fromEntries(Object.entries(v.utm).filter(([, x]) => typeof x === 'string' && x !== '')),
    consent_at: new Date().toISOString(),
    consent_version: CONSENT_VERSION,
  };
}

/**
 * Kiểm rate limit theo hash IP (RPC check_rate_limit, 5 lead / giờ) rồi thêm lead.
 * `ipHash`: sha256(ip + salt) do server tính — không truyền IP thô.
 * Lỗi từng ô trả trong `fieldErrors` (key ns errors).
 */
export async function submitLead(serviceClient: Client, input: { lead: LeadInput; ipHash: string }): Promise<Result<null>> {
  const parsed = LeadInput.safeParse(input.lead);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return fail('invalid_input', 'invalid_input', fieldErrors);
  }
  const v = parsed.data;

  const limit = await serviceClient.rpc('check_rate_limit', { p_key: input.ipHash, p_action: 'lead' });
  if (limit.error) return fromSupabase<null>({ data: null, error: limit.error });
  if (limit.data !== true) return fail('rate_limited');

  let res = await serviceClient.from('marketing_leads').insert(leadRow(v, v.site ?? null));
  // Mã khu không tồn tại / đã đổi (FK sites) → lưu không kèm khu thay vì làm mất lead.
  if (res.error && (res.error as { code?: string }).code === '23503' && v.site) {
    res = await serviceClient.from('marketing_leads').insert(leadRow(v, null));
  }
  return res.error ? fromSupabase<null>({ data: null, error: res.error }) : ok(null);
}

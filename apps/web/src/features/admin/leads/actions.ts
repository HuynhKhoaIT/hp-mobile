'use server';

// Đổi trạng thái lead (moderator+). Trigger trg_marketing_leads_guard ghi người xử lý + audit `lead.update`.
import { updateLead } from '@hp/core';
import type { LeadUpdateInput } from '@hp/shared';
import type { ActionResult } from '@/lib/action-result';
import { asRecord, refreshAdmin, withStaff } from '../lib/server';

export async function updateLeadAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  const result = await withStaff('moderator', (s) => updateLead(s.supabase, { id: v.id, status: v.status } as LeadUpdateInput));
  if (result.ok) refreshAdmin();
  return result;
}

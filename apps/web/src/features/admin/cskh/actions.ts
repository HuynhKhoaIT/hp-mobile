'use server';

// CSKH (moderator+): ghi kết quả chăm sóc và lấy SĐT để gọi. RPC save_cskh_case / reveal_cskh_phone kiểm is_staff() + ghi audit
// (`cskh.update` không chép ghi chú, `cskh.reveal` không chép SĐT) trong cùng transaction — không ghi lại ở đây.
import { revealCskhPhone, saveCskhCase } from '@hp/core';
import type { RevealCskhPhoneInput, SaveCskhCaseInput } from '@hp/shared';
import type { ActionResult } from '@/lib/action-result';
import { asRecord, refreshAdmin, withStaff } from '../lib/server';

export async function saveCskhCaseAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  const result = await withStaff('moderator', (s) =>
    saveCskhCase(s.supabase, {
      requestId: v.requestId,
      party: v.party,
      status: v.status,
      channel: v.channel,
      note: v.note,
      score: v.score,
    } as SaveCskhCaseInput),
  );
  if (result.ok) refreshAdmin();
  return result;
}

/** SĐT dạng 0xxxxxxxxx của một bên để gọi (60 / giờ). Chỉ trả về cho staff đã được ghi audit. */
export async function revealCskhPhoneAction(raw: unknown): Promise<ActionResult<string>> {
  const v = asRecord(raw);
  return withStaff('moderator', (s) => revealCskhPhone(s.supabase, { requestId: v.requestId, party: v.party } as RevealCskhPhoneInput));
}

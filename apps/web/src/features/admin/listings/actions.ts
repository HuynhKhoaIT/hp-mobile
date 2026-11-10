'use server';

// Server Action tin (moderator+): ẩn (closed) / mở lại (active) / từ chối (rejected) ngoài hàng chờ qua RPC
// staff_set_listing_status — RPC ghi audit `listing.status` (meta from / to / note). Làm mới trang tin công khai bằng tag.
import { ADMIN_BULK_MAX, staffSetListingStatus } from '@hp/core';
import { updateTag } from 'next/cache';
import { type ActionResult, err, ok } from '@/lib/action-result';
import { requireStaff } from '../session';
import { asRecord, refreshAdmin, withStaff } from '../lib/server';

function refresh(ids: string[]) {
  for (const id of ids) updateTag(`listing:${id}`);
  if (ids.length) updateTag('listings');
  refreshAdmin();
}

export async function setListingStatusAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  const result = await withStaff('moderator', (s) => staffSetListingStatus(s.supabase, { listingId: v.listingId, status: v.status, note: v.note }));
  if (result.ok && typeof v.listingId === 'string') refresh([v.listingId]);
  return result;
}

/** Đổi trạng thái nhiều tin (≤ 50), 5 song song; mỗi tin một dòng audit. Trả tin đã đổi / lỗi theo tin. */
export async function bulkSetListingStatusAction(raw: unknown): Promise<ActionResult<{ done: string[]; failed: number }>> {
  const v = asRecord(raw);
  const ids = Array.isArray(v.ids) ? [...new Set(v.ids.filter((x): x is string => typeof x === 'string'))] : [];
  if (ids.length === 0 || ids.length > ADMIN_BULK_MAX) return err('invalid_input');
  const check = await requireStaff('moderator');
  if (!check.ok) return err(check.code);
  const done: string[] = [];
  let failed = 0;
  for (let i = 0; i < ids.length; i += 5) {
    const chunk = ids.slice(i, i + 5);
    const results = await Promise.all(
      chunk.map((listingId) => staffSetListingStatus(check.staff.supabase, { listingId, status: v.status, note: v.note })),
    );
    if (results.some((r) => r.error?.code === 'forbidden' || r.error?.code === 'invalid_input')) {
      refresh(done);
      return err(results.find((r) => r.error)?.error?.code ?? 'unknown');
    }
    results.forEach((r, j) => {
      const id = chunk[j];
      if (!id) return;
      if (r.error) failed++;
      else done.push(id);
    });
  }
  refresh(done);
  return ok({ done, failed });
}

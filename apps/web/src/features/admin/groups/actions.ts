'use server';

// Server Action nhóm ghép (moderator+): huỷ nhóm vi phạm qua RPC staff_cancel_group — RPC ghi audit `group.cancel`
// (meta from / note) và thành viên nhận thông báo group_cancelled. Làm mới trang nhóm công khai bằng tag.
import { staffCancelGroup } from '@hp/core';
import { updateTag } from 'next/cache';
import type { ActionResult } from '@/lib/action-result';
import { asRecord, refreshAdmin, withStaff } from '../lib/server';

export async function cancelGroupAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  const result = await withStaff('moderator', (s) => staffCancelGroup(s.supabase, { groupId: v.groupId, note: v.note }));
  if (result.ok && typeof v.groupId === 'string') {
    updateTag(`group:${v.groupId}`);
    updateTag('groups');
    refreshAdmin();
  }
  return result;
}

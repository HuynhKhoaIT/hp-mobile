// purge-files — pg_cron hằng ngày (public.call_purge_files, header x-cron-secret). Nghị định 13/2023:
//   1. Giấy tờ huy hiệu: 30 ngày sau khi duyệt / từ chối → xoá file verification, badge_requests.document_path = null.
//   2. Tài khoản xoá mềm quá 30 ngày → xoá file (avatars, listing-images, verification) rồi xoá auth user; FK cascade
//      xoá profiles, tin, nhóm, thành viên, đánh giá…; tin nhắn giữ lại ẩn danh (messages.sender_id → null).
// Mỗi lần tối đa PURGE_BATCH tài khoản. Service role: thao tác trên dữ liệu / file của người khác. Log không có PII.
import { handler } from '../_shared/http.ts';
import { daysAgoIso, listAllFiles, PURGE_AFTER_DAYS, PURGE_BATCH, userFolders } from '../_shared/week10.ts';

export const purgeFiles = handler({ auth: 'cron' }, async ({ admin, log }) => {
  const cutoff = daysAgoIso(PURGE_AFTER_DAYS);

  // 1. Giấy tờ đã xử lý quá hạn
  const { data: docs, error: docsError } = await admin
    .from('badge_requests')
    .select('id, document_path')
    .in('status', ['approved', 'rejected'])
    .lt('reviewed_at', cutoff)
    .not('document_path', 'is', null)
    .limit(500);
  if (docsError) throw docsError;
  const docPaths = (docs ?? []).map((d) => d.document_path as string);
  if (docPaths.length) {
    const { error } = await admin.storage.from('verification').remove(docPaths);
    if (error) throw error;
    await admin
      .from('badge_requests')
      .update({ document_path: null, document_purged_at: new Date().toISOString() })
      .in('id', (docs ?? []).map((d) => d.id));
  }

  // 2. Tài khoản xoá mềm quá hạn
  const { data: users, error: usersError } = await admin.from('profiles').select('id').lt('deleted_at', cutoff).limit(PURGE_BATCH);
  if (usersError) throw usersError;
  let files = 0;
  let accounts = 0;
  for (const { id } of users ?? []) {
    for (const { bucket, prefix } of userFolders(id)) {
      const store = admin.storage.from(bucket);
      const paths = await listAllFiles(async (p) => (await store.list(p, { limit: 1000 })).data ?? [], prefix);
      if (paths.length) {
        const { error } = await store.remove(paths);
        if (error) throw error;
        files += paths.length;
      }
    }
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      log('purge_user_failed', { user_id: id, message: error.message.slice(0, 120) });
      continue;
    }
    accounts++;
  }

  log('purged', { documents: docPaths.length, accounts, files });
  return { documents: docPaths.length, accounts, files };
});

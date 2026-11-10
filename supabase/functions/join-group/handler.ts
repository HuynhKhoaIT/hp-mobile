// join-group — người dùng xin / tham gia nhóm. Transaction (khoá dòng nhóm, kiểm còn chỗ, chặn, đã tham gia,
// lời nhắn) nằm trong RPC join_group_tx; function chỉ kiểm input + gọi RPC bằng JWT người gọi (RLS / auth.uid()).
// Thông báo chủ nhóm do trigger trg_group_members_sync tạo; push do send-push gửi. Trả { status: requested | accepted }.
import { handler } from '../_shared/http.ts';
import { parseJoinInput, rpcError } from '../_shared/groups.ts';

export const joinGroup = handler({ auth: 'user' }, async ({ req, db, log }) => {
  const input = parseJoinInput(await req.json());
  const { data, error } = await db!.rpc('join_group_tx', { p_group_id: input.groupId, p_note: input.note });
  const err = rpcError(error);
  if (err) throw err;
  log('joined', { group_id: input.groupId, status: data });
  return { status: data };
});

// respond-join — chủ nhóm nhận / từ chối người xin. Transaction (khoá dòng nhóm, kiểm chủ nhóm, còn chỗ) trong RPC
// respond_join_tx; trigger thêm người được nhận vào chat nhóm + tạo thông báo join_accepted / join_declined.
// Trả { status: accepted | declined }.
import { handler } from '../_shared/http.ts';
import { parseRespondInput, rpcError } from '../_shared/groups.ts';

export const respondJoin = handler({ auth: 'user' }, async ({ req, db, log }) => {
  const input = parseRespondInput(await req.json());
  const { data, error } = await db!.rpc('respond_join_tx', {
    p_group_id: input.groupId,
    p_user_id: input.userId,
    p_accept: input.accept,
  });
  const err = rpcError(error);
  if (err) throw err;
  log('responded', { group_id: input.groupId, status: data });
  return { status: data };
});

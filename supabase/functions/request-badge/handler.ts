// request-badge — người dùng xin huy hiệu (công nhân / chủ trọ / chủ sân / nhà tuyển dụng) sau khi đã upload giấy tờ vào
// bucket riêng tư verification ({user_id}/{badge}/{timestamp}.webp). Kiểm tra (path đúng chủ, file tồn tại, chưa có
// huy hiệu, không trùng yêu cầu đang chờ, 3 lần / ngày) nằm trong RPC request_badge_tx; function chỉ kiểm input + gọi
// RPC bằng JWT người gọi. Moderator duyệt ở /admin/badges (trigger thêm huy hiệu + audit + thông báo). Trả { id }.
import { handler } from '../_shared/http.ts';
import { badgeRpcError, parseBadgeInput } from '../_shared/week10.ts';

export const requestBadge = handler({ auth: 'user' }, async ({ req, db, log }) => {
  const input = parseBadgeInput(await req.json());
  const { data, error } = await db!.rpc('request_badge_tx', { p_badge: input.badge, p_document_path: input.documentPath });
  const err = badgeRpcError(error);
  if (err) throw err;
  log('badge_requested', { badge: input.badge });
  return { id: data };
});

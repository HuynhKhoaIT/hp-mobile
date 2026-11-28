// zalo-send — staff gửi thẳng tin Zalo cho lead / người dùng bằng Zalo cá nhân đã kết nối (zalo-connect). Các bước:
//   1. xác thực JWT + phải là staff (zalo_status);  2. có tài khoản Zalo đã kết nối;
//   3. reserve_zalo_auto (service role): kiểm hạn mức + nghỉ giữa 2 tin, ghi tin 'sending', audit, trả SĐT;
//   4. giải mã phiên (ZALO_SESSION_KEY) → đăng nhập lại bằng zca-js → tìm người dùng Zalo theo SĐT → gửi tin;
//   5. finish_zalo_auto: sent, hoặc failed + HOÀN lượt hạn mức. Phiên hết hạn → đánh dấu tài khoản expired (cần quét QR lại).
// Hết lượt / đang nghỉ → { ok: false, reason, status } (không phải lỗi). SĐT không đi qua client, không log SĐT / nội dung / phiên.
import { Zalo, ThreadType } from 'npm:zca-js@2.2.0';
import { AppError, handler } from '../_shared/http.ts';
import { parseZaloSendInput, zaloRpcError } from '../_shared/zalo.ts';
import { decryptJson, isValidKey, zaloFailureCode } from '../_shared/zaloCrypto.ts';

type Creds = Parameters<Zalo['login']>[0];

export const zaloSend = handler({ auth: 'user' }, async ({ req, db, admin, user, log }) => {
  const input = parseZaloSendInput(await req.json());
  const uid = user!.id;

  const gate = await db!.rpc('zalo_status');
  if (gate.error) throw new AppError('forbidden', 403);

  const key = Deno.env.get('ZALO_SESSION_KEY') ?? '';
  if (!isValidKey(key)) throw new AppError('zalo_unavailable', 503);

  // Service role: credentials_enc không đọc được bằng JWT người dùng.
  const account = await admin.from('zalo_accounts').select('credentials_enc, status').eq('staff_id', uid).maybeSingle();
  if (account.error) throw new AppError('unknown', 500);
  if (!account.data || account.data.status !== 'connected') throw new AppError('zalo_not_connected', 409);

  const reserved = await admin.rpc('reserve_zalo_auto', {
    p_staff: uid,
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_kind: input.kind,
    p_content: input.content,
  });
  const rpcError = zaloRpcError(reserved.error);
  if (rpcError) throw rpcError;
  const r = reserved.data as { ok: boolean; reason?: string; status: unknown; message_id?: string; phone?: string };
  if (!r.ok) return { ok: false, reason: r.reason, status: r.status };

  const messageId = r.message_id as string;
  const finish = (ok: boolean, zaloMsgId: string | null, error: string | null) =>
    admin.rpc('finish_zalo_auto', { p_message_id: messageId, p_ok: ok, p_zalo_msg_id: zaloMsgId, p_error: error });

  try {
    const creds = await decryptJson<Creds>(account.data.credentials_enc as string, key);
    const api = await new Zalo({ selfListen: false, checkUpdate: false, logging: false }).login(creds);
    const found = await api.findUser(r.phone as string).catch(() => null);
    if (!found?.uid) {
      await finish(false, null, 'user_not_found');
      throw new AppError('zalo_user_not_found', 404);
    }
    const sent = await api.sendMessage({ msg: input.content }, found.uid, ThreadType.User);
    await finish(true, sent.message?.msgId != null ? String(sent.message.msgId) : null, null);
    log('zalo_sent', { kind: input.kind });
    return { ok: true, status: r.status };
  } catch (e) {
    if (e instanceof AppError) throw e;
    const code = zaloFailureCode(String((e as Error)?.message ?? ''));
    await finish(false, null, code);
    if (code === 'zalo_session_expired') {
      await admin.from('zalo_accounts').update({ status: 'expired', last_error: code }).eq('staff_id', uid);
    }
    log('zalo_send_failed', { code });
    throw new AppError(code, code === 'zalo_session_expired' ? 409 : 502);
  }
});

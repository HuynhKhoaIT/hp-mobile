// zalo-notify — DB webhook (trg_service_requests_zalo_notice) khi khách chốt báo giá (yêu cầu open → assigned): tự nhắn Zalo cho
// KHÁCH và THỢ được chọn bằng Zalo CSKH admin đã chọn ở /admin/zalo-settings. Các bước:
//   1. zalo_accept_targets (service role): null = tắt / chưa chọn Zalo CSKH → bỏ qua;  2. Zalo CSKH còn kết nối;
//   3. đăng nhập zca-js MỘT lần bằng phiên đã giải mã (ZALO_SESSION_KEY);
//   4. mỗi người: reserve_zalo_notice (trừ hạn mức ngày, không chờ nghỉ; hết lượt → ghi failed) → tìm theo SĐT → gửi →
//      finish_zalo_auto; nghỉ vài giây giữa 2 tin.
// Lỗi từng tin chỉ ghi nhật ký (zalo_messages.status = failed) — webhook luôn trả 200 để không làm hỏng việc chốt. SĐT không đi
// qua function này ngoài RPC; không log SĐT / nội dung / phiên.
import { Zalo, ThreadType } from 'npm:zca-js@2.2.0';
import { AppError, handler } from '../_shared/http.ts';
import { decryptJson, isValidKey, zaloFailureCode } from '../_shared/zaloCrypto.ts';
import { buildNotices, parseNoticeTargets, parseNotifyRequestId } from '../_shared/zaloNotice.ts';

type Creds = Parameters<Zalo['login']>[0];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const zaloNotify = handler({ auth: 'webhook' }, async ({ req, admin, log }) => {
  const requestId = parseNotifyRequestId(await req.json().catch(() => null));
  if (!requestId) throw new AppError('invalid_input', 400);

  const targetsRes = await admin.rpc('zalo_accept_targets', { p_request_id: requestId });
  if (targetsRes.error) throw new AppError('unknown', 500);
  const targets = parseNoticeTargets(targetsRes.data);
  if (!targets) return { ok: true, skipped: 'disabled' };

  const key = Deno.env.get('ZALO_SESSION_KEY') ?? '';
  if (!isValidKey(key)) throw new AppError('zalo_unavailable', 503);

  // Service role: credentials_enc không đọc được bằng JWT người dùng.
  const account = await admin.from('zalo_accounts').select('credentials_enc, status').eq('staff_id', targets.sender).maybeSingle();
  if (account.error) throw new AppError('unknown', 500);
  if (!account.data || account.data.status !== 'connected') {
    log('zalo_notify_skipped', { reason: 'sender_not_connected' });
    return { ok: true, skipped: 'sender_not_connected' };
  }

  let api: Awaited<ReturnType<Zalo['login']>>;
  try {
    const creds = await decryptJson<Creds>(account.data.credentials_enc as string, key);
    api = await new Zalo({ selfListen: false, checkUpdate: false, logging: false }).login(creds);
  } catch (e) {
    const code = zaloFailureCode(String((e as Error)?.message ?? ''));
    if (code === 'zalo_session_expired') {
      await admin.from('zalo_accounts').update({ status: 'expired', last_error: code }).eq('staff_id', targets.sender);
    }
    log('zalo_notify_login_failed', { code });
    return { ok: true, skipped: code };
  }

  let sent = 0;
  const notices = buildNotices(targets);
  for (const [i, n] of notices.entries()) {
    const reserved = await admin.rpc('reserve_zalo_notice', {
      p_staff: targets.sender,
      p_target_id: n.targetId,
      p_kind: n.kind,
      p_content: n.content,
    });
    if (reserved.error) {
      log('zalo_notify_reserve_failed', { kind: n.kind, code: reserved.error.message });
      continue;
    }
    const r = reserved.data as { ok: boolean; message_id?: string; phone?: string; reason?: string };
    if (!r.ok || !r.message_id || !r.phone) {
      log('zalo_notify_blocked', { kind: n.kind, reason: r.reason ?? 'unknown' });
      continue;
    }
    const messageId = r.message_id;
    const finish = (ok: boolean, zaloMsgId: string | null, error: string | null) =>
      admin.rpc('finish_zalo_auto', { p_message_id: messageId, p_ok: ok, p_zalo_msg_id: zaloMsgId, p_error: error });
    try {
      const found = await api.findUser(r.phone).catch(() => null);
      if (!found?.uid) {
        await finish(false, null, 'user_not_found');
        log('zalo_notify_failed', { kind: n.kind, code: 'user_not_found' });
      } else {
        const res = await api.sendMessage({ msg: n.content }, found.uid, ThreadType.User);
        await finish(true, res.message?.msgId != null ? String(res.message.msgId) : null, null);
        sent += 1;
      }
    } catch (e) {
      const code = zaloFailureCode(String((e as Error)?.message ?? ''));
      await finish(false, null, code);
      log('zalo_notify_failed', { kind: n.kind, code });
      if (code === 'zalo_session_expired') {
        await admin.from('zalo_accounts').update({ status: 'expired', last_error: code }).eq('staff_id', targets.sender);
        break;
      }
    }
    if (i < notices.length - 1) await sleep(4000 + Math.floor(Math.random() * 5000));
  }
  log('zalo_notify_done', { sent });
  return { ok: true, sent };
});

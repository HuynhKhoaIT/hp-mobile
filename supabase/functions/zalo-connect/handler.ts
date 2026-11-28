// zalo-connect — staff kết nối Zalo cá nhân bằng mã QR (thư viện zca-js, API Zalo KHÔNG chính thức; rủi ro tài khoản bị hạn chế đã được
// chấp nhận). Hai hành động:
//   start      tạo phiên QR: trả ảnh QR ngay khi Zalo tạo xong (≤ 25 giây), rồi tiếp tục chờ quét ở NỀN (EdgeRuntime.waitUntil) và
//              ghi trạng thái vào zalo_qr_sessions (waiting_scan → scanned → confirmed | expired | declined | error). Khi xác nhận:
//              mã hoá thông tin phiên (ZALO_SESSION_KEY, AES-GCM) rồi lưu zalo_accounts. Trang Kết nối Zalo hỏi lại bằng select (RLS).
//   disconnect xoá tài khoản Zalo đã kết nối của người gọi.
// Chỉ staff (moderator / admin): zalo_status() báo forbidden cho người khác. 10 lần start / giờ. Không log phiên / cookie / SĐT.
import { Zalo, LoginQRCallbackEventType } from 'npm:zca-js@2.2.0';
import { AppError, handler } from '../_shared/http.ts';
import { parseZaloConnectInput } from '../_shared/zalo.ts';
import { encryptJson, isValidKey } from '../_shared/zaloCrypto.ts';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

const FIRST_QR_MS = 25_000;

type Creds = { imei: string; userAgent: string; cookie: unknown };

export const zaloConnect = handler({ auth: 'user' }, async ({ req, db, admin, user, log }) => {
  const input = parseZaloConnectInput(await req.json());
  const uid = user!.id;

  // Cổng quyền: chỉ staff (RPC raise 42501 với người khác).
  const gate = await db!.rpc('zalo_status');
  if (gate.error) throw new AppError('forbidden', 403);

  if (input.action === 'disconnect') {
    const { error } = await admin.from('zalo_accounts').delete().eq('staff_id', uid); // service role: client không có quyền ghi bảng này
    if (error) throw new AppError('unknown', 500);
    await admin.from('zalo_qr_sessions').delete().eq('staff_id', uid);
    log('zalo_disconnected');
    return { ok: true };
  }

  const key = Deno.env.get('ZALO_SESSION_KEY') ?? '';
  if (!isValidKey(key)) throw new AppError('zalo_unavailable', 503);

  const limit = await admin.rpc('assert_rate_limit', { p_key: `zalo_connect:${uid}`, p_action: 'zalo_connect', p_max: 10, p_window_seconds: 3600 });
  if (limit.error) throw new AppError(limit.error.code === 'P0001' ? 'rate_limited' : 'unknown', limit.error.code === 'P0001' ? 429 : 500);

  // Dọn phiên QR cũ rồi tạo phiên mới (service role: client không có quyền ghi zalo_qr_sessions).
  await admin.from('zalo_qr_sessions').delete().eq('staff_id', uid);
  const created = await admin.from('zalo_qr_sessions').insert({ staff_id: uid }).select('id').single();
  if (created.error || !created.data) throw new AppError('unknown', 500);
  const qrId: string = created.data.id;

  // Mọi cập nhật DB đi qua một chuỗi để đúng thứ tự (callback của zca-js là đồng bộ).
  let chain: Promise<unknown> = Promise.resolve();
  const enqueue = (fn: () => PromiseLike<unknown>) => {
    chain = chain.then(fn).catch(() => undefined);
    return chain;
  };
  const patch = (fields: Record<string, unknown>) => enqueue(() => admin.from('zalo_qr_sessions').update(fields).eq('id', qrId));

  let creds: Creds | null = null;
  let scannedName: string | null = null;
  let scannedAvatar: string | null = null;
  let image: string | null = null;
  let status = 'waiting_scan';
  let ready: () => void = () => undefined;
  const firstEvent = new Promise<void>((resolve) => (ready = resolve));

  const run = new Zalo({ selfListen: false, checkUpdate: false, logging: false })
    .loginQR({}, (ev) => {
      switch (ev.type) {
        case LoginQRCallbackEventType.QRCodeGenerated:
          image = `data:image/png;base64,${ev.data.image}`;
          void patch({ image }).then(() => ready());
          break;
        case LoginQRCallbackEventType.QRCodeScanned:
          status = 'scanned';
          scannedName = ev.data.display_name ?? null;
          scannedAvatar = ev.data.avatar ?? null;
          void patch({ status, display_name: scannedName, avatar: scannedAvatar });
          break;
        case LoginQRCallbackEventType.QRCodeExpired:
          status = 'expired';
          void patch({ status });
          ev.actions.abort();
          break;
        case LoginQRCallbackEventType.QRCodeDeclined:
          status = 'declined';
          void patch({ status });
          ev.actions.abort();
          break;
        case LoginQRCallbackEventType.GotLoginInfo:
          creds = { imei: ev.data.imei, userAgent: ev.data.userAgent, cookie: ev.data.cookie };
          break;
      }
    })
    .then(async (api) => {
      if (!api || !creds) {
        if (status === 'waiting_scan' || status === 'scanned') await patch({ status: 'error', error: 'login_failed' });
        return;
      }
      const credentialsEnc = await encryptJson(creds, key);
      const saved = await admin.from('zalo_accounts').upsert({
        staff_id: uid,
        zalo_uid: api.getOwnId(),
        display_name: scannedName,
        avatar: scannedAvatar,
        credentials_enc: credentialsEnc,
        status: 'connected',
        last_error: null,
        connected_at: new Date().toISOString(),
      });
      await patch(saved.error ? { status: 'error', error: 'save_failed' } : { status: 'confirmed' });
      log('zalo_connected');
    })
    .catch(async (err: Error) => {
      log('zalo_login_error', { message: String(err?.message ?? '').slice(0, 120) });
      if (status !== 'expired' && status !== 'declined') await patch({ status: 'error', error: image ? 'login_failed' : 'qr_unavailable' });
    })
    .finally(() => ready());

  await Promise.race([firstEvent, new Promise((resolve) => setTimeout(resolve, FIRST_QR_MS))]);
  await chain;
  if (!image) {
    await patch({ status: 'error', error: 'qr_unavailable' });
    throw new AppError('zalo_unavailable', 503);
  }
  // Phần còn lại (chờ quét → lưu tài khoản) chạy tiếp sau khi đã trả lời.
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(run);
  return { ok: true, qrId, status, image };
});

'use client';

// Kết nối Zalo (/admin/zalo): staff kết nối Zalo cá nhân bằng mã QR để gửi tin tự động. Hiện trạng thái tài khoản (đã kết nối /
// chưa / hết hạn), nút Tạo mã QR (Edge Function zalo-connect), ảnh QR + trạng thái quét (tự hỏi lại mỗi 2 giây đến khi xong),
// nút Ngắt kết nối (xác nhận), hướng dẫn 3 bước và lưu ý rủi ro (API Zalo không chính thức). Thông tin phiên không bao giờ
// xuống trình duyệt — chỉ tên + trạng thái.
import type { ZaloQrStatus } from '@hp/shared';
import { formatDate } from '@hp/shared';
import { CircleCheck, Link2, Link2Off, QrCode, TriangleAlert } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/confirm-dialog';
import { Badge } from '@/components/shared/badge';
import { Button } from '@/components/ui/button';
import { asLocale } from '@/features/listing/display';
import { useAdminAction } from '../../lib/use-admin-action';
import { disconnectZaloAction, getZaloConnectionAction, startZaloConnectAction, type ZaloConnection } from '../actions';

const POLLING: readonly ZaloQrStatus[] = ['waiting_scan', 'scanned'];
const POLL_MS = 2000;

export function ZaloConnectPanel({ initial }: { initial: ZaloConnection }) {
  const t = useTranslations('admin.zalo.connect');
  const locale = asLocale(useLocale());
  const { pending, run } = useAdminAction();
  const [conn, setConn] = useState<ZaloConnection>(initial);
  const [qr, setQr] = useState<{ image: string; status: ZaloQrStatus } | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  const account = conn.account;
  const watching = qr !== null && POLLING.includes(qr.status);

  // Hỏi lại trạng thái quét mỗi 2 giây khi đang chờ quét / chờ xác nhận.
  useEffect(() => {
    if (!watching) return;
    let alive = true;
    const timer = setInterval(() => {
      void getZaloConnectionAction().then((r) => {
        if (!alive || !r.ok) return;
        setConn(r.data);
        const next = r.data.qr?.status;
        if (next) setQr((prev) => (prev ? { ...prev, status: next } : prev));
      });
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [watching]);

  const start = () =>
    run(() => startZaloConnectAction(), { onDone: (r) => setQr({ image: r.image, status: r.status }) });

  const state = !account ? 'not_connected' : account.status === 'connected' ? 'connected' : 'expired';
  const tone = state === 'connected' ? 'success' : state === 'expired' ? 'warning' : 'neutral';

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="zalo-status" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="zalo-status" className="text-md font-semibold text-fg">
            {t('status')}
          </h2>
          <Badge tone={tone}>{t(state)}</Badge>
        </div>
        {account ? (
          <p className="text-md text-fg">
            {t('connected_as', { name: account.display_name || t('unknown_name') })}
            <span className="block text-sm text-muted">{t('connected_at', { time: formatDate(account.connected_at, locale, 'datetime') })}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={start} disabled={pending || watching}>
            <QrCode strokeWidth={1.75} aria-hidden />
            {pending ? t('starting') : account ? t('restart') : t('start')}
          </Button>
          {account ? (
            <Button variant="outline" disabled={pending} onClick={() => setConfirmOff(true)}>
              <Link2Off strokeWidth={1.75} aria-hidden />
              {t('disconnect')}
            </Button>
          ) : null}
        </div>
      </section>

      {qr ? (
        <section aria-live="polite" className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
          {qr.status === 'confirmed' ? (
            <p role="status" className="flex items-center gap-2 text-md font-semibold text-success">
              <CircleCheck strokeWidth={1.75} className="size-5" aria-hidden />
              {t('qr.confirmed')}
            </p>
          ) : (
            <>
              <Image src={qr.image} alt={t('qr_alt')} width={224} height={224} unoptimized className="size-56 rounded-md border border-border bg-white p-2" />
              <p className="flex items-center gap-2 text-md text-fg">
                {POLLING.includes(qr.status) ? <Link2 strokeWidth={1.75} className="size-5 text-primary" aria-hidden /> : null}
                {t(`qr.${qr.status}`)}
              </p>
            </>
          )}
        </section>
      ) : null}

      <section aria-labelledby="zalo-steps" className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-card">
        <h2 id="zalo-steps" className="text-md font-semibold text-fg">
          {t('steps_title')}
        </h2>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-md text-fg">
          <li>{t('step_1')}</li>
          <li>{t('step_2')}</li>
          <li>{t('step_3')}</li>
        </ol>
      </section>

      <aside role="note" className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
        <TriangleAlert strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-md font-semibold text-fg">{t('risk_title')}</p>
          <p className="text-md text-fg">{t('risk_body')}</p>
        </div>
      </aside>

      <AdminConfirmDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title={t('confirm_disconnect_title')}
        description={t('confirm_disconnect_body')}
        confirmLabel={t('confirm_disconnect_cta')}
        destructive
        pending={pending}
        onConfirm={() => {
          setConfirmOff(false);
          run(() => disconnectZaloAction(), {
            success: t('toast_disconnected'),
            onDone: () => {
              setConn({ account: null, qr: null });
              setQr(null);
            },
          });
        }}
      />
    </div>
  );
}

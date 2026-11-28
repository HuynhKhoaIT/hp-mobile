'use client';

// Hộp thoại "Nhắn Zalo" (staff): chọn loại tin → tin soạn sẵn (sửa được) → "Ghi nhận và mở Zalo". Zalo cá nhân không cho gửi
// tự động, nên: server ghi nhận tin + trừ hạn mức (hết lượt / đang nghỉ thì chưa cho), web sao chép tin và mở link zalo.me tới
// người nhận, staff dán tin rồi bấm Gửi trong Zalo. Thanh hạn mức hôm nay + đếm ngược thời gian nghỉ; lịch sử tin đã ghi nhận.
// Form mount lại mỗi lần mở (state sạch). SĐT không đi qua client: chỉ nhận link zalo.me sau khi ghi nhận.
import type { ReserveZaloResult, ZaloMessage, ZaloSendResult, ZaloStatus } from '@hp/core';
import { APP_NAME, formatDate, renderZaloTemplate, ZALO_GENERAL_KINDS, type ZaloKind, type ZaloTarget } from '@hp/shared';
import { CircleCheck, Copy, MessageCircle, Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useState } from 'react';
import { SELECT_CLASS } from '@/components/admin/field-styles';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { asLocale } from '@/features/listing/display';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useAdminAction } from '../../lib/use-admin-action';
import {
  getZaloConnectionAction,
  getZaloStatusAction,
  getZaloTemplatesAction,
  listZaloMessagesAction,
  reserveZaloMessageAction,
  sendZaloAutoAction,
  type ZaloConnection,
} from '../actions';

/** `context`: tiêu đề đơn (chăm sóc sau dịch vụ) — điền vào tin soạn sẵn có {{title}}. */
export type ZaloRecipient = { type: ZaloTarget; id: string; name: string; context?: string };

type Props = {
  recipient: ZaloRecipient;
  defaultKind: ZaloKind;
  /** Loại tin được chọn (mặc định nhóm chung: lead / người dùng). */
  kinds?: readonly ZaloKind[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ZaloSendDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <ZaloForm {...props} /> : null}
    </Dialog>
  );
}

function ZaloForm({ recipient, defaultKind, kinds = ZALO_GENERAL_KINDS, onOpenChange }: Props) {
  const t = useTranslations('admin.zalo');
  const tCommon = useTranslations('common.actions');
  const locale = asLocale(useLocale());
  const toast = useToast();
  const id = useId();
  const { pending, run } = useAdminAction();

  // Mẫu tuỳ chỉnh của admin (ghi đè bản mặc định ở i18n); chưa tải xong / loại chưa có mẫu → dùng bản mặc định.
  const [custom, setCustom] = useState<Partial<Record<ZaloKind, string>>>({});
  const template = useCallback(
    (k: ZaloKind) => {
      const vars = { name: recipient.name, app: APP_NAME, title: recipient.context ?? '' };
      const own = custom[k];
      return own ? renderZaloTemplate(own, vars) : t(`template.${k}`, vars);
    },
    [t, custom, recipient.name, recipient.context],
  );
  const [kind, setKind] = useState<ZaloKind>(defaultKind);
  // `edited` = chữ staff đã tự sửa; chưa sửa thì tin soạn sẵn theo loại tin (đổi loại tin / mẫu tải xong thì tự đổi theo).
  const [edited, setEdited] = useState<string | null>(null);
  const text = edited ?? template(kind);
  const [status, setStatus] = useState<ZaloStatus | null>(null);
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [history, setHistory] = useState<ZaloMessage[] | null>(null);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [conn, setConn] = useState<ZaloConnection | null>(null);
  const [sentOk, setSentOk] = useState(false);

  const applyStatus = useCallback((s: ZaloStatus) => {
    const at = Date.now();
    setStatus(s);
    setNow(at);
    setUntil(at + s.wait_seconds * 1000);
  }, []);

  const loadHistory = useCallback(async () => {
    const r = await listZaloMessagesAction({ targetType: recipient.type, targetId: recipient.id });
    setHistory(r.ok ? r.data : []);
  }, [recipient.type, recipient.id]);

  // Hạn mức hôm nay + lịch sử khi mở (callback bất đồng bộ nên không setState đồng bộ trong effect).
  useEffect(() => {
    let alive = true;
    void getZaloStatusAction().then((r) => {
      if (alive && r.ok) applyStatus(r.data);
    });
    void listZaloMessagesAction({ targetType: recipient.type, targetId: recipient.id }).then((r) => {
      if (alive) setHistory(r.ok ? r.data : []);
    });
    void getZaloConnectionAction().then((r) => {
      if (alive && r.ok) setConn(r.data);
    });
    void getZaloTemplatesAction().then((r) => {
      if (alive && r.ok) setCustom(Object.fromEntries(r.data.map((m) => [m.kind, m.content])));
    });
    return () => {
      alive = false;
    };
  }, [applyStatus, recipient.type, recipient.id]);

  // Đếm ngược thời gian nghỉ giữa 2 tin.
  useEffect(() => {
    if (until <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [until, now]);

  const waitLeft = Math.max(0, Math.ceil((until - now) / 1000));
  const canSend = !!status && status.reason !== 'limit_reached' && (status.can_send || (status.reason === 'waiting' && waitLeft === 0));
  const trimmed = text.trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(trimmed);
      return true;
    } catch {
      return false;
    }
  };

  const reasonText = (s: ZaloStatus | null) =>
    s?.reason ? t(`reason.${s.reason}`, { seconds: s.reason === 'waiting' ? Math.max(waitLeft, s.wait_seconds) : 0, quota: s.quota }) : null;

  const submit = () =>
    run(() => reserveZaloMessageAction({ targetType: recipient.type, targetId: recipient.id, kind, content: trimmed }), {
      onDone: (r: ReserveZaloResult) => {
        applyStatus(r.status);
        if (r.ok) {
          setUrl(r.zalo_url);
          void copy().then(setCopied);
          void loadHistory();
        } else {
          toast.show(reasonText(r.status) ?? t('cta_blocked'), 'error');
        }
      },
    });

  // Gửi tự động bằng Zalo đã kết nối (Edge Function zalo-send); lỗi phiên → tải lại trạng thái kết nối để hiện "hết hạn".
  const sendNow = () =>
    run(() => sendZaloAutoAction({ targetType: recipient.type, targetId: recipient.id, kind, content: trimmed }), {
      onDone: (r: ZaloSendResult) => {
        applyStatus(r.status);
        if (r.ok) {
          setSentOk(true);
          void loadHistory();
        } else {
          toast.show(reasonText(r.status) ?? t('cta_blocked'), 'error');
        }
      },
      onError: () => {
        void getZaloConnectionAction().then((r) => {
          if (r.ok) setConn(r.data);
        });
      },
    });

  const copyAgain = async () => {
    const done = await copy();
    toast.show(done ? t('copied_toast') : t('copy_failed'), done ? undefined : 'error');
  };

  const pct = status && status.quota > 0 ? Math.min(100, Math.round((status.sent / status.quota) * 100)) : 0;
  const note = status ? (waitLeft > 0 && status.reason === 'waiting' ? t('reason.waiting', { seconds: waitLeft }) : reasonText(status)) : null;
  const label = !status
    ? t('quota_loading')
    : waitLeft > 0 && status.reason === 'waiting'
      ? t('cta_waiting', { seconds: waitLeft })
      : !canSend
        ? t('cta_blocked')
        : t('cta');

  return (
    <DialogContent className="sm:max-w-lg" closeLabel={tCommon('close')}>
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{t('dialog_title', { name: recipient.name })}</DialogTitle>
          <DialogDescription>{t('hint')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
          <div className="flex items-center gap-2 text-sm">
            <MessageCircle strokeWidth={1.75} className="size-4 text-primary" aria-hidden />
            <span className="font-semibold text-fg">{t('quota_title')}</span>
            <span className="ml-auto font-bold text-fg tabular-nums">
              {status ? t('quota_count', { sent: status.sent, quota: status.quota }) : '…'}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t('quota_title')}
            aria-valuemin={0}
            aria-valuemax={status?.quota ?? 0}
            aria-valuenow={status?.sent ?? 0}
            className="h-1.5 overflow-hidden rounded-full bg-surface-2"
          >
            <div className={cn('h-full rounded-full transition-all duration-150', status?.remaining === 0 ? 'bg-danger' : 'bg-primary')} style={{ width: `${pct}%` }} />
          </div>
          {note ? <p className={cn('text-sm', canSend ? 'text-muted' : 'text-warning')}>{note}</p> : null}
        </div>

        {sentOk ? (
          <div className="flex flex-col gap-3">
            <p role="status" className="flex items-start gap-2 rounded-md bg-primary-light p-3 text-md text-primary">
              <CircleCheck strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>{t('sent_ok', { sent: status?.sent ?? 0, quota: status?.quota ?? 0 })}</span>
            </p>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('done')}
            </Button>
          </div>
        ) : url ? (
          <div className="flex flex-col gap-3">
            <p role="status" className="flex items-start gap-2 rounded-md bg-primary-light p-3 text-md text-primary">
              <CircleCheck strokeWidth={1.75} className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>
                {t('recorded', { sent: status?.sent ?? 0, quota: status?.quota ?? 0 })} {copied ? t('copied') : t('copy_on_open')}
              </span>
            </p>
            <Button asChild>
              <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => void copy()}>
                <MessageCircle strokeWidth={1.75} aria-hidden />
                {t('open_zalo')}
              </a>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => void copyAgain()}>
                <Copy strokeWidth={1.75} aria-hidden />
                {t('copy_again')}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('done')}
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSend && trimmed && !pending) submit();
            }}
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-kind`}>{t('kind_label')}</Label>
              <select
                id={`${id}-kind`}
                className={SELECT_CLASS}
                value={kind}
                onChange={(e) => setKind(e.target.value as ZaloKind)}
              >
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {t(`kind.${k}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-text`}>{t('content_label')}</Label>
              <Textarea
                id={`${id}-text`}
                rows={6}
                maxLength={2000}
                value={text}
                onChange={(e) => setEdited(e.target.value)}
              />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch sm:justify-start">
              {conn?.account?.status === 'connected' ? (
                <>
                  {/* Gửi tự động bằng Zalo đã kết nối; mở zalo.me tự dán là lựa chọn phụ. */}
                  <Button type="button" disabled={pending || !canSend || !trimmed} onClick={sendNow}>
                    <Send strokeWidth={1.75} aria-hidden />
                    {pending ? t('sending') : label === t('cta') ? t('send_now') : label}
                  </Button>
                  <p className="text-center text-sm text-muted">{t('auto_from', { name: conn.account.display_name || t('connect.unknown_name') })}</p>
                  <Button type="submit" variant="outline" disabled={pending || !canSend || !trimmed}>
                    <MessageCircle strokeWidth={1.75} aria-hidden />
                    {t('or_manual')}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="submit" disabled={pending || !canSend || !trimmed}>
                    <MessageCircle strokeWidth={1.75} aria-hidden />
                    {label}
                  </Button>
                  {conn ? (
                    <p className="text-sm text-muted">
                      {conn.account?.status === 'expired' ? t('expired_hint') : t('connect_hint')}{' '}
                      <Link href="/admin/zalo" className="font-medium text-primary underline-offset-4 hover:underline">
                        {t('connect_link')}
                      </Link>
                    </p>
                  ) : null}
                </>
              )}
            </DialogFooter>
          </form>
        )}

        <section aria-labelledby={`${id}-history`} className="flex flex-col gap-2 border-t border-border pt-3">
          <h3 id={`${id}-history`} className="text-md font-semibold text-fg">
            {t('history_title')}
          </h3>
          {history === null ? null : history.length === 0 ? (
            <p className="text-sm text-muted">{t('history_empty')}</p>
          ) : (
            <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
              {history.map((m) => (
                <li key={m.id} className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 p-2 text-sm">
                  <span className="flex flex-wrap items-center gap-x-2 text-muted">
                    <time dateTime={m.created_at}>{formatDate(m.created_at, locale, 'datetime')}</time>
                    <span>{t(`kind.${m.kind}`)}</span>
                    <span>
                      {t(`mode.${m.mode}`)} · {t(`delivery.${m.delivery}`)}
                    </span>
                    {m.staff_name ? <span>{t('history_by', { name: m.staff_name })}</span> : null}
                  </span>
                  <span className="whitespace-pre-wrap text-fg">{m.content}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DialogContent>
  );
}

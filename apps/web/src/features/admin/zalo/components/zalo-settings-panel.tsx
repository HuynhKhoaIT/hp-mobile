'use client';

// Cấu hình Zalo (/admin/zalo-settings, chỉ admin): (1) hạn mức tin mỗi ngày + thời gian nghỉ giữa 2 tin (có cận an toàn như DB),
// (2) mẫu tin soạn sẵn cho từng loại tin — sửa, xem trước với dữ liệu mẫu, khôi phục mặc định. Nhân viên thấy mẫu này trong hộp
// thoại "Nhắn Zalo" (không có mẫu tuỳ chỉnh thì dùng bản mặc định ở i18n `admin.zalo.template.*`).
import type { ZaloSender, ZaloSettings, ZaloTemplate } from '@hp/core';
import {
  APP_NAME,
  formatDate,
  renderZaloTemplate,
  SaveZaloAutoInput,
  SaveZaloSettingsInput,
  ZALO_KINDS,
  ZALO_LIMITS,
  ZALO_SETTINGS_BOUNDS,
  ZALO_TEMPLATE_VARS,
  type ZaloKind,
} from '@hp/shared';
import { RotateCcw, Save } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/confirm-dialog';
import { SELECT_CLASS } from '@/components/admin/field-styles';
import { Badge } from '@/components/shared/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { asLocale } from '@/features/listing/display';
import { useAdminAction } from '../../lib/use-admin-action';
import { resetZaloTemplateAction, saveZaloAutoAction, saveZaloSettingsAction, saveZaloTemplateAction } from '../actions';

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function ZaloSettingsPanel({
  settings,
  templates,
  senders,
}: {
  settings: ZaloSettings;
  templates: ZaloTemplate[];
  senders: ZaloSender[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <LimitsCard settings={settings} />
      <AutoCard settings={settings} senders={senders} />
      <TemplatesCard templates={templates} />
    </div>
  );
}

// Zalo CSKH + công tắc tự báo khi khách chốt báo giá (zalo-notify). Chỉ chọn được tài khoản Zalo đã kết nối (staff quét QR ở trang Kết nối Zalo).
function AutoCard({ settings, senders }: { settings: ZaloSettings; senders: ZaloSender[] }) {
  const t = useTranslations('admin.zalo_settings.auto');
  const id = useId();
  const { pending, run } = useAdminAction();
  const [enabled, setEnabled] = useState(settings.notify_accepted);
  const [sender, setSender] = useState(settings.auto_sender_id ?? '');
  const [invalid, setInvalid] = useState(false);

  const connected = senders.filter((s) => s.status === 'connected');
  const lost = sender !== '' && !connected.some((s) => s.staff_id === sender);

  const save = () => {
    const input = { enabled, senderId: sender === '' ? null : sender };
    if (!SaveZaloAutoInput.safeParse(input).success) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    run(() => saveZaloAutoAction(input), { success: t('saved') });
  };

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-fg">
          {t('title')}
        </h2>
        <p className="text-md text-muted">{t('hint')}</p>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-sender`}>{t('sender')}</Label>
        <select
          id={`${id}-sender`}
          className={SELECT_CLASS}
          value={sender}
          aria-invalid={invalid || undefined}
          onChange={(e) => setSender(e.target.value)}
        >
          <option value="">{t('sender_none')}</option>
          {connected.map((s) => (
            <option key={s.staff_id} value={s.staff_id}>
              {s.display_name ?? '—'} · {s.staff_name ?? '—'}
            </option>
          ))}
        </select>
        {connected.length === 0 ? <p className="text-sm text-muted">{t('no_accounts')}</p> : null}
        {lost ? (
          <p role="alert" className="text-sm text-warning">
            {t('sender_lost')}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id={`${id}-enabled`} checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />
        <Label htmlFor={`${id}-enabled`}>{t('enabled')}</Label>
      </div>
      <p className="text-sm text-muted">{t('limits_note')}</p>
      {invalid ? (
        <p role="alert" className="text-sm text-danger">
          {t('invalid')}
        </p>
      ) : null}
      <div>
        <Button disabled={pending} onClick={save}>
          <Save strokeWidth={1.75} aria-hidden />
          {t('save')}
        </Button>
      </div>
    </section>
  );
}

function LimitsCard({ settings }: { settings: ZaloSettings }) {
  const t = useTranslations('admin.zalo_settings.limits');
  const locale = asLocale(useLocale());
  const id = useId();
  const { pending, run } = useAdminAction();
  const [values, setValues] = useState({
    dailyMin: String(settings.daily_min),
    dailyMax: String(settings.daily_max),
    delayMin: String(settings.delay_min),
    delayMax: String(settings.delay_max),
  });
  const [invalid, setInvalid] = useState(false);

  const fields = [
    { key: 'dailyMin', label: t('daily_min'), min: ZALO_SETTINGS_BOUNDS.dailyMin, max: ZALO_SETTINGS_BOUNDS.dailyMax },
    { key: 'dailyMax', label: t('daily_max'), min: ZALO_SETTINGS_BOUNDS.dailyMin, max: ZALO_SETTINGS_BOUNDS.dailyMax },
    { key: 'delayMin', label: t('delay_min'), min: ZALO_SETTINGS_BOUNDS.delayMin, max: ZALO_SETTINGS_BOUNDS.delayMax },
    { key: 'delayMax', label: t('delay_max'), min: ZALO_SETTINGS_BOUNDS.delayMin, max: ZALO_SETTINGS_BOUNDS.delayMax },
  ] as const;

  const save = () => {
    const input = {
      dailyMin: Number(values.dailyMin),
      dailyMax: Number(values.dailyMax),
      delayMin: Number(values.delayMin),
      delayMax: Number(values.delayMax),
    };
    if (!SaveZaloSettingsInput.safeParse(input).success) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    run(() => saveZaloSettingsAction(input), { success: t('saved') });
  };

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-fg">
          {t('title')}
        </h2>
        <p className="text-md text-muted">{t('hint')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <Label htmlFor={`${id}-${f.key}`}>{f.label}</Label>
            <Input
              id={`${id}-${f.key}`}
              type="number"
              inputMode="numeric"
              min={f.min}
              max={f.max}
              step={1}
              value={values[f.key]}
              aria-invalid={invalid || undefined}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">
        {t('bounds', {
          dailyMin: ZALO_SETTINGS_BOUNDS.dailyMin,
          dailyMax: ZALO_SETTINGS_BOUNDS.dailyMax,
          delayMin: ZALO_SETTINGS_BOUNDS.delayMin,
          delayMax: ZALO_SETTINGS_BOUNDS.delayMax,
        })}
      </p>
      {invalid ? (
        <p role="alert" className="text-sm text-danger">
          {t('invalid')}
        </p>
      ) : null}
      <p className="text-sm text-muted">{t('applies')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending} onClick={save}>
          <Save strokeWidth={1.75} aria-hidden />
          {t('save')}
        </Button>
        <span className="text-sm text-muted">{t('updated', { time: formatDate(settings.updated_at, locale, 'datetime') })}</span>
      </div>
    </section>
  );
}

function TemplatesCard({ templates }: { templates: ZaloTemplate[] }) {
  const t = useTranslations('admin.zalo_settings.templates');
  const id = useId();
  const byKind = new Map(templates.map((m) => [m.kind, m]));
  const vars = ZALO_TEMPLATE_VARS.map((v) => `{{${v}}}`).join(', ');

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-fg">
          {t('title')}
        </h2>
        <p className="text-md text-muted">{t('hint', { vars })}</p>
        <ul className="flex flex-col gap-1 text-sm text-muted">
          {ZALO_TEMPLATE_VARS.map((v) => (
            <li key={v}>
              <code className="rounded-sm bg-surface-2 px-1 text-fg">{`{{${v}}}`}</code> — {t(`var.${v}`)}
            </li>
          ))}
        </ul>
      </div>
      <ul className="flex flex-col gap-4">
        {ZALO_KINDS.map((kind) => (
          <li key={kind}>
            <TemplateCard kind={kind} saved={byKind.get(kind)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TemplateCard({ kind, saved }: { kind: ZaloKind; saved: ZaloTemplate | undefined }) {
  const t = useTranslations('admin.zalo_settings.templates');
  const tZalo = useTranslations('admin.zalo');
  const id = useId();
  const { pending, run } = useAdminAction();
  // Bản mặc định ở i18n (đã chuyển {{x}} → {x} cho next-intl): đổi lại thành {{x}} để hiện / sửa trong ô nhập.
  const defaultText = tZalo.raw(`template.${kind}`).replace(/\{(name|app|title)\}/g, '{{$1}}');
  const [text, setText] = useState(saved?.content ?? defaultText);
  const [confirmReset, setConfirmReset] = useState(false);

  const trimmed = text.trim();
  const unknown = [...new Set([...trimmed.matchAll(PLACEHOLDER)].map((m) => m[1] ?? '').filter((v) => !(ZALO_TEMPLATE_VARS as readonly string[]).includes(v)))];
  const preview = renderZaloTemplate(trimmed, { name: t('sample_name'), app: APP_NAME, title: t('sample_title') });
  const unchanged = trimmed === (saved?.content ?? defaultText).trim();
  const kindLabel = tZalo(`kind.${kind}`);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-md font-semibold text-fg">{kindLabel}</h3>
        <Badge tone={saved ? 'primary' : 'neutral'}>{saved ? t('custom') : t('default')}</Badge>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-text`}>{t('content')}</Label>
        <Textarea id={`${id}-text`} rows={4} maxLength={ZALO_LIMITS.contentMax} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {unknown.length > 0 ? (
        <p role="alert" className="text-sm text-warning">
          {t('unknown_vars', { vars: unknown.map((v) => `{{${v}}}`).join(', ') })}
        </p>
      ) : null}
      {trimmed ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted">{t('preview')}</span>
          <p className="rounded-md bg-surface-2 p-3 text-md whitespace-pre-wrap text-fg">{preview}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending || !trimmed || unchanged}
          onClick={() => run(() => saveZaloTemplateAction({ kind, content: trimmed }), { success: t('saved') })}
        >
          <Save strokeWidth={1.75} aria-hidden />
          {t('save')}
        </Button>
        {saved ? (
          <Button variant="outline" disabled={pending} onClick={() => setConfirmReset(true)}>
            <RotateCcw strokeWidth={1.75} aria-hidden />
            {t('reset')}
          </Button>
        ) : null}
      </div>

      <AdminConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t('reset_title', { kind: kindLabel })}
        description={t('reset_body')}
        confirmLabel={t('reset')}
        pending={pending}
        onConfirm={() => {
          setConfirmReset(false);
          run(() => resetZaloTemplateAction({ kind }), { success: t('reset_done'), onDone: () => setText(defaultText) });
        }}
      />
    </div>
  );
}

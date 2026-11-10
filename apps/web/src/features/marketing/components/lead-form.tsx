'use client';
// Form lead: <form action> + useActionState nên tắt JS vẫn gửi được. Gửi xong hiện cảm ơn tại chỗ, không chuyển trang.
// `website` là ô bẫy bot: ẩn khỏi người dùng và trình đọc màn hình, không tự điền.
import { APP_NAME, LEAD, LEAD_KINDS, type LeadKind } from '@hp/shared';
import { CheckCircle2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { readUtm, track } from '@/lib/analytics';
import { submitLeadAction } from '../actions';

const SELECT_CLASS =
  'min-h-11 w-full rounded-md border border-border bg-surface px-3 text-md text-fg outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

export function LeadForm({ source, defaultKind = 'user' }: { source: string; defaultKind?: LeadKind }) {
  const t = useTranslations('web.marketing.lead');
  const te = useTranslations('errors');
  const locale = useLocale();
  const id = useId();
  const [state, action, pending] = useActionState(submitLeadAction, null);
  const utmRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<LeadKind>(defaultKind);

  const sent = state?.ok === true;
  useEffect(() => {
    if (sent) track('lead_submit', { kind, source });
  }, [sent, kind, source]);

  if (sent) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg bg-surface p-4 shadow-card">
        <CheckCircle2 aria-hidden strokeWidth={1.75} className="size-6 shrink-0 text-success" />
        <div className="flex flex-col gap-1">
          <p className="text-md font-semibold text-fg">{t('thanks_title')}</p>
          <p className="text-md text-fg">{t('thanks_body')}</p>
        </div>
      </div>
    );
  }

  const fieldError = (key: string) => {
    const code = state && !state.ok ? state.fieldErrors?.[key]?.[0] : undefined;
    return code ? te(code) : null;
  };
  const contactError = fieldError('contact');
  const consentError = fieldError('consent');
  const formError = state && !state.ok && !state.fieldErrors ? te(state.code) : null;

  return (
    <form
      action={action}
      noValidate
      onSubmit={() => {
        if (utmRef.current) utmRef.current.value = JSON.stringify(readUtm());
      }}
      className="flex flex-col gap-4 rounded-lg bg-surface p-4 shadow-card"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-fg">{t('title')}</h2>
        <p className="text-md text-muted">{t('subtitle')}</p>
      </div>

      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="locale" value={locale} />
      <input ref={utmRef} type="hidden" name="utm" defaultValue="{}" />
      <div aria-hidden className="absolute -left-full size-px overflow-hidden">
        <label htmlFor={`${id}-website`}>{t('honeypot_label')}</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-kind`}>{t('kind_label')}</Label>
        <select
          id={`${id}-kind`}
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as LeadKind)}
          className={SELECT_CLASS}
        >
          {LEAD_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`kinds.${k}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-contact`}>{t('contact_label')}</Label>
        <Input
          id={`${id}-contact`}
          name="contact"
          required
          maxLength={LEAD.contactMax}
          autoComplete="tel"
          aria-invalid={!!contactError}
          aria-describedby={contactError ? `${id}-contact-error` : undefined}
        />
        {contactError ? (
          <p id={`${id}-contact-error`} className="text-sm text-danger">
            {contactError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-name`}>{t('name_label')}</Label>
        <Input id={`${id}-name`} name="name" maxLength={LEAD.nameMax} autoComplete="name" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-message`}>{t('message_label')}</Label>
        <Textarea id={`${id}-message`} name="message" maxLength={LEAD.messageMax} rows={3} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-3">
          <Checkbox
            id={`${id}-consent`}
            name="consent"
            aria-invalid={!!consentError}
            aria-describedby={consentError ? `${id}-consent-error` : undefined}
          />
          <Label htmlFor={`${id}-consent`} className="block font-normal">
            {t('consent', { appName: APP_NAME })}{' '}
            <Link href="/chinh-sach-bao-mat" className="text-primary underline">
              {t('privacy')}
            </Link>
          </Label>
        </div>
        {consentError ? (
          <p id={`${id}-consent-error`} className="text-sm text-danger">
            {consentError}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t('sending') : t('submit')}
      </Button>
    </form>
  );
}

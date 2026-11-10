'use client';

// Đăng nhập admin bước 2: TOTP (bắt buộc cho khu /admin — proxy.ts chặn mọi trang admin khi phiên chưa aal2).
//   - Chưa có factor TOTP đã xác minh → đăng ký: hiện QR (data URL SVG do Supabase sinh, không cần thư viện) + khoá nhập
//     tay + ô mã 6 số. Xác minh xong = factor được kích hoạt và phiên lên aal2 cùng lúc.
//   - Đã có → nhập mã 6 số (challenge + verify).
// Xác minh thành công: supabase-js lưu phiên aal2 vào cookie (@supabase/ssr) → tải lại tới `next` (hoặc /admin) để proxy
// đọc cookie mới. Chưa đăng nhập → về /admin/login; không phải staff → báo + nút đổi tài khoản.
import { enrollTotp, getMfaState, getSessionInfo, verifyTotp } from '@hp/core';
import { APP_NAME } from '@hp/shared';
import { Check, Copy, ShieldAlert, Smartphone } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { asLocale } from '@/features/listing/display';
import { withLocale } from '@/i18n/paths';
import { createBrowserClient } from '@/lib/supabase/client';
import { signOutToAdminLogin } from '../sign-out';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; code: string }
  | { kind: 'not_staff' }
  | { kind: 'enroll'; factorId: string; qrCode: string; secret: string }
  | { kind: 'verify'; factorId: string };

/** Khoá base32 chia nhóm 4 ký tự cho dễ gõ. */
const groupSecret = (secret: string) => secret.replace(/(.{4})/g, '$1 ').trim();

function CodeForm({ factorId, submitLabel, onDone }: { factorId: string; submitLabel: string; onDone: () => void }) {
  const t = useTranslations('admin.mfa');
  const errorText = useErrorText();
  const id = useId();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (value: string) => {
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await verifyTotp(createBrowserClient(), { factorId, code: value });
    if (res.error) {
      setPending(false);
      setError(res.error.code);
      setCode('');
      return;
    }
    onDone();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(code);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-code`}>{t('code_label')}</Label>
        <Input
          id={`${id}-code`}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(value);
            // Đủ 6 số → gửi luôn (không cần bấm nút).
            if (value.length === 6) void submit(value);
          }}
          className="text-center text-2xl tracking-widest"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={pending}
          autoFocus
        />
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-sm text-danger">
            {errorText(error)}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" disabled={pending || code.length !== 6}>
        {submitLabel}
      </Button>
    </form>
  );
}

function SecretBox({ secret }: { secret: string }) {
  const t = useTranslations('admin.mfa');
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard (http, quyền) — người dùng vẫn chọn chữ để chép được.
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{t('secret_label')}</p>
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 py-1 pr-1 pl-3">
        <code className="min-w-0 flex-1 font-mono text-md font-semibold break-words text-fg select-all">{groupSecret(secret)}</code>
        <Button type="button" variant="ghost" size="icon" onClick={() => void copy()} aria-label={copied ? t('copied') : t('copy')}>
          {copied ? <Check strokeWidth={1.75} className="text-success" /> : <Copy strokeWidth={1.75} />}
        </Button>
      </div>
      <span role="status" className="sr-only">
        {copied ? t('copied') : ''}
      </span>
    </div>
  );
}

export function MfaFlow({ next }: { next: string | null }) {
  const t = useTranslations('admin');
  const locale = asLocale(useLocale());
  const [state, setState] = useState<State>({ kind: 'loading' });
  const started = useRef(false);

  const done = () => window.location.assign(next ?? withLocale('/admin', locale));

  const load = async () => {
    const client = createBrowserClient();
    const session = await getSessionInfo(client);
    if (session.error) return setState({ kind: 'error', code: session.error.code });
    if (!session.data) return window.location.assign(withLocale('/admin/login', locale));
    if (session.data.role === 'user') return setState({ kind: 'not_staff' });

    const mfa = await getMfaState(client);
    if (mfa.error) return setState({ kind: 'error', code: mfa.error.code });
    if (mfa.data.currentLevel === 'aal2') return done();
    if (mfa.data.totpFactorId) return setState({ kind: 'verify', factorId: mfa.data.totpFactorId });

    const enrolled = await enrollTotp(client, { issuer: APP_NAME, friendlyName: `${APP_NAME} admin` });
    if (enrolled.error) return setState({ kind: 'error', code: enrolled.error.code });
    setState({ kind: 'enroll', factorId: enrolled.data.factorId, qrCode: enrolled.data.qrCode, secret: enrolled.data.secret });
  };

  useEffect(() => {
    // Một lần (StrictMode gọi effect 2 lần ở dev — đăng ký TOTP 2 lần sẽ đụng nhau).
    if (started.current) return;
    started.current = true;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOutLink = (
    <Button type="button" variant="link" className="self-start px-0" onClick={() => void signOutToAdminLogin(locale)}>
      {t('mfa.sign_out')}
    </Button>
  );

  switch (state.kind) {
    case 'loading':
      return (
        <div className="flex flex-col gap-4" aria-busy>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="mx-auto size-48" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    case 'error':
      return (
        <div className="flex flex-col gap-2">
          <ErrorState
            code={state.code}
            onRetry={() => {
              setState({ kind: 'loading' });
              void load();
            }}
          />
          {signOutLink}
        </div>
      );
    case 'not_staff':
      return (
        <div className="flex flex-col gap-4">
          <p role="alert" className="flex items-start gap-3 rounded-md bg-danger/10 p-3 text-md text-fg">
            <ShieldAlert strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            {t('login.not_staff')}
          </p>
          <Button size="lg" onClick={() => void signOutToAdminLogin(locale)}>
            {t('login.use_other')}
          </Button>
        </div>
      );
    case 'verify':
      return (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-fg">{t('mfa.verify_title')}</h1>
            <p className="text-md text-muted">{t('mfa.verify_intro', { app: APP_NAME })}</p>
          </div>
          <CodeForm factorId={state.factorId} submitLabel={t('mfa.submit')} onDone={done} />
          <p className="flex items-start gap-2 text-sm text-muted">
            <Smartphone strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t('mfa.lost_device')}
          </p>
          {signOutLink}
        </div>
      );
    case 'enroll':
      return (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-fg">{t('mfa.enroll_title')}</h1>
            <p className="text-md text-muted">{t('mfa.enroll_intro')}</p>
          </div>
          <ol className="flex flex-col gap-4">
            {(['step_install', 'step_scan', 'step_code'] as const).map((key, i) => (
              <li key={key} className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary"
                  >
                    {i + 1}
                  </span>
                  <p className="text-md text-fg">{t(`mfa.${key}`)}</p>
                </div>
                {key === 'step_scan' ? (
                  <div className="flex flex-col gap-4 pl-9">
                    {/* QR cần nền sáng ở cả chế độ tối để máy quét đọc được: surface (trắng) / fg (gần trắng khi tối). */}
                    <div className="self-center rounded-md border border-border bg-surface p-3 dark:bg-fg">
                      <Image src={state.qrCode} alt={t('mfa.qr_alt')} width={176} height={176} unoptimized className="size-44" />
                    </div>
                    <SecretBox secret={state.secret} />
                  </div>
                ) : null}
                {key === 'step_code' ? (
                  <div className="pl-9">
                    <CodeForm factorId={state.factorId} submitLabel={t('mfa.submit_enroll')} onDone={done} />
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
          {signOutLink}
        </div>
      );
  }
}

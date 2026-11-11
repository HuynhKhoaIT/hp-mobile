'use client';

// Onboarding 3 bước (giống app; style Stitch "Chọn nơi làm việc"): thanh trên (quay lại · viên "Bước x/3" · Bỏ qua ở bước
// cuối) + thanh tiến độ chia đoạn → khối mở đầu (ô icon + tiêu đề + câu phụ) từng bước:
// 1 ngôn ngữ · 2 ảnh đại diện (không bắt buộc, upload ngay khi chọn) + tên + đồng ý điều khoản (bắt buộc, Nghị định 13/2023) ·
// 3 nơi làm việc (thẻ chọn, bấm lại để bỏ) + quan tâm (chip có chấm màu dịch vụ), bỏ qua được. Không có mục "cư trú" như
// bản thiết kế (hồ sơ chỉ có profiles.site + interests). Lưu một lần ở bước cuối qua completeOnboarding (@hp/core).
import { completeOnboarding, listSites, type MyProfile, type Site } from '@hp/core';
import { CONSENT_VERSION, FEATURES, type Feature, LOCALES, type Locale } from '@hp/shared';
import { Check, ChevronLeft, Factory, Languages, RefreshCw, UserRound } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarPicker } from '@/features/profile/components/avatar-picker';
import { Link } from '@/i18n/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { AuthHero } from './auth-hero';
import { useErrorText } from './use-error-text';

const TOTAL = 3;

/** Chấm màu dịch vụ trước chữ chip "quan tâm" (class đầy đủ để Tailwind quét được), giống Chip `dot` của app. */
const FEATURE_DOT: Record<Feature, string> = {
  pass: 'bg-service-pass',
  room: 'bg-service-room',
  job: 'bg-service-job',
  lostFound: 'bg-service-lost-found',
  ride: 'bg-service-ride',
  sport: 'bg-service-sport',
};

export function OnboardingForm({ profile, onDone }: { profile: MyProfile; onDone: (locale: Locale) => void }) {
  const t = useTranslations();
  const errorText = useErrorText();
  const id = useId();
  const currentLocale = useLocale() as Locale;
  const [step, setStep] = useState(1);
  const [locale, setLocale] = useState<Locale>(currentLocale);
  const [fullName, setFullName] = useState(profile.full_name);
  // Ảnh đã upload (giữ khi quay lại bước 2 — picker được dựng lại).
  const [avatar, setAvatar] = useState(profile.avatar_url);
  const [consent, setConsent] = useState(false);
  const [site, setSite] = useState<string | null>(profile.site);
  const [interests, setInterests] = useState<Feature[]>((profile.interests ?? []) as Feature[]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const toggleInterest = (feature: Feature) =>
    setInterests((list) => (list.includes(feature) ? list.filter((f) => f !== feature) : [...list, feature]));

  const save = async (withChoices: boolean) => {
    setPending(true);
    setError(null);
    const result = await completeOnboarding(createBrowserClient(), {
      full_name: fullName,
      locale,
      site: withChoices ? site : null,
      interests: withChoices ? interests : [],
      consent_version: CONSENT_VERSION,
    });
    if (result.error) {
      setPending(false);
      // Lỗi ở trường tên → quay lại bước 2 để sửa.
      if (result.error.fieldErrors?.full_name) setStep(2);
      setError(result.error.fieldErrors?.full_name?.[0] ?? result.error.code);
      return;
    }
    onDone(locale);
  };

  const submitName = (event: FormEvent) => {
    event.preventDefault();
    if (fullName.trim().length === 0) return setError('required');
    if (!consent) return setError('consent_required');
    setError(null);
    setStep(3);
  };

  return (
    <div className="flex flex-col gap-6">
      <StepBar
        step={step}
        total={TOTAL}
        onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
        backDisabled={pending}
        action={step === TOTAL ? { label: t('auth.onboarding.skip'), onClick: () => void save(false), disabled: pending } : undefined}
      />

      {step === 1 ? (
        <div className="flex flex-col gap-5">
          <AuthHero icon={Languages} title={t('auth.onboarding.language_title')} subtitle={t('auth.onboarding.language_hint')} />
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((l) => (
              <ChoiceChip key={l} lang={l} selected={locale === l} onClick={() => setLocale(l)}>
                {t(`common.locale.${l}`)}
              </ChoiceChip>
            ))}
          </div>
          <Button size="lg" onClick={() => setStep(2)}>
            {t('auth.onboarding.next')}
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <form onSubmit={submitName} className="flex flex-col gap-5" noValidate>
          <AuthHero icon={UserRound} title={t('auth.onboarding.name_title')} />
          <AvatarPicker
            userId={profile.id}
            initialValue={avatar}
            label={t('auth.onboarding.avatar_label')}
            hint={t('auth.onboarding.avatar_hint')}
            onChange={setAvatar}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-name`}>{t('auth.onboarding.name_label')}</Label>
            <Input
              id={`${id}-name`}
              autoComplete="name"
              maxLength={80}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-describedby={`${id}-name-hint`}
              aria-invalid={error === 'required' ? true : undefined}
              autoFocus
            />
            <p id={`${id}-name-hint`} className="text-sm text-muted">
              {t('auth.onboarding.name_hint')}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id={`${id}-consent`}
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              aria-invalid={error === 'consent_required' ? true : undefined}
              className="mt-0.5"
            />
            <Label htmlFor={`${id}-consent`} className="block font-normal">
              {t('auth.onboarding.consent_before')}{' '}
              <Link href="/dieu-khoan" target="_blank" className="text-primary underline">
                {t('auth.onboarding.terms')}
              </Link>{' '}
              {t('auth.onboarding.consent_and')}{' '}
              <Link href="/chinh-sach-bao-mat" target="_blank" className="text-primary underline">
                {t('auth.onboarding.privacy')}
              </Link>
            </Label>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error === 'consent_required' ? t('auth.onboarding.consent_required') : errorText(error)}
            </p>
          ) : null}
          <Button type="submit" size="lg">
            {t('auth.onboarding.next')}
          </Button>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <AuthHero icon={Factory} title={t('auth.onboarding.site_title')} subtitle={t('auth.onboarding.site_hint')} />
            <SitePicker value={site} onChange={setSite} />
            <p className="flex items-center gap-2 text-sm text-muted">
              <RefreshCw aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
              {t('auth.onboarding.site_change_hint')}
            </p>
          </section>
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="flex items-center gap-2 text-lg font-bold text-fg">
                <span aria-hidden className="h-4 w-1.5 rounded-full bg-accent" />
                {t('auth.onboarding.interests_title')}
              </h2>
              <p className="text-sm text-muted">{t('auth.onboarding.interests_hint')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map((f) => (
                <ChoiceChip key={f} selected={interests.includes(f)} onClick={() => toggleInterest(f)}>
                  <span aria-hidden className={cn('size-2 rounded-full', FEATURE_DOT[f])} />
                  {t(`common.feature.${f}`)}
                </ChoiceChip>
              ))}
            </div>
          </section>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {errorText(error)}
            </p>
          ) : null}
          <Button type="button" size="lg" onClick={() => void save(true)} disabled={pending}>
            {t('auth.onboarding.finish')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Thanh trên (giống app OnboardingTopBar): quay lại (bước > 1) · viên "Bước x/y" · nút phụ phải (Bỏ qua ở bước cuối) →
 * thanh tiến độ chia đoạn (đã qua primary, hiện tại accent, còn lại border; trang trí — số bước đọc từ viên giữa).
 */
function StepBar({
  step,
  total,
  onBack,
  backDisabled,
  action,
}: {
  step: number;
  total: number;
  onBack?: () => void;
  backDisabled?: boolean;
  action?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-2">
      <div className="grid min-h-11 grid-cols-3 items-center">
        <div className="justify-self-start">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label={t('auth.onboarding.back')}
              onClick={onBack}
              disabled={backDisabled}
            >
              <ChevronLeft strokeWidth={1.75} />
            </Button>
          ) : null}
        </div>
        <p className="inline-flex items-center gap-2 justify-self-center rounded-full border border-border bg-surface px-3 py-1 text-sm font-bold whitespace-nowrap text-primary">
          <span aria-hidden className="size-2 rounded-full bg-accent" />
          {t('auth.onboarding.step', { current: step, total })}
        </p>
        <div className="justify-self-end">
          {action ? (
            <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </Button>
          ) : null}
        </div>
      </div>
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn('h-1 flex-1 rounded-full', i + 1 < step ? 'bg-primary' : i + 1 === step ? 'bg-accent' : 'bg-border')}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Danh mục địa điểm (admin quản lý) dạng thẻ chọn (giống app SiteChoice): ô icon nhà máy · tên khu · vòng chọn; bấm khu
 * đang chọn → bỏ chọn. Chỉ có mã + tên khu → không dòng phụ. Đủ 3 trạng thái: đang tải, lỗi, có dữ liệu.
 */
function SitePicker({ value, onChange }: { value: string | null; onChange: (code: string | null) => void }) {
  const [state, setState] = useState<{ sites: Site[] | null; error: string | null }>({ sites: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void listSites(createBrowserClient()).then((result) => {
      if (!active) return;
      setState(result.error ? { sites: null, error: result.error.code } : { sites: result.data, error: null });
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state.error) {
    return (
      <ErrorState
        code={state.error}
        onRetry={() => {
          setState({ sites: null, error: null });
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (!state.sites) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-18 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {state.sites.map((s) => {
        const selected = value === s.code;
        return (
          <button
            key={s.code}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : s.code)}
            className={cn(
              'flex min-h-16 w-full items-center gap-3 rounded-lg border-2 bg-surface p-4 text-left shadow-card transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              selected ? 'border-primary' : 'border-border hover:bg-surface-2',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-md',
                selected ? 'bg-primary text-on-primary' : 'bg-surface-2 text-primary',
              )}
            >
              <Factory className="size-5" strokeWidth={1.75} />
            </span>
            <span className={cn('flex-1 text-md font-semibold', selected ? 'text-primary' : 'text-fg')}>{s.name}</span>
            <span
              aria-hidden
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full',
                selected ? 'bg-primary text-on-primary' : 'border-2 border-border',
              )}
            >
              {selected ? <Check className="size-4" strokeWidth={2.5} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

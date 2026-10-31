'use client';

// Onboarding 3 bước (giống app): 1 ngôn ngữ · 2 tên + đồng ý điều khoản (bắt buộc, Nghị định 13/2023) ·
// 3 nơi làm việc + quan tâm (bỏ qua được). Lưu một lần ở bước cuối qua completeOnboarding (@hp/core).
import { completeOnboarding, listSites, type MyProfile, type Site } from '@hp/core';
import { CONSENT_VERSION, FEATURES, type Feature, LOCALES, type Locale } from '@hp/shared';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { useErrorText } from './use-error-text';

const TOTAL = 3;

export function OnboardingForm({ profile, onDone }: { profile: MyProfile; onDone: (locale: Locale) => void }) {
  const t = useTranslations();
  const errorText = useErrorText();
  const id = useId();
  const currentLocale = useLocale() as Locale;
  const [step, setStep] = useState(1);
  const [locale, setLocale] = useState<Locale>(currentLocale);
  const [fullName, setFullName] = useState(profile.full_name);
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
      <p className="text-sm font-medium text-muted">{t('auth.onboarding.step', { current: step, total: TOTAL })}</p>

      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-fg">{t('auth.onboarding.language_title')}</h1>
          <p className="text-md text-muted">{t('auth.onboarding.language_hint')}</p>
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((l) => (
              <ChoiceChip key={l} lang={l} selected={locale === l} onClick={() => setLocale(l)}>
                {t(`web.locale.${l}`)}
              </ChoiceChip>
            ))}
          </div>
          <Button size="lg" onClick={() => setStep(2)}>
            {t('auth.onboarding.next')}
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <form onSubmit={submitName} className="flex flex-col gap-4" noValidate>
          <h1 className="text-2xl font-semibold text-fg">{t('auth.onboarding.name_title')}</h1>
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
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)}>
              {t('auth.onboarding.back')}
            </Button>
            <Button type="submit" size="lg" className="flex-1">
              {t('auth.onboarding.next')}
            </Button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold text-fg">{t('auth.onboarding.site_title')}</h1>
            <p className="text-md text-muted">{t('auth.onboarding.site_hint')}</p>
            <SitePicker value={site} onChange={setSite} />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-fg">{t('auth.onboarding.interests_title')}</h2>
            <p className="text-md text-muted">{t('auth.onboarding.interests_hint')}</p>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map((f) => (
                <ChoiceChip key={f} selected={interests.includes(f)} onClick={() => toggleInterest(f)}>
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
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => setStep(2)} disabled={pending}>
              {t('auth.onboarding.back')}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => void save(false)} disabled={pending}>
              {t('auth.onboarding.skip')}
            </Button>
            <Button type="button" size="lg" className="flex-1" onClick={() => void save(true)} disabled={pending}>
              {t('auth.onboarding.finish')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Danh mục địa điểm (admin quản lý) — đủ 3 trạng thái: đang tải, lỗi, có dữ liệu. */
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
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-40 rounded-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {state.sites.map((s) => (
        <ChoiceChip key={s.code} selected={value === s.code} onClick={() => onChange(value === s.code ? null : s.code)}>
          {s.name}
        </ChoiceChip>
      ))}
    </div>
  );
}

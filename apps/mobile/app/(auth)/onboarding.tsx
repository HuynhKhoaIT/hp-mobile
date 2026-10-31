// Screen type: Form
// Onboarding 3 bước (giống web): 1 ngôn ngữ (đổi ngay) · 2 tên + đồng ý điều khoản (bắt buộc, Nghị định 13/2023) ·
// 3 nơi làm việc + quan tâm (bỏ qua được). Ảnh đại diện ở bước 2, không bắt buộc, upload ngay khi chọn. Lưu một lần ở bước cuối (useCompleteOnboarding của @hp/core).
import { needsOnboarding } from '@hp/core';
import { useCompleteOnboarding, useMyProfile, useSites } from '@hp/core/react';
import { CONSENT_VERSION, FEATURES, type Feature, LOCALES, type Locale } from '@hp/shared';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { finishAuthFlow } from '@/core/auth';
import { AvatarPicker } from '@/features/profile/components/AvatarPicker';
import { getLocale, setLocale } from '@/core/i18n';
import { useErrorText } from '@/lib/errors';
import { webPageUrl } from '@/lib/urls';
import { Button, Checkbox, Chip, Col, ErrorState, Header, Input, Row, Screen, Skeleton, Text, toast } from '@/ui';

const TOTAL = 3;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const me = useMyProfile();
  const sites = useSites();
  const complete = useCompleteOnboarding();
  const [step, setStep] = useState(1);
  const [locale, setLocaleState] = useState<Locale>(getLocale());
  const [fullName, setFullName] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [site, setSite] = useState<string | null | undefined>(undefined);
  const [interests, setInterests] = useState<Feature[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Giá trị đang sửa; chưa sửa thì lấy từ hồ sơ (vd tên từ Google).
  const name = fullName ?? me.data?.full_name ?? '';
  const chosenSite = site === undefined ? (me.data?.site ?? null) : site;
  const chosenInterests = interests ?? ((me.data?.interests ?? []) as Feature[]);

  const chooseLocale = (l: Locale) => {
    setLocaleState(l);
    void setLocale(l);
  };

  const toggleInterest = (f: Feature) =>
    setInterests(chosenInterests.includes(f) ? chosenInterests.filter((x) => x !== f) : [...chosenInterests, f]);

  const nextFromName = () => {
    if (name.trim().length === 0) return setError('required');
    if (!consent) return setError('consent_required');
    setError(null);
    setStep(3);
  };

  const save = (withChoices: boolean) => {
    setError(null);
    complete.mutate(
      {
        full_name: name,
        locale,
        site: withChoices ? chosenSite : null,
        interests: withChoices ? chosenInterests : [],
        consent_version: CONSENT_VERSION,
      },
      {
        onSuccess: (profile) => {
          if (needsOnboarding(profile)) return;
          toast.show(t('auth:signed_in'), 'success');
          finishAuthFlow();
        },
        onError: (e) => {
          if (e.fieldErrors?.full_name) setStep(2);
          setError(e.fieldErrors?.full_name?.[0] ?? e.code);
        },
      },
    );
  };

  if (me.isLoading) {
    return (
      <Screen>
        <Col gap={3} className="pt-16">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Col>
      </Screen>
    );
  }
  if (me.isError) {
    return (
      <Screen>
        <ErrorState code={me.error.code} onRetry={() => void me.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboard>
      <Header back={step > 1} onBack={() => setStep((s) => s - 1)} title={t('auth:onboarding.step', { current: step, total: TOTAL })} />

      {step === 1 ? (
        <Col gap={4} className="pt-4">
          <Text variant="heading" accessibilityRole="header">
            {t('auth:onboarding.language_title')}
          </Text>
          <Text tone="muted">{t('auth:onboarding.language_hint')}</Text>
          <Row gap={2} wrap>
            {LOCALES.map((l) => (
              <Chip key={l} label={t(`locale.${l}`)} selected={locale === l} onPress={() => chooseLocale(l)} />
            ))}
          </Row>
          <Button label={t('auth:onboarding.next')} fullWidth onPress={() => setStep(2)} />
        </Col>
      ) : null}

      {step === 2 ? (
        <Col gap={4} className="pt-4">
          <Text variant="heading" accessibilityRole="header">
            {t('auth:onboarding.name_title')}
          </Text>
          {me.data ? <AvatarPicker userId={me.data.id} value={me.data.avatar_url} name={name} /> : null}
          <Input
            label={t('auth:onboarding.name_label')}
            hint={t('auth:onboarding.name_hint')}
            autoComplete="name"
            textContentType="name"
            maxLength={80}
            value={name}
            onChangeText={setFullName}
            error={error === 'required' ? errorText('required') : null}
            autoFocus
          />
          <Checkbox
            checked={consent}
            onChange={setConsent}
            invalid={error === 'consent_required'}
            accessibilityLabel={`${t('auth:onboarding.consent_before')} ${t('auth:onboarding.terms')} ${t('auth:onboarding.consent_and')} ${t('auth:onboarding.privacy')}`}
          >
            <Text>
              {t('auth:onboarding.consent_before')}{' '}
              <Text tone="primary" className="underline" onPress={() => void WebBrowser.openBrowserAsync(webPageUrl('/dieu-khoan'))}>
                {t('auth:onboarding.terms')}
              </Text>{' '}
              {t('auth:onboarding.consent_and')}{' '}
              <Text tone="primary" className="underline" onPress={() => void WebBrowser.openBrowserAsync(webPageUrl('/chinh-sach-bao-mat'))}>
                {t('auth:onboarding.privacy')}
              </Text>
            </Text>
          </Checkbox>
          {error === 'consent_required' ? (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {t('auth:onboarding.consent_required')}
            </Text>
          ) : null}
          <Button label={t('auth:onboarding.next')} fullWidth onPress={nextFromName} />
        </Col>
      ) : null}

      {step === 3 ? (
        <Col gap={6} className="pt-4">
          <Col gap={3}>
            <Text variant="heading" accessibilityRole="header">
              {t('auth:onboarding.site_title')}
            </Text>
            <Text tone="muted">{t('auth:onboarding.site_hint')}</Text>
            {sites.isLoading ? (
              <Row gap={2} wrap>
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-11 w-40 rounded-full" />
                ))}
              </Row>
            ) : sites.isError ? (
              <ErrorState code={sites.error.code} onRetry={() => void sites.refetch()} />
            ) : (
              <Row gap={2} wrap>
                {(sites.data ?? []).map((s) => (
                  <Chip
                    key={s.code}
                    label={s.name}
                    selected={chosenSite === s.code}
                    onPress={() => setSite(chosenSite === s.code ? null : s.code)}
                  />
                ))}
              </Row>
            )}
          </Col>
          <Col gap={3}>
            <Text variant="title" accessibilityRole="header">
              {t('auth:onboarding.interests_title')}
            </Text>
            <Text tone="muted">{t('auth:onboarding.interests_hint')}</Text>
            <Row gap={2} wrap>
              {FEATURES.map((f) => (
                <Chip key={f} label={t(`feature.${f}`)} selected={chosenInterests.includes(f)} onPress={() => toggleInterest(f)} />
              ))}
            </Row>
          </Col>
          {error ? (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {errorText(error)}
            </Text>
          ) : null}
          <Col gap={2}>
            <Button label={t('auth:onboarding.finish')} fullWidth loading={complete.isPending} onPress={() => save(true)} />
            <Button label={t('auth:onboarding.skip')} variant="ghost" fullWidth disabled={complete.isPending} onPress={() => save(false)} />
          </Col>
        </Col>
      ) : null}
    </Screen>
  );
}

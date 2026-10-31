// Screen type: Hub
// Thư viện giao diện: mọi component + variant của @/ui. Chỉ mở khi __DEV__. Thêm component mới → thêm mục ở đây.
// Có sẵn bộ chuyển sáng / tối và ngôn ngữ để rà màn ở cả 3 ngôn ngữ, 2 giao diện.
import { LOCALES, type Locale } from '@hp/shared';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { setLocale } from '@/core/i18n';
import { type ThemePref, useSettings } from '@/core/settings';
import { Chip, Screen, Text, type TextTone, type TextVariant } from '@/ui';

const VARIANTS: TextVariant[] = ['display', 'heading', 'title', 'price', 'label', 'body', 'caption'];
const TONES: TextTone[] = ['default', 'muted', 'disabled', 'primary', 'accent', 'success', 'warning', 'danger'];
const SWATCHES = ['bg-primary', 'bg-primary-light', 'bg-accent', 'bg-success', 'bg-warning', 'bg-danger', 'bg-surface', 'bg-surface-2', 'bg-border'];
const SERVICES = ['pass', 'room', 'job', 'ride', 'sport', 'lost-found'] as const;
// Class đầy đủ để Tailwind quét được (không ghép chuỗi động).
const SERVICE_CLASS: Record<(typeof SERVICES)[number], { soft: string; fg: string }> = {
  pass: { soft: 'bg-service-pass-soft', fg: 'bg-service-pass' },
  room: { soft: 'bg-service-room-soft', fg: 'bg-service-room' },
  job: { soft: 'bg-service-job-soft', fg: 'bg-service-job' },
  ride: { soft: 'bg-service-ride-soft', fg: 'bg-service-ride' },
  sport: { soft: 'bg-service-sport-soft', fg: 'bg-service-sport' },
  'lost-found': { soft: 'bg-service-lost-found-soft', fg: 'bg-service-lost-found' },
};
const THEMES: ThemePref[] = ['system', 'light', 'dark'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6 gap-3">
      <Text variant="title">{title}</Text>
      {children}
    </View>
  );
}

export default function UiGalleryScreen() {
  const { t, i18n } = useTranslation();
  const themePref = useSettings((s) => s.themePref);
  const setThemePref = useSettings((s) => s.setThemePref);

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <Screen scroll>
      <Text variant="heading" className="mt-4">
        {t('dev.ui_gallery')}
      </Text>

      <Section title={t('dev.theme')}>
        <View className="flex-row flex-wrap gap-2">
          {THEMES.map((p) => (
            <Chip key={p} label={t(`dev.theme_${p}`)} selected={themePref === p} onPress={() => setThemePref(p)} />
          ))}
        </View>
      </Section>

      <Section title={t('dev.language')}>
        <View className="flex-row flex-wrap gap-2">
          {LOCALES.map((l: Locale) => (
            <Chip key={l} label={l.toUpperCase()} selected={i18n.language === l} onPress={() => void setLocale(l)} />
          ))}
        </View>
      </Section>

      <Section title="Chip">
        <View className="flex-row flex-wrap gap-2">
          <Chip label={t('feature.pass')} />
          <Chip label={t('feature.room')} selected />
          <Chip label={t('feature.job')} disabled />
        </View>
      </Section>

      <Section title={t('dev.typography')}>
        {VARIANTS.map((v) => (
          <View key={v} className="gap-1">
            <Text variant="caption" tone="muted">
              {v}
            </Text>
            <Text variant={v}>{t('dev.sample')}</Text>
          </View>
        ))}
        <View className="flex-row flex-wrap gap-3">
          {TONES.map((tone) => (
            <Text key={tone} variant="label" tone={tone}>
              {tone}
            </Text>
          ))}
        </View>
      </Section>

      <Section title={t('dev.colors')}>
        <View className="flex-row flex-wrap gap-3">
          {SWATCHES.map((c) => (
            <View key={c} className="items-center gap-1">
              <View className={`h-12 w-12 rounded-md border border-border ${c}`} />
              <Text variant="caption" tone="muted">
                {c.replace('bg-', '')}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title={t('dev.service_colors')}>
        <View className="flex-row flex-wrap gap-3">
          {SERVICES.map((s) => (
            <View key={s} className={`w-24 items-center gap-2 rounded-md p-3 ${SERVICE_CLASS[s].soft}`}>
              <View className={`h-6 w-6 rounded-full ${SERVICE_CLASS[s].fg}`} />
              <Text variant="caption">{t(`feature.${s === 'lost-found' ? 'lostFound' : s}`)}</Text>
            </View>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

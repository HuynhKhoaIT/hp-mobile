// Screen type: Hub
// Thư viện giao diện: mọi component + variant của @/ui. Chỉ mở khi __DEV__. Thêm component mới → thêm mục ở đây.
// Có sẵn bộ chuyển sáng / tối và ngôn ngữ để rà màn ở cả 3 ngôn ngữ, 2 giao diện.
import type { PublicListing } from '@hp/core';
import { LOCALES, type ListingCategory, type Locale } from '@hp/shared';
import { Redirect } from 'expo-router';
import { Bell, MessageCircle, Plus, Search, Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { setLocale } from '@/core/i18n';
import { type ThemePref, useSettings } from '@/core/settings';
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  type ButtonVariant,
  Card,
  Checkbox,
  Chip,
  Col,
  Divider,
  EmptyState,
  ErrorState,
  Fab,
  FilterBar,
  Header,
  IconButton,
  ImageGallery,
  Input,
  ListingCard,
  ListingCover,
  Notice,
  MultiSelect,
  PriceInput,
  Row,
  Screen,
  SearchBar,
  SectionHeader,
  Select,
  ServiceTile,
  SkeletonListingCard,
  SkeletonListingDetail,
  StaggerItem,
  StickyCta,
  Text,
  type TextTone,
  type TextVariant,
  toast,
} from '@/ui';

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
const BUTTONS: ButtonVariant[] = ['primary', 'accent', 'secondary', 'outline', 'ghost', 'danger'];
const FEATURE_KEYS = ['pass', 'room', 'job', 'lostFound', 'ride', 'sport'] as const;
type FeatureKey = (typeof FEATURE_KEYS)[number];

// Tin mẫu cho ListingCard (dữ liệu giả, chỉ ở gallery). Thời gian tính một lần khi nạp module.
const HOUR_AGO = new Date(Date.now() - 3_600_000).toISOString();
function sampleListing(over: Partial<PublicListing>): PublicListing {
  return {
    id: 'sample', slug: 'sample-abc123', short_id: 'abc123', category: 'pass_vehicle', status: 'active', title: '',
    description: null, price: 8_500_000, price_type: 'fixed', attributes: {}, site: 'dung_quat', site_name: 'Dung Quất',
    lat: null, lng: null, distance_to_site_m: 1200, address_text: null, images: [], lang: 'vi', view_count: 12,
    expires_at: null, created_at: HOUR_AGO, updated_at: HOUR_AGO, owner_id: 'owner', owner_name: 'An', owner_avatar_url: null,
    owner_badges: ['phone'], owner_rating_avg: 4.6, owner_rating_count: 5, owner_since: '2026-01-01T00:00:00Z',
    ...over,
  };
}
const SAMPLE_CATEGORIES: ListingCategory[] = ['pass_vehicle', 'room_rent', 'job_parttime', 'lost'];

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
  const [text, setText] = useState('');
  const [price, setPrice] = useState<number | null>(1500000);
  const [checked, setChecked] = useState(false);
  const [single, setSingle] = useState<FeatureKey | null>(null);
  const [multi, setMulti] = useState<FeatureKey[]>(['pass']);
  const [sheet, setSheet] = useState(false);
  const featureOptions = FEATURE_KEYS.map((f) => ({ value: f, label: t(`feature.${f}`) }));
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<FeatureKey>('pass');
  const [area, setArea] = useState<string>('');
  const samples = [
    sampleListing({ id: 's1', title: t('dev.sample') }),
    sampleListing({ id: 's2', category: 'room_rent', title: t('dev.sample'), price: 1_800_000, lang: 'en' }),
    sampleListing({ id: 's3', category: 'job_parttime', title: t('dev.sample'), price: null, attributes: { salary_min: 25_000, salary_max: 35_000, pay_type: 'hour' } }),
    sampleListing({ id: 's4', category: 'lost', title: t('dev.sample'), price: null, price_type: 'free', distance_to_site_m: null }),
  ];

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

      <Section title="Header">
        <Header title={t('dev.ui_gallery')} back right={<IconButton icon={Share2} accessibilityLabel={t('actions.share')} />} />
      </Section>

      <Section title="Button">
        <Col gap={2}>
          {BUTTONS.map((v) => (
            <Button key={v} variant={v} label={v === 'accent' ? t('actions.post') : t('actions.save')} />
          ))}
          <Row gap={2} wrap>
            <Button size="sm" label={t('actions.share')} icon={Share2} variant="outline" />
            <Button label={t('actions.save')} loading />
            <Button label={t('actions.save')} disabled />
          </Row>
          <Button label={t('actions.join')} fullWidth haptic onPress={() => toast.show(t('actions.join'), 'success')} />
        </Col>
      </Section>

      <Section title="IconButton">
        <Row gap={2}>
          <IconButton icon={Search} accessibilityLabel={t('nav.search_placeholder')} />
          <IconButton icon={Bell} variant="filled" accessibilityLabel={t('nav.notifications')} />
          <IconButton icon={Share2} tone="primary" accessibilityLabel={t('actions.share')} disabled />
        </Row>
      </Section>

      <Section title="Input · PriceInput">
        <Input label={t('auth:phone.label')} placeholder={t('auth:phone.placeholder')} icon={Search} value={text} onChangeText={setText} hint={t('auth:onboarding.name_hint')} />
        <Input label={t('auth:otp.label')} value="12" error={t('errors:otp_invalid')} />
        <Input label={t('auth:phone.label')} value="0912 345 678" editable={false} />
        <PriceInput label={t('dev.sample')} value={price} onChange={setPrice} />
      </Section>

      <Section title="Select · MultiSelect · Checkbox">
        <Select label={t('auth:onboarding.interests_title')} value={single} options={featureOptions} onChange={setSingle} />
        <MultiSelect label={t('auth:onboarding.interests_title')} values={multi} options={featureOptions} onChange={setMulti} />
        <Checkbox checked={checked} onChange={setChecked} accessibilityLabel={t('auth:onboarding.terms')}>
          <Text>{t('auth:onboarding.consent_before')} {t('auth:onboarding.terms')}</Text>
        </Checkbox>
      </Section>

      <Section title="Badge · Avatar">
        <Row gap={2} wrap>
          <Badge label={t('status.active')} tone="success" />
          <Badge label={t('status.pending_review')} tone="warning" />
          <Badge label={t('status.rejected')} tone="danger" />
          <Badge label={t('status.draft')} />
          <Badge label={t('price.free')} tone="primary" />
        </Row>
        <Row gap={3}>
          <Avatar name="Nguyễn Văn An" size="sm" />
          <Avatar name="Trần Thị Bình" />
          <Avatar name="Lê Văn Cường" size="lg" />
        </Row>
      </Section>

      <Section title="Card · Divider">
        <Card onPress={() => toast.show(t('dev.sample'))} accessibilityLabel={t('dev.sample')}>
          <Text variant="label">{t('dev.sample')}</Text>
          <Divider className="my-2" />
          <Text tone="muted">{t('feature.pass')}</Text>
        </Card>
      </Section>

      <Section title="Skeleton · Empty · Error">
        <SkeletonListingCard />
        <EmptyState title={t('states.empty_title')} action={{ label: t('actions.post'), onPress: () => toast.show(t('actions.post')) }} />
        <ErrorState code="network" onRetry={() => toast.show(t('actions.retry'), 'danger')} />
      </Section>

      <Section title="BottomSheet · Toast">
        <Row gap={2} wrap>
          <Button label="BottomSheet" variant="outline" onPress={() => setSheet(true)} />
          <Button label="Toast" variant="outline" onPress={() => toast.show(t('auth:signed_in'), 'success')} />
        </Row>
        <BottomSheet open={sheet} onClose={() => setSheet(false)} title={t('auth:dialog.title')}>
          <Text tone="muted">{t('auth:dialog.description')}</Text>
          <Button label={t('actions.close')} fullWidth onPress={() => setSheet(false)} />
        </BottomSheet>
      </Section>

      <Section title="ServiceTile · SectionHeader">
        <View className="flex-row flex-wrap">
          {FEATURE_KEYS.map((f) => (
            <View key={f} className="w-1/3 p-1.5">
              <ServiceTile service={f} label={t(`feature.${f}`)} onPress={() => toast.show(t(`feature.${f}`))} />
            </View>
          ))}
        </View>
        <SectionHeader title={t('listing:hub.latest_title')} action={{ label: t('listing:hub.see_all'), onPress: () => toast.show(t('listing:hub.see_all')) }} />
        <SectionHeader title={t('listing:detail.similar')} />
      </Section>

      <Section title="SearchBar · FilterBar · Select chip">
        <SearchBar value={search} onChangeText={setSearch} onSubmit={(q) => toast.show(q)} placeholder={t('listing:list.search_placeholder', { feature: t('feature.pass') })} />
        <FilterBar
          options={featureOptions}
          value={chip}
          onChange={setChip}
          leading={
            <Select
              trigger="chip"
              label={t('listing:list.site_filter')}
              value={area}
              neutralValue=""
              options={[{ value: '', label: t('listing:list.site_any') }, { value: 'dung_quat', label: 'Dung Quất' }]}
              onChange={setArea}
            />
          }
        />
      </Section>

      <Section title="ListingCard · ListingCover">
        <View className="flex-row gap-3">
          {samples.slice(0, 2).map((l) => (
            <View key={l.id} className="flex-1">
              <ListingCard listing={l} layout="grid" onPress={() => toast.show(l.title)} />
            </View>
          ))}
        </View>
        {samples.slice(2).map((l) => (
          <ListingCard key={l.id} listing={l} layout="row" onPress={() => toast.show(l.title)} />
        ))}
        <View className="flex-row flex-wrap gap-2">
          {SAMPLE_CATEGORIES.map((c) => (
            <ListingCover key={c} listing={{ category: c, images: [] }} className="aspect-card w-20 rounded-sm" />
          ))}
        </View>
        <ListingCover listing={{ category: 'pass_home', images: [] }} size="full" className="aspect-card w-full rounded-md" />
      </Section>

      <Section title="SkeletonListingCard · SkeletonListingDetail">
        <SkeletonListingCard count={2} layout="grid" columns={2} />
        <SkeletonListingCard layout="row" />
        <SkeletonListingCard count={3} horizontal />
        <SkeletonListingDetail />
      </Section>

      <Section title="ImageGallery">
        <ImageGallery uris={[]} accessibilityLabel={t('dev.sample')} />
      </Section>

      <Section title="Notice · StickyCta · Fab · StaggerItem">
        <Notice tone="warning" text={t('listing:detail.safety_tip')} />
        <Notice text={t('listing:detail.approx_location')} />
        <StickyCta>
          <Button label={t('listing:detail.contact')} icon={MessageCircle} fullWidth onPress={() => toast.show(t('listing:detail.contact_soon'))} />
        </StickyCta>
        <View className="h-28 rounded-md border border-border">
          <Fab label={t('listing:list.post_cta')} icon={Plus} onPress={() => toast.show(t('coming_soon.body'))} />
        </View>
        {[0, 1, 2].map((i) => (
          <StaggerItem key={i} index={i}>
            <Card>
              <Text>{t(`feature.${FEATURE_KEYS[i]}`)}</Text>
            </Card>
          </StaggerItem>
        ))}
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

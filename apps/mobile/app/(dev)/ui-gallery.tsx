// Screen type: Hub
// Thư viện giao diện: mọi component + variant của @/ui. Chỉ mở khi __DEV__. Thêm component mới → thêm mục ở đây.
// Có sẵn bộ chuyển sáng / tối và ngôn ngữ để rà màn ở cả 3 ngôn ngữ, 2 giao diện.
import type { PublicGroup, PublicListing } from '@hp/core';
import { LOCALES, type ListingCategory, type Locale } from '@hp/shared';
import { Redirect } from 'expo-router';
import {
  Bell,
  ClipboardList,
  Heart,
  LayoutGrid,
  ListChecks,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  SquarePlus,
  Star,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { setLocale } from '@/core/i18n';
import { type ThemePref, useSettings } from '@/core/settings';
import {
  AlertRow,
  Avatar,
  AvatarStack,
  type AvatarStackPerson,
  Badge,
  BannerCarousel,
  type BannerSlide,
  BookmarkButton,
  BottomSheet,
  Button,
  Composer,
  CoachMark,
  ConfirmSheet,
  DateTimePicker,
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
  GroupCard,
  Header,
  HomeHeader,
  HomeHeaderCurve,
  HomeHeaderSearch,
  IconButton,
  ImageGallery,
  ImagePicker,
  type ImagePickerItem,
  Input,
  ListingCard,
  ListingCover,
  MenuItem,
  MessageBubble,
  Notice,
  NotificationBell,
  ReportSheet,
  RouteSummary,
  ToggleRow,
  MultiSelect,
  OptionSheet,
  PriceInput,
  PromoCard,
  Row,
  Screen,
  SearchBar,
  SectionHeader,
  Select,
  ServiceGrid,
  ServiceTile,
  SiteChip,
  SkeletonGroupCard,
  SkeletonGroupDetail,
  SkeletonListingCard,
  SkeletonListingDetail,
  StaggerItem,
  StarRating,
  StatColumns,
  StatTile,
  Stepper,
  StickyCta,
  SuccessScreen,
  Text,
  type TextTone,
  type TextVariant,
  Ticker,
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
    is_expired: false, inactive_since: null,
    ...over,
  };
}
const SAMPLE_CATEGORIES: ListingCategory[] = ['pass_vehicle', 'room_rent', 'job_parttime', 'lost'];

// Nhóm mẫu cho GroupCard (dữ liệu giả, chỉ ở gallery): giờ hẹn 1 ngày tới, tính một lần khi nạp module.
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString();
const SAMPLE_PEOPLE: AvatarStackPerson[] = ['An N.', 'Bình T.', 'Chi L.', 'Dũng P.', 'Hà V.', 'Khoa N.', 'Lan Đ.'].map((name, i) => ({
  id: `p${i}`,
  name,
}));
function sampleGroup(over: Partial<PublicGroup>): PublicGroup {
  return {
    id: 'g', slug: 'sample-g1', short_id: 'g1', kind: 'ride', sub_kind: 'car_owner', status: 'open', title: 'Dung Quất → Đà Nẵng',
    description: null, site: 'dung_quat', site_name: 'Dung Quất', starts_at: TOMORROW, ends_at: null, seats_total: 4, seats_taken: 2,
    seats_left: 2, fee_per_person: 150_000, origin_text: 'Cổng Dung Quất', origin_lat: null, origin_lng: null,
    destination_text: 'Đà Nẵng', destination_lat: 16.059, destination_lng: 108.172, attributes: {}, requires_approval: true, lang: 'vi',
    created_at: HOUR_AGO, updated_at: HOUR_AGO, host_id: 'host', host_name: 'An N.', host_avatar_url: null, host_badges: [],
    host_rating_avg: 0, host_rating_count: 0, host_since: '2026-01-01T00:00:00Z',
    members: SAMPLE_PEOPLE.slice(0, 2).map((p) => ({ id: p.id, name: p.name, avatar_url: null })), is_past: false,
    venue_id: null, venue_name: null, venue_address: null,
    ...over,
  };
}
const SAMPLE_GROUPS: PublicGroup[] = [
  sampleGroup({ id: 'g1' }),
  sampleGroup({
    id: 'g2', kind: 'sport', sub_kind: 'football', title: 'Đá bóng 7 người sau ca chiều', origin_text: 'Sân Vạn Tường',
    destination_text: null, fee_per_person: 0, seats_total: 10, seats_taken: 7, seats_left: 3, requires_approval: false,
    members: SAMPLE_PEOPLE.map((p) => ({ id: p.id, name: p.name, avatar_url: null })),
  }),
  sampleGroup({ id: 'g3', sub_kind: 'motorbike', status: 'full', seats_total: 1, seats_taken: 1, seats_left: 0 }),
  sampleGroup({ id: 'g4', sub_kind: 'bus_pool', status: 'cancelled', members: [], seats_taken: 0, seats_left: 4 }),
  // Kèo đội có sẵn (attributes.players_have): đội 7 có 5, cần thêm 2, 1 người đã vào → "Đã có 6/7 người · cần thêm 1".
  sampleGroup({
    id: 'g7', kind: 'sport', sub_kind: 'football', title: 'Đá bóng 7 người, đội có sẵn 5', origin_text: 'Sân Vạn Tường',
    destination_text: null, fee_per_person: 50_000, seats_total: 2, seats_taken: 1, seats_left: 1, requires_approval: false,
    attributes: { players_have: 5 }, members: SAMPLE_PEOPLE.slice(0, 1).map((p) => ({ id: p.id, name: p.name, avatar_url: null })),
  }),
  // Đội hình đã đủ (need = 0) → giữ trạng thái "Đã đủ người".
  sampleGroup({
    id: 'g8', kind: 'sport', sub_kind: 'pickleball', status: 'full', title: 'Pickleball đôi tối nay', origin_text: 'Sân Vạn Tường',
    destination_text: null, fee_per_person: 0, seats_total: 1, seats_taken: 1, seats_left: 0, attributes: { players_have: 3 },
  }),
];
// Ảnh mẫu cho ImagePicker: ô màu (không có file thật) với đủ trạng thái đã tải / đang tải / lỗi.
const SAMPLE_PHOTOS: ImagePickerItem[] = [
  { key: 'a', uri: '', status: 'done' },
  { key: 'b', uri: '', status: 'uploading' },
  { key: 'c', uri: '', status: 'error' },
];

// Khu mẫu cho SiteChip / OptionSheet (dữ liệu giả, chỉ ở gallery).
const SAMPLE_SITES = [
  { value: 'dung_quat', label: 'Khu liên hợp Hòa Phát Dung Quất' },
  { value: 'cang', label: 'Cảng Dung Quất' },
];

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
  const [saved, setSaved] = useState(false);
  const [tile, setTile] = useState<FeatureKey>('pass');
  const [photos, setPhotos] = useState<ImagePickerItem[]>(SAMPLE_PHOTOS);
  const [unread, setUnread] = useState(3);
  const [siteSheet, setSiteSheet] = useState(false);
  const [draft, setDraft] = useState('');
  const [reportSheet, setReportSheet] = useState(false);
  const [confirmSheet, setConfirmSheet] = useState(false);
  const [coach, setCoach] = useState(false);
  const [toggle, setToggle] = useState(true);
  const [site, setSite] = useState('dung_quat');
  const [people, setPeople] = useState<AvatarStackPerson[]>(SAMPLE_PEOPLE.slice(0, 2));
  const [seats, setSeats] = useState(3);
  const [when, setWhen] = useState<Date | null>(null);
  const [stars, setStars] = useState(0);
  // Mốc giờ mẫu cho DateTimePicker: tính một lần (luật nhóm: 15 phút → 60 ngày).
  const [bounds] = useState(() => ({ min: new Date(Date.now() + 15 * 60_000), max: new Date(Date.now() + 60 * 86_400_000) }));
  const siteLabel = SAMPLE_SITES.find((x) => x.value === site)?.label ?? null;
  // Banner mẫu: tone accent / dịch vụ / primary, có và không CTA.
  const slides: BannerSlide[] = [
    { id: 'b1', title: t('home.card.first_post_title'), subtitle: t('home.card.first_post_body'), ctaLabel: t('actions.post'), tone: 'accent' },
    { id: 'b2', title: t('feature.room'), subtitle: t('home.site_sheet_hint'), ctaLabel: t('home.see_all'), tone: 'room' },
    { id: 'b3', title: t('home.safety_title'), subtitle: t('listing:detail.safety_tip'), tone: 'primary', linked: false },
  ];
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
        {/* overlay: nhãn nổi trên ảnh (góc trái trên ảnh ListingCard grid). */}
        <Row gap={2} wrap className="rounded-md bg-primary p-3">
          <Badge overlay label={t('category.pass_electronics')} />
          <Badge overlay label={t('locale.en')} tone="primary" />
          <Badge overlay label={t('status.active')} tone="success" />
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

      <Section title="HomeHeader · HomeHeaderSearch · HomeHeaderCurve · SiteChip · NotificationBell">
        <View className="-mx-4 overflow-hidden">
          <HomeHeader
            user={{ name: 'Nguyễn Văn An', onPress: () => toast.show(t('nav.me')), accessibilityLabel: t('nav.me') }}
            title={t('home.greeting', { name: 'An' })}
            subtitle={t('home.subtitle')}
            bell={{ count: unread, onPress: () => setUnread((n) => n + 1), accessibilityLabel: t('home.notifications_unread', { count: unread }) }}
            site={{ label: siteLabel, onPress: () => setSiteSheet(true), accessibilityLabel: t('home.site_label') }}
          />
          <HomeHeaderSearch placeholder={t('nav.search_placeholder')} onPress={() => toast.show(t('nav.search'))} />
          <HomeHeaderCurve />
        </View>
        <View className="-mx-4 overflow-hidden">
          <HomeHeader
            user={null}
            title={t('home.greeting_guest')}
            subtitle={t('home.subtitle')}
            signIn={{ label: t('auth:sign_in'), onPress: () => toast.show(t('auth:sign_in')) }}
            site={{ label: null, onPress: () => undefined, accessibilityLabel: t('home.site_label') }}
          />
          <HomeHeader user={null} loading title="" site={{ label: siteLabel, onPress: () => undefined, accessibilityLabel: t('home.site_label') }} />
        </View>
        <Row gap={4} className="rounded-md bg-primary p-3">
          <NotificationBell count={0} onPress={() => undefined} accessibilityLabel={t('home.notifications')} />
          <NotificationBell count={12} onPress={() => undefined} accessibilityLabel={t('home.notifications_unread', { count: 12 })} />
          <SiteChip label={siteLabel} onPress={() => setSiteSheet(true)} accessibilityLabel={t('home.site_label')} />
        </Row>
        <Row gap={3} className="rounded-md bg-primary p-3">
          <Button size="sm" variant="inverse" shape="pill" label={t('auth:sign_in')} />
          <Button size="sm" variant="glass" shape="pill" label={t('auth:sign_in')} />
        </Row>
        <OptionSheet
          open={siteSheet}
          onClose={() => setSiteSheet(false)}
          title={t('home.site_sheet_title')}
          hint={t('home.site_sheet_hint')}
          value={site}
          options={SAMPLE_SITES}
          onChange={setSite}
        />
      </Section>

      <Section title="ServiceTile grid · ServiceGrid">
        <View className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <ServiceGrid>
            {FEATURE_KEYS.map((f, i) => (
              <View key={f} className="flex-1">
                <ServiceTile
                  variant="grid"
                  service={f}
                  label={t(`feature.${f}`)}
                  soon={i >= 4}
                  badge={i >= 4 ? { label: t('home.badge.soon'), tone: 'soon' } : i === 0 ? { label: t('home.badge.new'), tone: 'new' } : undefined}
                  onPress={() => toast.show(t(`feature.${f}`))}
                />
              </View>
            ))}
            <View className="flex-1">
              <ServiceTile variant="grid" icon={ClipboardList} label={t('home.tiles.my_listings')} onPress={() => toast.show(t('home.tiles.my_listings'))} />
            </View>
            <View className="flex-1">
              <ServiceTile variant="grid" icon={LayoutGrid} label={t('home.tiles.all')} onPress={() => toast.show(t('home.tiles.all'))} />
            </View>
          </ServiceGrid>
        </View>
      </Section>

      <Section title="BannerCarousel">
        <View className="-mx-4">
          <BannerCarousel slides={slides} onPress={(slide) => toast.show(slide.title)} />
        </View>
        <View className="-mx-4">
          <BannerCarousel slides={slides.slice(1, 2)} />
        </View>
      </Section>

      <Section title="PromoCard · StatColumns · AlertRow · StatTile">
        <PromoCard
          icon={LogIn}
          title={t('home.card.guest_title')}
          body={t('home.card.guest_body')}
          action={{ label: t('auth:sign_in'), onPress: () => toast.show(t('auth:sign_in')) }}
        />
        <View className="gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
          <Text variant="label" weight="semibold">
            {t('home.card.mine_title')}
          </Text>
          <StatColumns
            items={[
              { value: '3', label: t('home.card.active') },
              { value: '1', label: t('home.card.pending'), tone: 'warning' },
              { value: '1.204', label: t('home.card.views') },
            ]}
          />
          <AlertRow tone="warning" label={t('home.card.expiring', { count: 2 })} onPress={() => toast.show(t('home.card.manage'))} />
          <AlertRow tone="danger" label={t('home.card.rejected', { count: 1 })} onPress={() => toast.show(t('home.card.manage'))} />
        </View>
        {/* size md + tone primary: thẻ Cộng đồng ở Hub. */}
        <View className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <StatColumns
            size="md"
            items={[
              { value: '1.234', label: t('home.stats.users'), tone: 'primary' },
              { value: '460', label: t('home.stats.listings'), tone: 'primary' },
              { value: '4', label: t('home.stats.sites'), tone: 'primary' },
            ]}
          />
        </View>
        {/* icon sau số: điểm đánh giá ở tab Tôi. */}
        <View className="rounded-lg border border-border bg-surface py-3.5 shadow-card">
          <StatColumns
            size="md"
            items={[
              { value: '4', label: t('profile.listings'), tone: 'primary' },
              { value: '1.204', label: t('home.card.views'), tone: 'primary' },
              { value: '4,9', label: t('profile.ratings', { count: 28 }), tone: 'primary', icon: { glyph: Star, tone: 'accent' } },
            ]}
          />
        </View>
        <Row gap={3}>
          <StatTile className="flex-1" value="1.234" label={t('home.stats.users')} />
          <StatTile className="flex-1" value="460" label={t('home.stats.listings')} />
          <StatTile className="flex-1" value="4" label={t('home.stats.sites')} />
        </Row>
      </Section>

      <Section title="SectionHeader icon · Chip sm dot · compact states · Notice bordered">
        <SectionHeader
          title={t('home.near_title', { site: 'Dung Quất' })}
          icon={{ icon: MapPin, tone: 'primary' }}
          chevron
          action={{ label: t('home.see_all'), onPress: () => toast.show(t('home.see_all')) }}
        />
        <SectionHeader
          title={t('home.for_you_title')}
          subtitle={t('home.for_you_hint')}
          icon={{ icon: Sparkles, tone: 'accent' }}
          chevron
          action={{ label: t('home.see_all'), onPress: () => toast.show(t('home.see_all')) }}
        />
        <SectionHeader title={t('feature.job')} icon={{ service: 'job' }} chevron action={{ label: t('home.see_all'), onPress: () => undefined }} />
        <SectionHeader
          size="md"
          title={t('home.near_title', { site: 'Dung Quất' })}
          icon={{ icon: MapPin, tone: 'primary' }}
          chevron
          action={{ label: t('home.see_all'), onPress: () => undefined }}
        />
        <SectionHeader size="md" title={t('home.shortcuts_title')} />
        <Row gap={2} wrap>
          <Chip size="sm" dot="accent" label={t('home.shortcut.motorbike')} />
          <Chip size="sm" dot="accent" label={t('home.shortcut.room_loft')} />
        </Row>
        <Row gap={2} wrap>
          <Chip size="sm" dot="pass" label={t('home.shortcut.motorbike')} />
          <Chip size="sm" dot="room" label={t('home.shortcut.room_loft')} />
          <Chip size="sm" dot="job" label={t('home.shortcut.night_shift')} />
          <Chip size="sm" dot="lostFound" label={t('home.shortcut.found')} disabled />
        </Row>
        <ErrorState compact title={t('home.section_error')} code="network" onRetry={() => toast.show(t('actions.retry'))} />
        <EmptyState
          compact
          title={t('home.empty_title')}
          description={t('home.empty_body')}
          action={{ label: t('actions.post'), icon: Plus, onPress: () => undefined }}
        />
        <Notice variant="bordered" tone="warning" icon={ShieldCheck} title={t('home.safety_title')} text={t('listing:detail.safety_tip')} />
        <Text variant="micro" tone="muted" className="text-center">
          {t('disclaimer')}
        </Text>
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
        {/* appearance solid + count + bleed: hàng trạng thái "Tin của tôi" (tab Tôi, style Stitch). */}
        <FilterBar
          appearance="solid"
          bleed
          options={featureOptions.map((o, i) => ({ ...o, count: i < 3 ? i * 2 + 1 : undefined }))}
          value={chip}
          onChange={setChip}
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

      <Section title="GroupCard · SkeletonGroupCard · SkeletonGroupDetail">
        {SAMPLE_GROUPS.map((g) => (
          <GroupCard key={g.id} group={g} onPress={() => toast.show(g.title)} />
        ))}
        <GroupCard group={sampleGroup({ id: 'g5', status: 'in_progress' })} roleLabel={t('group:mine.role_host')} />
        <GroupCard
          group={sampleGroup({ id: 'g6', status: 'completed', kind: 'sport', sub_kind: 'badminton', destination_text: null })}
          roleLabel={t('group:mine.role_accepted')}
        />
        <SkeletonGroupCard />
        <SkeletonGroupDetail />
      </Section>

      <Section title="AvatarStack · Ticker">
        <Row gap={3}>
          <AvatarStack people={people} max={5} accessibilityLabel={t('group:card.members_count', { count: people.length })} />
          <Ticker text={t('group:card.seats_left', { count: Math.max(0, SAMPLE_PEOPLE.length - people.length) })} variant="label" tone="success" />
        </Row>
        <AvatarStack size="sm" people={SAMPLE_PEOPLE} total={12} max={4} moreLabel={(count) => t('group:card.members_more', { count })} />
        <Row gap={2} wrap>
          <Button
            size="sm"
            label={t('group:action.join')}
            disabled={people.length >= SAMPLE_PEOPLE.length}
            onPress={() => setPeople(SAMPLE_PEOPLE.slice(0, people.length + 1))}
          />
          <Button size="sm" variant="outline" label={t('group:action.leave')} onPress={() => setPeople(people.slice(0, -1))} />
        </Row>
      </Section>

      <Section title="RouteSummary · Stepper · DateTimePicker">
        <Card>
          <RouteSummary from="Cổng Dung Quất" to="Đà Nẵng — Sân bay" fromLabel={t('group:detail.from')} toLabel={t('group:detail.to')} />
        </Card>
        <RouteSummary from="Sân Vạn Tường" fromLabel={t('group:detail.venue')} />
        <RouteSummary variant="compact" from="Cổng Dung Quất" to="Đà Nẵng" fromLabel={t('group:detail.from')} toLabel={t('group:detail.to')} />
        <Stepper
          label={t('group:form.seats_label_ride')}
          hint={t('group:form.seats_hint')}
          value={seats}
          onChange={setSeats}
          max={6}
          decreaseLabel={t('group:form.seats_decrease')}
          increaseLabel={t('group:form.seats_increase')}
        />
        <Stepper
          label={t('group:form.seats_label_ride')}
          value={2}
          onChange={() => undefined}
          max={2}
          error={t('errors:invalid_input')}
          decreaseLabel={t('group:form.seats_decrease')}
          increaseLabel={t('group:form.seats_increase')}
        />
        <DateTimePicker
          label={t('group:form.starts_at_label_ride')}
          value={when}
          onChange={setWhen}
          minimumDate={bounds.min}
          maximumDate={bounds.max}
          dateLabel={t('group:form.date_label')}
          timeLabel={t('group:form.time_label')}
          datePlaceholder={t('group:form.pick_date')}
          timePlaceholder={t('group:form.pick_time')}
          hint={t('group:form.starts_at_hint', { minutes: 15, days: 60 })}
        />
        <DateTimePicker
          value={null}
          onChange={() => undefined}
          dateLabel={t('group:form.date_label')}
          timeLabel={t('group:form.time_label')}
          datePlaceholder={t('group:form.pick_date')}
          timePlaceholder={t('group:form.pick_time')}
          error={t('errors:required')}
        />
        <DateTimePicker
          value={bounds.min}
          onChange={() => undefined}
          disabled
          dateLabel={t('group:form.date_label')}
          timeLabel={t('group:form.time_label')}
          datePlaceholder={t('group:form.pick_date')}
          timePlaceholder={t('group:form.pick_time')}
        />
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

      <Section title="BookmarkButton · MenuItem">
        <Row gap={2}>
          <BookmarkButton saved={saved} onToggle={setSaved} labels={{ save: t('listing:bookmark.save'), unsave: t('listing:bookmark.unsave') }} />
          <BookmarkButton saved variant="filled" onToggle={() => undefined} labels={{ save: t('listing:bookmark.save'), unsave: t('listing:bookmark.unsave') }} />
          <BookmarkButton saved={false} disabled onToggle={() => undefined} labels={{ save: t('listing:bookmark.save'), unsave: t('listing:bookmark.unsave') }} />
        </Row>
        <Card padded={false}>
          <MenuItem icon={ListChecks} label={t('listing:manage.title')} value="3" onPress={() => toast.show(t('listing:manage.title'))} />
          <Divider />
          <MenuItem icon={Heart} label={t('listing:saved.title')} onPress={() => toast.show(t('listing:saved.title'))} />
          <Divider />
          <MenuItem icon={LogOut} label={t('auth:sign_out')} tone="danger" chevron={false} onPress={() => toast.show(t('auth:signed_out'))} />
        </Card>
        {/* iconBox + description + SectionHeader bar: khối "Cài đặt & hỗ trợ" tab Tôi. */}
        <SectionHeader bar="primary" title={t('profile.settings_section')} />
        <SectionHeader bar="accent" title={t('listing:manage.title')} action={{ label: t('home.see_all'), onPress: () => undefined }} />
        <Card padded={false}>
          <MenuItem iconBox icon={Heart} label={t('listing:saved.title')} onPress={() => toast.show(t('listing:saved.title'))} />
          <Divider />
          <MenuItem
            iconBox
            icon={Bell}
            label={t('notifications.prefs.title')}
            description={t('notifications.prefs.subtitle')}
            onPress={() => toast.show(t('notifications.prefs.title'))}
          />
          <Divider />
          <MenuItem iconBox icon={LogOut} label={t('auth:sign_out')} tone="danger" onPress={() => toast.show(t('auth:signed_out'))} />
        </Card>
      </Section>

      <Section title="ImagePicker">
        <ImagePicker
          items={photos}
          max={10}
          onAdd={() => toast.show(t('listing:form.add_photo'))}
          onRemove={(key) => setPhotos((p) => p.filter((x) => x.key !== key))}
          onMakeCover={(key) => setPhotos((p) => [...p.filter((x) => x.key === key), ...p.filter((x) => x.key !== key)])}
          onRetry={(key) => setPhotos((p) => p.map((x) => (x.key === key ? { ...x, status: 'done' } : x)))}
        />
        <ImagePicker items={[]} max={10} onAdd={() => undefined} onRemove={() => undefined} onMakeCover={() => undefined} disabled />
        {/* Một ảnh, không ảnh bìa (giấy tờ xin huy hiệu). */}
        <ImagePicker
          items={photos.slice(0, 1)}
          max={1}
          cover={false}
          addLabel={t('badge_request.from_library')}
          onAdd={() => toast.show(t('badge_request.from_library'))}
          onRemove={(key) => setPhotos((p) => p.filter((x) => x.key !== key))}
        />
      </Section>

      <Section title="CoachMark">
        <Button label={t('coach.label')} variant="outline" onPress={() => setCoach(true)} />
        <CoachMark
          open={coach}
          onDone={() => setCoach(false)}
          steps={[
            { icon: Search, title: t('coach.search_title'), body: t('coach.search_body') },
            { icon: SquarePlus, title: t('coach.post_title'), body: t('coach.post_body') },
            { icon: MessageCircle, title: t('coach.chat_title'), body: t('coach.chat_body') },
          ]}
        />
      </Section>

      <Section title="SuccessScreen · Notice">
        <SuccessScreen
          celebrate
          title={t('listing:form.success_title')}
          description={t('listing:form.success_body')}
          primary={{ label: t('listing:form.view_listing'), onPress: () => toast.show(t('listing:form.view_listing')) }}
          secondary={[{ label: t('listing:form.post_another'), onPress: () => toast.show(t('listing:form.post_another')) }]}
        />
        <SuccessScreen
          tone="warning"
          title={t('listing:form.pending_title')}
          description={t('listing:form.pending_body')}
          primary={{ label: t('listing:form.my_listings'), onPress: () => toast.show(t('listing:form.my_listings')) }}
        >
          <Row gap={1} justify="center">
            <Badge label={t('listing:manage.reason.new_account')} tone="warning" />
          </Row>
        </SuccessScreen>
        <SuccessScreen
          tone="danger"
          title={t('listing:form.rejected_title')}
          description={t('listing:form.rejected_body')}
          primary={{ label: t('listing:form.title_edit'), onPress: () => toast.show(t('listing:form.title_edit')) }}
        />
        <Notice tone="danger" text={t('errors:upload_failed')} />
        <Notice tone="warning" title={t('listing:state.sold')} text={t('listing:state.inactive_hint')} />
        <Notice text={t('listing:form.draft_restored')}>
          <Button size="sm" variant="ghost" label={t('listing:form.start_over')} className="-ml-4" />
        </Notice>
      </Section>

      <Section title="SearchBar (button) · ServiceTile selected">
        <SearchBar onPress={() => toast.show(t('nav.search'))} placeholder={t('nav.search_placeholder')} />
        <View className="flex-row flex-wrap">
          {FEATURE_KEYS.slice(0, 4).map((f) => (
            <View key={f} className="w-1/2 p-1.5">
              <ServiceTile service={f} label={t(`feature.${f}`)} selected={tile === f} onPress={() => setTile(f)} />
            </View>
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

      <Section title="StarRating">
        <StarRating
          value={stars}
          onChange={setStars}
          accessibilityLabel={t('group:rate.title')}
          starLabel={(n) => t('group:rate.score_label', { count: n })}
        />
        <Text tone="muted">{stars > 0 ? t(`group:rate.score_${stars}`) : t('group:rate.title')}</Text>
        <StarRating value={4} onChange={() => undefined} disabled accessibilityLabel={t('group:rate.title')} />
        <Row gap={2}>
          <StarRating value={4} size="sm" accessibilityLabel={t('group:rate.your_score', { score: 4 })} />
          <Text variant="caption" tone="muted">
            {t('group:rate.your_score', { score: 4 })}
          </Text>
        </Row>
      </Section>

      <Section title="MessageBubble · Composer · ReportSheet · ConfirmSheet">
        <MessageBubble mine={false} body={t('chat:thread.start_hint')} time="09:30" />
        <MessageBubble mine body={t('chat:safety.tip_meet')} time="09:31" status="seen" />
        <MessageBubble mine body={t('chat:safety.tip_check')} time="09:32" status="sending" />
        <MessageBubble mine body={t('chat:safety.tip_deposit')} time="09:33" status="failed" onRetry={() => toast.show(t('chat:thread.retry'))} />
        <MessageBubble mine={false} imagePending time="09:34" />
        <MessageBubble mine={false} body={t('group:chat.empty')} time="09:35" author={{ name: 'Bình T.' }} showAuthor showMeta={false} />
        <MessageBubble mine={false} body={t('group:detail.instant_hint')} time="09:35" author={{ name: 'Bình T.' }} showAvatar />
        <Composer value={draft} onChangeText={setDraft} onSend={() => setDraft('')} onPickImage={() => undefined} maxLength={2000} />
        <Composer value="" onChangeText={() => undefined} onSend={() => undefined} maxLength={2000} error={t('errors:message_has_phone')} />
        <Composer
          value=""
          onChangeText={() => undefined}
          onSend={() => undefined}
          maxLength={2000}
          disabledText={t('chat:blocked.by_me')}
          disabledAction={{ label: t('block.unblock'), onPress: () => undefined }}
        />
        <Row gap={2}>
          <Button label={t('actions.report')} variant="outline" size="sm" onPress={() => setReportSheet(true)} />
          <Button label={t('actions.block')} variant="outline" size="sm" onPress={() => setConfirmSheet(true)} />
        </Row>
        <ReportSheet open={reportSheet} onClose={() => setReportSheet(false)} target="listing" onSubmit={() => setReportSheet(false)} />
        <ConfirmSheet
          open={confirmSheet}
          onClose={() => setConfirmSheet(false)}
          title={t('block.title', { name: t('block.someone') })}
          body={t('block.body')}
          confirmLabel={t('block.confirm')}
          onConfirm={() => setConfirmSheet(false)}
        />
      </Section>

      <Section title="ToggleRow">
        <Card padded={false}>
          <ToggleRow label={t('notifications.prefs.messages')} hint={t('notifications.prefs.messages_hint')} value={toggle} onValueChange={setToggle} />
          <Divider />
          <ToggleRow label={t('notifications.prefs.groups')} value={false} onValueChange={() => undefined} disabled />
        </Card>
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

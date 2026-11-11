// Thân màn Huy hiệu (style Stitch "Huy hiệu & Xác minh (BadgeRequestCard)"), khớp trang /toi/huy-hieu của web:
// - BadgeSummary (trong header xanh PageHero): hộp trong mờ — "Đã có n/4 huy hiệu" (hoặc "Chưa có…") + viên "n đang chờ
//   duyệt" → thanh 4 vạch (đã có: cam · chờ duyệt: on-primary/60 · chưa: on-primary/25 — trang trí, chữ đã nói rõ) → dòng
//   gợi ý → viên "Đã xác minh SĐT" khi có huy hiệu phone (tự gán, không xin được).
// - BadgeCenter: cuộn (kéo làm mới) — khối lợi ích (viền warning/30 nền warning/10, giống Notice bordered) → tiêu đề vạch cam
//   "Chọn huy hiệu" → 4 BadgeRequestCard (chưa xin / bị từ chối chọn được; mặc định huy hiệu xin được đầu tiên) → thẻ gửi
//   giấy tờ cho huy hiệu đang chọn (ô nét đứt Chụp ảnh / Chọn từ thư viện → ảnh đã chọn: xem / xoá, đổi ảnh; mẹo chụp) →
//   hộp riêng tư (chỉ kiểm duyệt viên xem, tự xoá PURGE_AFTER_DAYS ngày sau khi có kết quả, thời gian duyệt) → thanh dính
//   đáy: nút cam "Gửi xác minh" (khoá đến khi có ảnh, kèm dòng nhắc) — nén ≤ 1600 px WebP → useRequestBadge (bucket riêng
//   tư verification + Edge Function request-badge) → toast "Đã gửi", xoá ảnh; thẻ chuyển "Đang chờ duyệt", chọn sang huy
//   hiệu xin được kế tiếp. Không còn huy hiệu xin được → Notice thay thẻ gửi, không thanh đáy.
// Khác Stitch (cố ý): không % "độ tin cậy" và hạng "Thành viên cơ bản" (không có điểm xác minh — thay bằng số huy hiệu
// thật); không nút "Hỗ trợ" ở header (chưa có kênh hỗ trợ); lợi ích "tăng 3x lượt tin tưởng", "ưu tiên ghép xe", "kèo
// không cần cọc" không có thật → 3 lợi ích đúng với app; không ô chọn đơn vị / nhà thầu, chip #HòaPhát, ô phân xưởng, ô SĐT /
// Zalo nhận kết quả, ô ghi chú cho BQT (request-badge chỉ nhận badge + documentPath; kết quả báo qua thông báo trong app;
// không hiện SĐT — PII); không ảnh mẫu giấy tờ và "tự động che số CCCD" (không có ảnh mẫu, không có xử lý che — mẹo che
// bằng tay thay thế); "xoá sau 7 ngày", "2–4 giờ" → số thật (PURGE_AFTER_DAYS sau khi duyệt, 1–2 ngày); không nhận PDF
// trên app (cần thư viện chọn tệp; web nhận PDF); không footer / bottom nav riêng (màn ngoài tab, disclaimer ở Giới thiệu).
import { PURGE_AFTER_DAYS, type RequestableBadge, VERIFICATION_FILE } from '@hp/shared';
import {
  BadgeCheck,
  Camera,
  Check,
  Clock,
  EyeOff,
  FileUp,
  Handshake,
  ImagePlus,
  Info,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, View } from 'react-native';
import type { PickedImage } from '@/core/upload';
import { Button, Card, Col, Icon, ImagePicker, Notice, Row, SectionHeader, StickyCta, Text, useTheme } from '@/ui';
import { type BadgeState, canRequestBadge, usePickDocument, useSubmitBadgeRequest } from '../hooks';
import { BadgeRequestCard } from './BadgeRequestCard';

const MAX_MB = Math.round(VERIFICATION_FILE.maxBytes / (1024 * 1024));

// ── Tóm tắt trong header xanh ───────────────────────────────────────────────────

const SEGMENT: Record<BadgeState['status'], string> = {
  owned: 'bg-accent',
  pending: 'bg-on-primary/60',
  rejected: 'bg-on-primary/25',
  none: 'bg-on-primary/25',
};

export function BadgeSummary({ states, phoneVerified }: { states: BadgeState[]; phoneVerified: boolean }) {
  const { t } = useTranslation();
  const owned = states.filter((s) => s.status === 'owned').length;
  const pending = states.filter((s) => s.status === 'pending').length;
  const total = states.length;
  const hint = owned === total ? t('badge_request.summary_all') : t('badge_request.summary_hint');
  return (
    <View className="gap-2 rounded-lg border border-on-primary/20 bg-on-primary/15 p-3">
      <Row gap={2}>
        <View className="size-8 items-center justify-center rounded-full bg-on-primary/20">
          <Icon icon={ShieldCheck} tone="onPrimary" size={18} />
        </View>
        <Text variant="label" weight="semibold" tone="onPrimary" className="flex-1">
          {owned > 0 ? t('badge_request.summary_count', { count: owned, total }) : t('badge_request.summary_none')}
        </Text>
        {pending > 0 ? (
          <View className="rounded-full bg-on-primary/20 px-2.5 py-0.5">
            <Text variant="caption" weight="semibold" tone="onPrimary">
              {t('badge_request.summary_pending', { count: pending })}
            </Text>
          </View>
        ) : null}
      </Row>
      <View className="flex-row gap-1.5" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {states.map((s) => (
          <View key={s.badge} className={`h-1.5 flex-1 rounded-full ${SEGMENT[s.status]}`} />
        ))}
      </View>
      <Row gap={2} align="start">
        <Icon icon={Info} tone="onPrimary" size={16} />
        <Text variant="caption" tone="onPrimary" className="flex-1 opacity-90">
          {hint}
        </Text>
      </Row>
      {phoneVerified ? (
        <View className="flex-row items-center gap-1 self-start rounded-full bg-on-primary/20 px-2.5 py-0.5">
          <Icon icon={Check} tone="onPrimary" size={14} />
          <Text variant="caption" weight="semibold" tone="onPrimary">
            {t('listing:owner_badge.phone')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function BadgeSummarySkeleton() {
  return (
    <View className="gap-2 rounded-lg border border-on-primary/20 bg-on-primary/15 p-3" accessibilityElementsHidden>
      <Row gap={2}>
        <View className="size-8 rounded-full bg-on-primary/15" />
        <View className="h-5 w-1/2 rounded-full bg-on-primary/15" />
      </Row>
      <View className="h-1.5 w-full rounded-full bg-on-primary/15" />
      <View className="h-4 w-3/4 rounded-full bg-on-primary/15" />
    </View>
  );
}

// ── Thân màn ────────────────────────────────────────────────────────────────────

export function BadgeCenter({ states, onRefresh }: { states: BadgeState[]; onRefresh: () => Promise<unknown> }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [choice, setChoice] = useState<RequestableBadge | null>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const submit = useSubmitBadgeRequest();
  const pick = usePickDocument(setImage);
  const requestable = states.filter((s) => canRequestBadge(s.status)).map((s) => s.badge);
  // Huy hiệu vừa gửi (chờ duyệt) / vừa có → về huy hiệu xin được đầu tiên.
  const selected = choice && requestable.includes(choice) ? choice : (requestable[0] ?? null);

  const refresh = () => {
    setRefreshing(true);
    void onRefresh().finally(() => setRefreshing(false));
  };

  return (
    <>
      <ScrollView
        className="-mx-4 flex-1"
        contentContainerClassName="gap-5 px-4 pb-6 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      >
        <BadgeBenefits />
        <Col gap={3}>
          <SectionHeader title={t('badge_request.choose_badge')} subtitle={t('badge_request.choose_hint')} bar="accent" />
          {states.map((s) => (
            <BadgeRequestCard key={s.badge} state={s} selected={s.badge === selected} onSelect={() => setChoice(s.badge)} />
          ))}
        </Col>
        {selected ? (
          <BadgeDocumentForm
            badge={selected}
            image={image}
            busy={submit.isPending}
            onCamera={() => void pick.camera()}
            onLibrary={() => void pick.library()}
            onRemove={() => setImage(null)}
          />
        ) : (
          <Notice text={t('badge_request.nothing_to_request')} />
        )}
        <BadgePrivacyNote />
      </ScrollView>
      {selected ? (
        <StickyCta elevated>
          {!image ? (
            <Text variant="caption" tone="muted" className="text-center">
              {t('badge_request.need_photo')}
            </Text>
          ) : null}
          <Button
            label={t('badge_request.submit')}
            variant="accent"
            icon={FileUp}
            fullWidth
            disabled={!image}
            loading={submit.isPending}
            onPress={() => image && submit.submit(selected, image, () => setImage(null))}
          />
        </StickyCta>
      ) : null}
    </>
  );
}

function BadgeBenefits() {
  const { t } = useTranslation();
  const items = [
    { key: 'benefit_visible', icon: BadgeCheck },
    { key: 'benefit_trust', icon: Handshake },
    { key: 'benefit_free', icon: ShieldCheck },
  ] as const;
  return (
    <View className="gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
      <Row gap={2}>
        <Icon icon={Sparkles} tone="warning" />
        <Text variant="label" weight="bold" accessibilityRole="header" className="flex-1">
          {t('badge_request.benefits_title')}
        </Text>
      </Row>
      {items.map((item) => (
        <Row key={item.key} gap={2} align="start">
          <Icon icon={item.icon} tone="warning" size={18} />
          <Text variant="caption" className="flex-1">
            {t(`badge_request.${item.key}`)}
          </Text>
        </Row>
      ))}
    </View>
  );
}

type DocumentFormProps = {
  badge: RequestableBadge;
  image: PickedImage | null;
  busy: boolean;
  onCamera: () => void;
  onLibrary: () => void;
  onRemove: () => void;
};

function BadgeDocumentForm({ badge, image, busy, onCamera, onLibrary, onRemove }: DocumentFormProps) {
  const { t } = useTranslation();
  const tips = [
    { key: 'tip_clear', icon: Check, tone: 'success' },
    { key: 'tip_name', icon: Check, tone: 'success' },
    { key: 'tip_cover', icon: EyeOff, tone: 'muted' },
  ] as const;
  return (
    <Card>
      <Col gap={4}>
        <Row gap={3} align="start">
          <View className="size-8 items-center justify-center rounded-md bg-primary-light">
            <Icon icon={FileUp} tone="primary" size={18} />
          </View>
          <Col gap={0} className="flex-1">
            <Text variant="label" weight="bold" accessibilityRole="header">
              {t('badge_request.form_title', { badge: t(`listing:owner_badge.${badge}`) })}
            </Text>
            <Text variant="caption" tone="muted">
              {t('badge_request.upload_hint', { mb: MAX_MB })}
            </Text>
          </Col>
        </Row>

        {image ? (
          <Col gap={3}>
            <ImagePicker
              items={[{ key: image.uri, uri: image.uri, status: 'idle' }]}
              max={1}
              cover={false}
              addLabel={t('badge_request.from_library')}
              onAdd={onLibrary}
              onRemove={onRemove}
              disabled={busy}
            />
            <Row gap={2} wrap>
              <Button label={t('badge_request.change_photo')} icon={Camera} variant="outline" size="sm" disabled={busy} onPress={onCamera} />
              <Button label={t('badge_request.from_library')} icon={ImagePlus} variant="outline" size="sm" disabled={busy} onPress={onLibrary} />
            </Row>
          </Col>
        ) : (
          <View className="items-center gap-3 rounded-lg border-2 border-dashed border-primary/40 bg-surface-2 p-4">
            <View className="size-12 items-center justify-center rounded-full bg-primary-light">
              <Icon icon={Camera} tone="primary" />
            </View>
            <Text variant="label" weight="bold" tone="primary" className="text-center">
              {t('badge_request.pick_photo')}
            </Text>
            <Col gap={2} className="w-full">
              <Button label={t('badge_request.take_photo')} icon={Camera} variant="outline" fullWidth disabled={busy} onPress={onCamera} />
              <Button label={t('badge_request.from_library')} icon={ImagePlus} variant="outline" fullWidth disabled={busy} onPress={onLibrary} />
            </Col>
          </View>
        )}

        <Col gap={2}>
          <Text variant="caption" weight="semibold">
            {t('badge_request.tips_title')}
          </Text>
          {tips.map((tip) => (
            <Row key={tip.key} gap={2} align="start">
              <Icon icon={tip.icon} tone={tip.tone} size={16} />
              <Text variant="caption" tone="muted" className="flex-1">
                {t(`badge_request.${tip.key}`)}
              </Text>
            </Row>
          ))}
        </Col>
      </Col>
    </Card>
  );
}

function BadgePrivacyNote() {
  const { t } = useTranslation();
  return (
    <View accessibilityRole="text" className="flex-row items-start gap-3 rounded-lg border border-border bg-surface-2 p-4">
      <View className="size-10 items-center justify-center rounded-md bg-primary-light">
        <Icon icon={ShieldCheck} tone="primary" />
      </View>
      <Col gap={1} className="flex-1">
        <Text variant="label" weight="bold">
          {t('badge_request.privacy_title')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('badge_request.privacy_body', { days: PURGE_AFTER_DAYS })}
        </Text>
        <Row gap={1} align="start" className="mt-1">
          <Icon icon={Clock} tone="primary" size={16} />
          <Text variant="caption" weight="semibold" tone="primary" className="flex-1">
            {t('badge_request.review_time')}
          </Text>
        </Row>
      </Col>
    </View>
  );
}

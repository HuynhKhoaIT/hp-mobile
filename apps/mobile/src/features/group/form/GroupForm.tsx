// Form tạo nhóm (ride / sport) một trang — style Stitch "Đăng chuyến xe ghép": header xanh (PageHero: nút quay lại trong
// mờ, ô icon dịch vụ, tiêu đề + dòng phụ theo config.form) → các khối thẻ có tiêu đề vạch:
//   loại (chip) → "Lộ trình" (ghép xe: điểm đi + điểm đến có chọn nhanh RIDE_PLACES) / "Sân chơi" (kèo: chọn sân trong
//   danh mục / tự gõ / góp sân mới — VenueField) → ngày giờ → chỗ trống / người cần thêm (kèo: + "Đội đã có sẵn người" —
//   LineupField) + chi phí / người → tiêu đề (ghép xe: để trống tự đặt) + ghi chú → thông tin thêm (duyệt người tham gia +
//   GROUP_ATTRIBUTE_FIELDS[kind]). Thứ tự, chữ và nút khớp web. Nút dính đáy (StickyCta elevated): Đăng chuyến / Đăng kèo.
// Zod / validate giữ nguyên (useGroupForm). Rời màn khi đang soạn dở → BottomSheet "Bỏ nhóm đang tạo?".
// Khác Stitch (cố ý): không "Lưu nháp" (đã tự lưu nháp), ca kíp cố định / lặp lại theo ca, loại xe 4–7 chỗ, tiện ích điều
// hoà / mũ bảo hiểm, giá gợi ý, nhận tiền QR, đổi chiều tuyến — không có dữ liệu / tính năng đó. Chưa có bản đồ (chờ Goong).
import { GROUP_ATTRIBUTE_FIELDS, GROUP_RULES, type Locale, RIDE_PLACES } from '@hp/shared';
import { type NavigationAction, Stack, useIsFocused, useNavigation, usePreventRemove } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment, type ReactNode, useRef, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useErrorText } from '@/lib/errors';
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  Col,
  DateTimePicker,
  Divider,
  Input,
  Notice,
  PageHero,
  PriceInput,
  Row,
  SectionHeader,
  Select,
  Stepper,
  StickyCta,
  Text,
  ToggleRow,
  useScheme,
} from '@/ui';
import { backOrHome } from '../navigation';
import type { GroupFeatureConfig } from '../types';
import { GroupPostResult } from './GroupPostResult';
import { DEFAULT_PLAYERS_HAVE, type GroupFormState, useGroupForm } from './useGroupForm';
import { VenueField } from './VenueField';

export type GroupFormProps = {
  config: GroupFeatureConfig;
  defaultOrigin: string;
  lang: Locale;
};

export function GroupForm(props: GroupFormProps) {
  const { t } = useTranslation('group');
  const f = useGroupForm(props);
  const navigation = useNavigation();
  const [discardOpen, setDiscardOpen] = useState(false);
  const pendingAction = useRef<NavigationAction | null>(null);

  // Rời màn (nút Back, vuốt, router.back) khi đang soạn dở → hỏi trước. Đã tạo / đã đồng ý bỏ → cho qua.
  usePreventRemove(f.dirty, ({ data }) => {
    if (f.allowLeave.current) {
      navigation.dispatch(data.action);
      return;
    }
    pendingAction.current = data.action;
    setDiscardOpen(true);
  });

  const confirmDiscard = () => {
    f.discard();
    setDiscardOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) navigation.dispatch(action);
    else backOrHome();
  };

  if (f.result) return <GroupPostResult config={props.config} result={f.result} />;

  return (
    <>
      {/* iOS: vuốt để quay lại không chặn được bằng usePreventRemove → tắt khi đang soạn dở. */}
      <Stack.Screen options={{ gestureEnabled: !f.dirty }} />
      <GroupFormHero config={props.config} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 pb-6 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {f.restored ? (
          <Notice text={t('form.draft_restored')}>
            <Button size="sm" variant="ghost" label={t('form.start_over')} onPress={f.startOver} className="-ml-4" />
          </Notice>
        ) : null}
        <MainFields f={f} config={props.config} />
        <DetailFields f={f} config={props.config} />
      </ScrollView>
      <StickyCta elevated>
        <Button
          label={f.busy ? t('form.submitting') : t(props.config.form.submitKey)}
          variant="accent"
          fullWidth
          loading={f.busy}
          onPress={f.submit}
        />
      </StickyCta>
      <BottomSheet open={discardOpen} onClose={() => setDiscardOpen(false)} title={t('form.discard_title')}>
        <Text tone="muted">{t('form.discard_body')}</Text>
        <Col gap={2}>
          <Button label={t('form.discard_confirm')} variant="danger" fullWidth onPress={confirmDiscard} />
          <Button label={t('form.keep_editing')} variant="outline" fullWidth onPress={() => setDiscardOpen(false)} />
        </Col>
      </BottomSheet>
    </>
  );
}

type SectionProps = { f: GroupFormState; config: GroupFeatureConfig };

/**
 * Header xanh của form (dùng cả khi đang tải hồ sơ — route group/new/[kind]): quay lại, icon dịch vụ, tiêu đề + dòng phụ.
 * Header tràn lên vùng trạng thái → chữ thanh trạng thái sáng khi màn đang mở.
 */
export function GroupFormHero({ config }: { config: GroupFeatureConfig }) {
  const { t } = useTranslation('group');
  const focused = useIsFocused();
  const scheme = useScheme();
  return (
    <>
      <PageHero title={t(config.form.titleKey)} subtitle={t(config.form.subtitleKey)} service={config.color} onBack={backOrHome} />
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </>
  );
}

/** Một khối của form: tiêu đề có vạch primary (+ dòng phụ) → nội dung trong thẻ (card = false: nội dung tự có thẻ). */
function FormBlock({ title, subtitle, card = true, children }: { title: string; subtitle?: string; card?: boolean; children: ReactNode }) {
  return (
    <View className="gap-2">
      <SectionHeader title={title} subtitle={subtitle} bar="primary" size="md" />
      {card ? <Card className="gap-4">{children}</Card> : children}
    </View>
  );
}

/** Ô chữ trong attributes (vd ghi chú xe) — khớp GroupAttributes.ride.vehicle_note của @hp/shared. */
const ATTRIBUTE_TEXT_MAX = 60;

/** Loại, địa điểm, giờ, số chỗ, chi phí, tiêu đề, ghi chú. */
function MainFields({ f, config }: SectionProps) {
  const { t } = useTranslation('group');
  const errorText = useErrorText();
  const { control } = f.form;
  const subKind = useWatch({ control, name: 'sub_kind' });
  const destination = useWatch({ control, name: 'destination_text' });
  const destLat = useWatch({ control, name: 'destination_lat' });
  const err = (message: string | undefined) => (message ? errorText(message) : null);
  const route = config.form.place === 'route';

  return (
    <Col gap={5}>
      <FormBlock title={t(config.form.subKindLabelKey)}>
        <View accessibilityRole="radiogroup" accessibilityLabel={t(config.form.subKindLabelKey)}>
          <Row gap={2} wrap>
            {config.subKinds.map((s) => (
              <Chip key={s} label={t(`sub_kind.${s}`)} selected={subKind === s} onPress={() => f.setSubKind(s)} />
            ))}
          </Row>
        </View>
      </FormBlock>

      <FormBlock title={t(config.labels.placeTitle)} card={route}>
        {route ? (
          <Controller
            control={control}
            name="origin_text"
            render={({ field, fieldState }) => (
              <Input
                label={t('form.origin_label')}
                hint={t('form.origin_hint')}
                placeholder={t('form.origin_placeholder')}
                maxLength={GROUP_RULES.placeMax}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={err(fieldState.error?.message)}
              />
            )}
          />
        ) : (
          <VenueField f={f} />
        )}

        {route ? (
          <View className="gap-2">
            <Controller
              control={control}
              name="destination_text"
              render={({ field, fieldState }) => (
                <Input
                  label={t('form.destination_label')}
                  placeholder={t('form.destination_placeholder')}
                  maxLength={GROUP_RULES.placeMax}
                  value={field.value}
                  onChangeText={(text) => f.pickDestination(null, text)}
                  onBlur={field.onBlur}
                  error={err(fieldState.error?.message)}
                />
              )}
            />
            <Text variant="caption" tone="muted">
              {t('form.places_quick')}
            </Text>
            <Row gap={2} wrap>
              {RIDE_PLACES.map((p) => (
                <Chip
                  key={p.id}
                  size="sm"
                  label={p.name}
                  selected={destination === p.name && destLat === p.lat}
                  onPress={() => f.pickDestination(p)}
                />
              ))}
            </Row>
          </View>
        ) : null}
      </FormBlock>

      <FormBlock title={t(config.form.startsAtLabelKey)}>
        <Controller
          control={control}
          name="starts_at"
          render={({ field, fieldState }) => (
            <DateTimePicker
              value={field.value}
              onChange={(d) => {
                f.setField('starts_at', d);
                field.onBlur();
              }}
              minimumDate={f.bounds.min}
              maximumDate={f.bounds.max}
              dateLabel={t('form.date_label')}
              timeLabel={t('form.time_label')}
              datePlaceholder={t('form.pick_date')}
              timePlaceholder={t('form.pick_time')}
              hint={t('form.starts_at_hint', {
                minutes: GROUP_RULES.minLeadMinutes,
                days: GROUP_RULES.maxDaysAhead,
              })}
              error={err(fieldState.error?.message)}
            />
          )}
        />
      </FormBlock>

      <FormBlock title={t(config.form.seatsSectionKey)}>
        <Controller
          control={control}
          name="seats_total"
          render={({ field, fieldState }) => (
            <Stepper
              label={t(config.form.seatsLabelKey)}
              hint={t(subKind === 'motorbike' ? 'form.seats_hint_motorbike' : 'form.seats_hint')}
              value={field.value}
              onChange={(n) => f.setField('seats_total', n)}
              min={1}
              max={f.maxSeats}
              decreaseLabel={t('form.seats_decrease')}
              increaseLabel={t('form.seats_increase')}
              error={err(fieldState.error?.message)}
            />
          )}
        />

        {config.form.lineup ? <LineupField f={f} /> : null}

        <Controller
          control={control}
          name="fee_per_person"
          render={({ field, fieldState }) => (
            <PriceInput
              label={t('form.fee_label')}
              hint={t(config.form.feeHintKey)}
              value={field.value}
              onChange={(v) => field.onChange(v === null ? null : Math.min(v, GROUP_RULES.feeMax))}
              onBlur={field.onBlur}
              error={err(fieldState.error?.message)}
            />
          )}
        />
      </FormBlock>

      <FormBlock title={t('form.section_about')}>
        <Controller
          control={control}
          name="title"
          render={({ field, fieldState }) => (
            <Input
              label={route ? `${t('form.title_label')} (${t('form.optional')})` : t('form.title_label')}
              hint={route ? t('form.title_hint_auto') : undefined}
              placeholder={config.form.titlePlaceholderKey ? t(config.form.titlePlaceholderKey) : undefined}
              maxLength={GROUP_RULES.titleMax}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={err(fieldState.error?.message)}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <Input
              label={`${t('form.description_label')} (${t('form.optional')})`}
              hint={t(config.form.descriptionHintKey)}
              multiline
              textAlignVertical="top"
              maxLength={GROUP_RULES.descriptionMax}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={err(fieldState.error?.message)}
              className="min-h-24"
            />
          )}
        />
      </FormBlock>
    </Col>
  );
}

/**
 * Đội đã có sẵn người (config.form.lineup): công tắc → Stepper attributes.players_have (tính cả chủ nhóm) + xem trước
 * "Đội đủ N người khi có thêm M người" (N = có sẵn + số người cần thêm). Tắt → bỏ khoá khỏi attributes.
 */
function LineupField({ f }: { f: GroupFormState }) {
  const { t } = useTranslation('group');
  const errorText = useErrorText();
  const { control } = f.form;
  const have = useWatch({ control, name: 'attributes.players_have' });
  const seats = useWatch({ control, name: 'seats_total' });
  const on = typeof have === 'number';

  return (
    <Col gap={3}>
      <View className="rounded-md border border-border">
        <ToggleRow
          label={t('form.players_have_toggle')}
          value={on}
          onValueChange={(v) => f.setPlayersHave(v ? DEFAULT_PLAYERS_HAVE : undefined)}
        />
      </View>
      {on ? (
        <View className="gap-2">
          <Controller
            control={control}
            name="attributes.players_have"
            render={({ field, fieldState }) => (
              <Stepper
                label={t('form.players_have_label')}
                hint={t('form.players_have_hint')}
                value={field.value ?? DEFAULT_PLAYERS_HAVE}
                onChange={(n) => f.setPlayersHave(n)}
                min={1}
                max={GROUP_RULES.maxSeats}
                decreaseLabel={t('form.players_have_decrease')}
                increaseLabel={t('form.players_have_increase')}
                error={fieldState.error?.message ? errorText(fieldState.error.message) : null}
              />
            )}
          />
          <Text variant="caption" weight="medium" tone="primary" accessibilityLiveRegion="polite">
            {t('form.lineup_preview', { total: have + seats, count: seats })}
          </Text>
        </View>
      ) : null}
    </Col>
  );
}

/**
 * Duyệt người tham gia + thông tin thêm theo GROUP_ATTRIBUTE_FIELDS[kind] (@hp/shared): bool → công tắc (chung khối với
 * "Duyệt người tham gia"), text → ô nhập, enum → Select. Thêm trường cho một kind = thêm ở @hp/shared + i18n `attr.*`.
 */
function DetailFields({ f, config }: SectionProps) {
  const { t, i18n } = useTranslation('group');
  const errorText = useErrorText();
  const { control } = f.form;
  const approval = useWatch({ control, name: 'requires_approval' });
  const fields = GROUP_ATTRIBUTE_FIELDS[config.kind];
  const toggles = fields.filter((field) => field.kind === 'bool');
  const others = fields.filter((field) => field.kind !== 'bool');

  return (
    <Col gap={3}>
      <SectionHeader title={t('form.details_title')} subtitle={t('form.optional')} bar="primary" size="md" />
      <Card padded={false}>
        <ToggleRow
          label={t('form.approval_label')}
          hint={t('form.approval_hint')}
          value={approval}
          onValueChange={(v) => f.setField('requires_approval', v)}
        />
        {toggles.map((field) => (
          <Fragment key={field.key}>
            <Divider />
            <Controller
              control={control}
              name={`attributes.${field.key}`}
              render={({ field: rhf }) => (
                <ToggleRow label={t(`attr.${field.key}`)} value={rhf.value === true} onValueChange={rhf.onChange} />
              )}
            />
          </Fragment>
        ))}
      </Card>
      {others.map((field) => (
        <Controller
          key={field.key}
          control={control}
          name={`attributes.${field.key}`}
          render={({ field: rhf, fieldState }) => {
            const error = fieldState.error?.message ? errorText(fieldState.error.message) : null;
            const value = typeof rhf.value === 'string' ? rhf.value : null;
            if (field.kind === 'enum') {
              return (
                <Select<string>
                  label={t(`attr.${field.key}`)}
                  value={value}
                  options={field.options.map((o) => ({
                    value: o,
                    label: t(`attr_value.${field.key}.${o}`),
                  }))}
                  onChange={rhf.onChange}
                  error={error}
                />
              );
            }
            return (
              <Input
                label={t(`attr.${field.key}`)}
                placeholder={i18n.exists(`group:form.${field.key}_placeholder`) ? t(`form.${field.key}_placeholder`) : undefined}
                maxLength={ATTRIBUTE_TEXT_MAX}
                value={value ?? ''}
                onChangeText={rhf.onChange}
                onBlur={rhf.onBlur}
                error={error}
              />
            );
          }}
        />
      ))}
    </Col>
  );
}

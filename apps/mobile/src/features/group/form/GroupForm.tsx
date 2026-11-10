// Form tạo nhóm (ride / sport) một trang: loại → địa điểm (ghép xe: điểm đi + điểm đến có chọn nhanh; kèo: chọn sân
// trong danh mục / tự gõ / góp sân mới — VenueField)
// → ngày giờ → số chỗ (kèo: + "Đội đã có sẵn người" — LineupField) → chi phí / người → tiêu đề (ghép xe: để trống tự đặt) → ghi chú → duyệt người tham gia
// → thông tin thêm (GROUP_ATTRIBUTE_FIELDS[kind]). Thứ tự, chữ và nút khớp web. Nút dính đáy: Đăng chuyến / Đăng kèo.
// Rời màn khi đang soạn dở → BottomSheet "Bỏ nhóm đang tạo?". Chưa có bản đồ / gợi ý địa chỉ (chờ key Goong).
import { GROUP_ATTRIBUTE_FIELDS, GROUP_RULES, type Locale, RIDE_PLACES } from '@hp/shared';
import { type NavigationAction, Stack, useNavigation, usePreventRemove } from 'expo-router';
import { Fragment, useRef, useState } from 'react';
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
  Header,
  Input,
  Notice,
  PriceInput,
  Row,
  SectionHeader,
  Select,
  Stepper,
  StickyCta,
  Text,
  ToggleRow,
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
      <Header title={t(props.config.form.titleKey)} back onBack={backOrHome} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 pb-6"
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
      <StickyCta>
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
    <Col gap={4}>
      <View className="gap-2" accessibilityRole="radiogroup" accessibilityLabel={t(config.form.subKindLabelKey)}>
        <Text variant="label">{t(config.form.subKindLabelKey)}</Text>
        <Row gap={2} wrap>
          {config.subKinds.map((s) => (
            <Chip key={s} label={t(`sub_kind.${s}`)} selected={subKind === s} onPress={() => f.setSubKind(s)} />
          ))}
        </Row>
      </View>

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

      <Controller
        control={control}
        name="starts_at"
        render={({ field, fieldState }) => (
          <DateTimePicker
            label={t(config.form.startsAtLabelKey)}
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
            hint={t('form.starts_at_hint', { minutes: GROUP_RULES.minLeadMinutes, days: GROUP_RULES.maxDaysAhead })}
            error={err(fieldState.error?.message)}
          />
        )}
      />

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
      <Card padded={false}>
        <ToggleRow
          label={t('form.players_have_toggle')}
          value={on}
          onValueChange={(v) => f.setPlayersHave(v ? DEFAULT_PLAYERS_HAVE : undefined)}
        />
      </Card>
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
      <View className="gap-1">
        <SectionHeader title={t('form.details_title')} />
        <Text variant="caption" tone="muted">
          {t('form.optional')}
        </Text>
      </View>
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
              render={({ field: rhf }) => <ToggleRow label={t(`attr.${field.key}`)} value={rhf.value === true} onValueChange={rhf.onChange} />}
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
                  options={field.options.map((o) => ({ value: o, label: t(`attr_value.${field.key}.${o}`) }))}
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

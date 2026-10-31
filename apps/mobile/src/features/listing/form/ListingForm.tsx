// Form "Đăng nhanh" 3 bước (đăng + sửa tin, mọi category): 1 Ảnh → 2 Thông tin chính (tiêu đề, giá, mô tả)
// → 3 Chi tiết (ATTRIBUTE_FIELDS[category], khu, khu vực, ngôn ngữ). Thứ tự bước, chữ và nút khớp web.
// Nút dính đáy: Tiếp tục · (bước 3) Lưu nháp + Đăng tin; sửa tin đang hiện: Lưu thay đổi ở mọi bước.
// Rời màn khi đang soạn dở → BottomSheet "Bỏ tin đang soạn?". Android: nút Back lùi bước trước.
import { useSites } from '@hp/core/react';
import { ATTRIBUTE_FIELDS, type Locale, LOCALES, MAX_LISTING_IMAGES, PRICE_TYPES } from '@hp/shared';
import { type NavigationAction, Stack, useFocusEffect, useNavigation, usePreventRemove } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { BackHandler, ScrollView, View } from 'react-native';
import { useErrorText } from '@/lib/errors';
import {
  Badge,
  BottomSheet,
  Button,
  Chip,
  Col,
  Header,
  ImagePicker,
  Input,
  Notice,
  PriceInput,
  Row,
  SectionHeader,
  Select,
  StickyCta,
  Text,
} from '@/ui';
import { backOrHome } from '../navigation';
import type { ListingFeatureConfig } from '../types';
import { AttributeInput } from './AttributeInput';
import { PostResult } from './PostResult';
import { FORM_STEPS, type ListingFormMode, type ListingFormState, useListingForm } from './useListingForm';

export type ListingFormProps = {
  mode: ListingFormMode;
  config: ListingFeatureConfig;
  userId: string;
  defaultSite: string | null;
  lang: Locale;
};

const NO_SITE = '';

export function ListingForm(props: ListingFormProps) {
  const { t } = useTranslation('listing');
  const f = useListingForm(props);
  const navigation = useNavigation();
  const [discardOpen, setDiscardOpen] = useState(false);
  const pendingAction = useRef<NavigationAction | null>(null);

  // Rời màn (nút Back, vuốt, router.back) khi đang soạn dở → hỏi trước. Đã lưu / đã đồng ý bỏ → cho qua.
  usePreventRemove(f.dirty, ({ data }) => {
    if (f.allowLeave.current) {
      navigation.dispatch(data.action);
      return;
    }
    pendingAction.current = data.action;
    setDiscardOpen(true);
  });

  // Android: nút Back của máy lùi một bước trước khi rời form.
  const { step, back, result } = f;
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step > 1 && !result) {
          back();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [step, back, result]),
  );

  const confirmDiscard = () => {
    f.discard();
    setDiscardOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) navigation.dispatch(action);
    else backOrHome();
  };

  if (f.result) return <PostResult result={f.result} isEdit={f.isEdit && f.editingStatus !== 'draft'} />;

  const title = f.isEdit ? t('form.title_edit') : t('form.title_new');
  return (
    <>
      {/* iOS: vuốt để quay lại không chặn được bằng usePreventRemove → tắt khi đang soạn dở. */}
      <Stack.Screen options={{ gestureEnabled: !f.dirty }} />
      <Header title={title} back onBack={f.step > 1 ? f.back : backOrHome} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 pb-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Row gap={2} wrap>
          <Badge label={t(`common:category.${f.category}`)} />
          <Text variant="caption" tone="muted">
            {t('form.step', { current: f.step, total: FORM_STEPS })}
          </Text>
        </Row>
        {f.restored ? (
          <Notice text={t('form.draft_restored')}>
            <Button size="sm" variant="ghost" label={t('form.start_over')} onPress={f.startOver} className="-ml-4" />
          </Notice>
        ) : null}
        {f.step === 1 ? <PhotosStep f={f} /> : f.step === 2 ? <BasicsStep f={f} /> : <DetailsStep f={f} />}
      </ScrollView>
      <FormActions f={f} />
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

function PhotosStep({ f }: { f: ListingFormState }) {
  const { t } = useTranslation('listing');
  return (
    <Col gap={3}>
      <SectionHeader title={t('form.photos_title')} />
      <Text tone="muted">{t('form.photos_hint', { max: MAX_LISTING_IMAGES })}</Text>
      <ImagePicker
        items={f.photos}
        max={MAX_LISTING_IMAGES}
        onAdd={f.addPhotos}
        onRemove={f.removePhoto}
        onMakeCover={f.makeCover}
        onRetry={f.retryPhoto}
        disabled={f.busy}
      />
      {f.formConfig.photos === 'recommended' && f.photos.length === 0 ? <Notice text={t('form.photos_required')} /> : null}
    </Col>
  );
}

function BasicsStep({ f }: { f: ListingFormState }) {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const { control } = f.form;
  const priceType = useWatch({ control, name: 'price_type' });
  return (
    <Col gap={4}>
      <SectionHeader title={t('form.basics_title')} />
      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <Input
            label={t('form.title_label')}
            hint={t('form.title_hint')}
            maxLength={120}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message ? errorText(fieldState.error.message) : null}
            returnKeyType="next"
          />
        )}
      />
      {f.formConfig.price ? (
        <>
          <View className="gap-2" accessibilityRole="radiogroup" accessibilityLabel={t('form.price_type_label')}>
            <Text variant="label">{t('form.price_type_label')}</Text>
            <Row gap={2} wrap>
              {PRICE_TYPES.map((pt) => (
                <Chip key={pt} label={t(`form.price_type.${pt}`)} selected={priceType === pt} onPress={() => f.setField('price_type', pt)} />
              ))}
            </Row>
          </View>
          {priceType === 'fixed' ? (
            <Controller
              control={control}
              name="price"
              render={({ field, fieldState }) => (
                <PriceInput
                  label={t('form.price_label')}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message ? errorText(fieldState.error.message) : null}
                />
              )}
            />
          ) : null}
        </>
      ) : null}
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <Input
            label={`${t('form.description_label')} (${t('form.optional')})`}
            hint={t('form.description_hint')}
            multiline
            textAlignVertical="top"
            maxLength={5000}
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message ? errorText(fieldState.error.message) : null}
            className="min-h-32"
          />
        )}
      />
    </Col>
  );
}

function DetailsStep({ f }: { f: ListingFormState }) {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const sites = useSites();
  const { control } = f.form;
  const lang = useWatch({ control, name: 'lang' });
  const fields = ATTRIBUTE_FIELDS[f.category];
  const siteOptions = [
    { value: NO_SITE, label: t('form.site_none') },
    ...(sites.data ?? []).map((s) => ({ value: s.code, label: s.name })),
  ];

  return (
    <Col gap={4}>
      <View className="gap-1">
        <SectionHeader title={t('form.details_title')} />
        <Text variant="caption" tone="muted">
          {t('form.optional')}
        </Text>
      </View>
      {fields.map((field) => (
        <Controller
          key={field.key}
          control={control}
          name={`attributes.${field.key}`}
          render={({ field: rhf, fieldState }) => (
            <AttributeInput field={field} value={rhf.value} onChange={rhf.onChange} onBlur={rhf.onBlur} error={fieldState.error?.message} />
          )}
        />
      ))}
      <Controller
        control={control}
        name="site"
        render={({ field }) => (
          <Select
            label={t('form.site_label')}
            placeholder={t('form.select_placeholder')}
            value={field.value ?? NO_SITE}
            options={siteOptions}
            onChange={(v) => field.onChange(v === NO_SITE ? null : v)}
          />
        )}
      />
      <Controller
        control={control}
        name="address_text"
        render={({ field, fieldState }) => (
          <Input
            label={`${t('form.address_label')} (${t('form.optional')})`}
            hint={t('form.address_hint')}
            maxLength={200}
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message ? errorText(fieldState.error.message) : null}
          />
        )}
      />
      <View className="gap-2" accessibilityRole="radiogroup" accessibilityLabel={t('form.lang_label')}>
        <Text variant="label">{t('form.lang_label')}</Text>
        <Row gap={2} wrap>
          {LOCALES.map((l) => (
            <Chip key={l} label={t(`common:locale.${l}`)} selected={lang === l} onPress={() => f.setField('lang', l)} />
          ))}
        </Row>
      </View>
      <Notice tone="warning" text={t('form.rules_hint')} />
    </Col>
  );
}

/** Nút dính đáy theo bước + chế độ (đăng mới / sửa nháp / sửa tin đã đăng); trạng thái tải ảnh / đang lưu. */
function FormActions({ f }: { f: ListingFormState }) {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const editPublished = f.isEdit && f.editingStatus !== 'draft';
  const saveLabel = f.editingStatus === 'rejected' ? t('manage.resubmit') : t('form.save');
  const busyLabel =
    f.phase === 'uploading'
      ? t('form.uploading', { current: f.progress.current, total: f.progress.total })
      : editPublished
        ? t('form.saving')
        : t('form.submitting');

  if (f.phase === 'upload_error') {
    return (
      <StickyCta>
        <Notice tone="danger" text={errorText('upload_failed')} />
        <Button label={t('form.upload_retry')} fullWidth onPress={f.retryUpload} />
      </StickyCta>
    );
  }

  if (editPublished) {
    return (
      <StickyCta>
        <Row gap={2}>
          {f.step < FORM_STEPS ? (
            <View className="flex-1">
              <Button label={t('form.next')} variant="outline" fullWidth disabled={f.busy} onPress={f.next} />
            </View>
          ) : null}
          <View className="flex-1">
            <Button label={f.busy ? busyLabel : saveLabel} fullWidth loading={f.busy} onPress={() => f.submit('publish')} />
          </View>
        </Row>
      </StickyCta>
    );
  }

  if (f.step < FORM_STEPS) {
    return (
      <StickyCta>
        <Button label={t('form.next')} fullWidth onPress={f.next} />
      </StickyCta>
    );
  }

  return (
    <StickyCta>
      <Row gap={2}>
        <View className="flex-1">
          <Button label={t('form.save_draft')} variant="outline" fullWidth disabled={f.busy} onPress={() => f.submit('draft')} />
        </View>
        <View className="flex-1">
          <Button label={f.busy ? busyLabel : t('form.submit')} variant="accent" fullWidth loading={f.busy} onPress={() => f.submit('publish')} />
        </View>
      </Row>
    </StickyCta>
  );
}

// Form "Đăng nhanh" 3 bước (đăng + sửa tin, mọi category) — giao diện Stitch L2 ("Đăng tin pass đồ", "Đăng tin báo rơi đồ"):
//   header xanh PageHero (quay lại = lùi bước; "Bước n/3 · danh mục"; nút "Lưu nháp" pill trong mờ khi được lưu nháp; thanh
//   tiến độ 3 vạch; bước 1 tin mới: dòng nhắc "miễn phí, ~1 phút") → nội dung từng bước là các thẻ có tiêu đề icon:
//   1 Ảnh: (đồ thất lạc: hộp nhắc che số giấy tờ) · thẻ ảnh (ImagePicker, ảnh bìa, mẹo chụp theo config).
//   2 Thông tin chính: thẻ tiêu đề + thông số chính (config.form.primaryAttributes) + mô tả · thẻ Giá (khi config.form.price).
//   3 Chi tiết: thẻ thông số còn lại + ngôn ngữ · thẻ Khu vực (chip khu + khu vực) · thẻ Liên hệ (nhắn tin trong app, số của
//     mình chỉ hiện qua "Hiện số") · hộp quy định.
// Thanh dính đáy (StickyCta elevated): Tiếp tục · (bước 3) Đăng tin (cam); sửa tin đang hiện: Tiếp tục + Lưu thay đổi.
// Rời màn khi đang soạn dở → BottomSheet "Bỏ tin đang soạn?". Android: nút Back lùi bước trước. Thứ tự bước khớp web.
// Cố ý khác Stitch: giữ 3 bước "Đăng nhanh" (luật sản phẩm); bỏ Xem trước, trả giá, Zalo, hậu tạ, nơi đang giữ đồ
// (không có dữ liệu thật); khu là danh sách sites thật thay cho địa danh viết sẵn.
import { useSites } from '@hp/core/react';
import { type AttributeField, formatVnPhone, type Locale, LOCALES, MAX_LISTING_IMAGES, PRICE_TYPES } from '@hp/shared';
import { StatusBar } from 'expo-status-bar';
import { type NavigationAction, Stack, useFocusEffect, useIsFocused, useNavigation, usePreventRemove } from 'expo-router';
import {
  Banknote,
  Camera,
  ListChecks,
  MapPin,
  MessageCircle,
  PencilLine,
  Phone,
  Send,
  ShieldAlert,
  Sparkles,
  Timer,
} from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { BackHandler, ScrollView, View } from 'react-native';
import { useErrorText } from '@/lib/errors';
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  Col,
  Icon,
  ImagePicker,
  Input,
  Notice,
  PageHero,
  PriceInput,
  Row,
  SectionHeader,
  StickyCta,
  Text,
  useScheme,
} from '@/ui';
import { backOrHome, type MiniSlug } from '../navigation';
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
  /** SĐT trong hồ sơ (profiles.phone, dạng 84…) — chỉ để chủ tin biết số nào sẽ hiện qua "Hiện số". */
  phone?: string | null;
  /** Luồng đăng của mini-app (slug) — kết thúc về "Quản lý tin" của mini-app thay vì màn my-listings. */
  mini?: MiniSlug;
};

export function ListingForm(props: ListingFormProps) {
  const { t } = useTranslation('listing');
  const f = useListingForm(props);
  const navigation = useNavigation();
  const focused = useIsFocused();
  const scheme = useScheme();
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

  if (f.result) {
    return (
      <PostResult
        result={f.result}
        isEdit={f.isEdit && f.editingStatus !== 'draft'}
        feature={props.config.key === 'all' ? undefined : props.config.key}
        mini={props.mini}
      />
    );
  }

  const editPublished = f.isEdit && f.editingStatus !== 'draft';
  const feature = props.config.key === 'all' ? null : props.config.key;
  const title = f.isEdit
    ? t('form.title_edit')
    : feature
      ? t('form.hero_title', { feature: t(`common:feature.${feature}`) })
      : t('form.title_new');
  const subtitle = `${t('form.step', { current: f.step, total: FORM_STEPS })} · ${t(`common:category.${f.category}`)}`;

  return (
    <>
      {/* iOS: vuốt để quay lại không chặn được bằng usePreventRemove → tắt khi đang soạn dở. */}
      <Stack.Screen options={{ gestureEnabled: !f.dirty }} />
      <PageHero
        title={title}
        subtitle={subtitle}
        onBack={f.step > 1 ? f.back : backOrHome}
        right={
          editPublished ? null : (
            <Button
              label={t('form.save_draft')}
              variant="glass"
              size="sm"
              shape="pill"
              disabled={f.busy}
              onPress={() => f.submit('draft')}
            />
          )
        }
      >
        <StepBar step={f.step} />
        {f.step === 1 && !f.isEdit ? (
          <View className="flex-row items-center gap-2 rounded-md border border-on-primary/15 bg-on-primary/10 px-3 py-2">
            <Icon icon={Timer} tone="onPrimary" />
            <Text variant="caption" tone="onPrimary" className="flex-1">
              {t('form.hero_hint')}
            </Text>
          </View>
        ) : null}
      </PageHero>
      <ScrollView
        className="-mx-4 flex-1"
        contentContainerClassName="gap-4 px-4 pb-6 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {f.restored ? (
          <Notice text={t('form.draft_restored')}>
            <Button size="sm" variant="ghost" label={t('form.start_over')} onPress={f.startOver} className="-ml-4" />
          </Notice>
        ) : null}
        {f.step === 1 ? <PhotosStep f={f} /> : f.step === 2 ? <BasicsStep f={f} /> : <DetailsStep f={f} phone={props.phone ?? null} />}
      </ScrollView>
      <FormActions f={f} />
      <BottomSheet open={discardOpen} onClose={() => setDiscardOpen(false)} title={t('form.discard_title')}>
        <Text tone="muted">{t('form.discard_body')}</Text>
        <Col gap={2}>
          <Button label={t('form.discard_confirm')} variant="danger" fullWidth onPress={confirmDiscard} />
          <Button label={t('form.keep_editing')} variant="outline" fullWidth onPress={() => setDiscardOpen(false)} />
        </Col>
      </BottomSheet>
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </>
  );
}

/** Thanh tiến độ 3 vạch trong header xanh (trang trí — số bước đã đọc ở dòng phụ). */
function StepBar({ step }: { step: number }) {
  return (
    <View className="flex-row gap-1.5" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: FORM_STEPS }, (_, i) => (
        <View key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-on-primary' : 'bg-on-primary/30'}`} />
      ))}
    </View>
  );
}

function PhotosStep({ f }: { f: ListingFormState }) {
  const { t } = useTranslation('listing');
  const tipKey = f.formConfig.photosTipKey;
  return (
    <>
      {f.formConfig.privacyNotice ? (
        <Notice variant="bordered" tone="warning" icon={ShieldAlert} title={t('form.privacy_title')} text={t('form.privacy_body')} />
      ) : null}
      <Card>
        <Col gap={3}>
          <SectionHeader
            size="md"
            icon={{ icon: Camera, tone: 'primary' }}
            title={t('form.photos_title')}
            subtitle={t('form.photos_hint', { max: MAX_LISTING_IMAGES })}
          />
          {tipKey ? (
            <Row gap={2} align="start">
              <Icon icon={Sparkles} tone="primary" size={16} />
              <Text variant="caption" tone="muted" className="flex-1">
                {t(tipKey)}
              </Text>
            </Row>
          ) : null}
          <ImagePicker
            items={f.photos}
            max={MAX_LISTING_IMAGES}
            onAdd={f.addPhotos}
            onRemove={f.removePhoto}
            onMakeCover={f.makeCover}
            onRetry={f.retryPhoto}
            disabled={f.busy}
          />
          {f.photosShort ? (
            <Notice tone={f.photoError ? 'danger' : 'info'} text={t('form.photos_min', { min: f.minPhotos })} />
          ) : f.formConfig.photos === 'recommended' && f.photos.length === 0 ? (
            <Notice text={t('form.photos_required')} />
          ) : null}
        </Col>
      </Card>
    </>
  );
}

/** Một ô thông số (attributes.<key>) nối với RHF. */
function AttributeController({ f, field }: { f: ListingFormState; field: AttributeField }) {
  return (
    <Controller
      control={f.form.control}
      name={`attributes.${field.key}`}
      render={({ field: rhf, fieldState }) => (
        <AttributeInput field={field} value={rhf.value} onChange={rhf.onChange} onBlur={rhf.onBlur} error={fieldState.error?.message} />
      )}
    />
  );
}

function BasicsStep({ f }: { f: ListingFormState }) {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const { control } = f.form;
  const priceType = useWatch({ control, name: 'price_type' });
  const { titleHintKey, descriptionHintKey } = f.formConfig;
  return (
    <>
      <Card>
        <Col gap={4}>
          <SectionHeader size="md" icon={{ icon: PencilLine, tone: 'primary' }} title={t('form.basics_title')} />
          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <Input
                label={t('form.title_label')}
                hint={t(titleHintKey ?? 'form.title_hint')}
                maxLength={120}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message ? errorText(fieldState.error.message) : null}
                returnKeyType="next"
              />
            )}
          />
          {f.primaryFields.map((field) => (
            <AttributeController key={field.key} f={f} field={field} />
          ))}
          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <Input
                label={`${t('form.description_label')} (${t('form.optional')})`}
                hint={t(descriptionHintKey ?? 'form.description_hint')}
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
      </Card>
      {f.formConfig.price ? (
        <Card>
          <Col gap={4}>
            <SectionHeader size="md" icon={{ icon: Banknote, tone: 'primary' }} title={t('form.price_title')} />
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
          </Col>
        </Card>
      ) : null}
    </>
  );
}

function DetailsStep({ f, phone }: { f: ListingFormState; phone: string | null }) {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const sites = useSites();
  const { control } = f.form;
  const lang = useWatch({ control, name: 'lang' });
  const site = useWatch({ control, name: 'site' });

  return (
    <>
      <Card>
        <Col gap={4}>
          <SectionHeader
            size="md"
            icon={{ icon: ListChecks, tone: 'primary' }}
            title={t('form.details_title')}
            subtitle={t('form.optional')}
          />
          {f.detailFields.map((field) => (
            <AttributeController key={field.key} f={f} field={field} />
          ))}
          <View className="gap-2" accessibilityRole="radiogroup" accessibilityLabel={t('form.lang_label')}>
            <Text variant="label">{t('form.lang_label')}</Text>
            <Row gap={2} wrap>
              {LOCALES.map((l) => (
                <Chip key={l} label={t(`common:locale.${l}`)} selected={lang === l} onPress={() => f.setField('lang', l)} />
              ))}
            </Row>
          </View>
        </Col>
      </Card>

      <Card>
        <Col gap={4}>
          <SectionHeader size="md" icon={{ icon: MapPin, tone: 'primary' }} title={t('detail.location')} />
          {/* Khu gần nhất: chip từ danh sách sites (mặc định khu trong hồ sơ); bấm lại để bỏ chọn. */}
          <View className="gap-2" accessibilityRole="radiogroup" accessibilityLabel={t('form.site_label')}>
            <Text variant="label">{t('form.site_label')}</Text>
            <Row gap={2} wrap>
              <Chip label={t('form.site_none')} selected={!site} onPress={() => f.setField('site', null)} />
              {(sites.data ?? []).map((s) => (
                <Chip
                  key={s.code}
                  label={s.name}
                  dot="accent"
                  selected={site === s.code}
                  onPress={() => f.setField('site', site === s.code ? null : s.code)}
                />
              ))}
            </Row>
          </View>
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
        </Col>
      </Card>

      <Card>
        <Col gap={3}>
          <SectionHeader size="md" icon={{ icon: Phone, tone: 'primary' }} title={t('form.contact_title')} />
          <Row gap={2} align="start">
            <Icon icon={MessageCircle} tone="primary" />
            <Text className="flex-1">{t('form.contact_chat')}</Text>
          </Row>
          <Row gap={2} align="start">
            <Icon icon={Phone} tone="primary" />
            <Text tone="muted" className="flex-1">
              {phone ? t('form.contact_phone', { phone: formatVnPhone(phone) }) : t('form.contact_no_phone')}
            </Text>
          </Row>
        </Col>
      </Card>

      <Notice variant="bordered" tone="warning" title={t('tip.title')} text={t('form.rules_hint')} />
    </>
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
      <StickyCta elevated>
        <Notice tone="danger" text={errorText('upload_failed')} />
        <Button label={t('form.upload_retry')} fullWidth onPress={f.retryUpload} />
      </StickyCta>
    );
  }

  if (editPublished) {
    return (
      <StickyCta elevated>
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
      <StickyCta elevated>
        <Button label={t('form.next')} fullWidth disabled={f.busy} onPress={f.next} />
      </StickyCta>
    );
  }

  return (
    <StickyCta elevated>
      <Button
        label={f.busy ? busyLabel : t('form.submit')}
        icon={Send}
        variant="accent"
        fullWidth
        loading={f.busy}
        onPress={() => f.submit('publish')}
      />
    </StickyCta>
  );
}

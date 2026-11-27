// Form đăng / sửa yêu cầu gọi thợ (`request/new`, `?id=` để sửa) — các khối thẻ có tiêu đề vạch primary:
// "Loại thợ" (chip 5 loại + gợi ý) → "Tiêu đề & mô tả" → "Ảnh" (ImagePicker, ≤ 4, nén 1280px WebP → bucket request-images) →
// "Địa chỉ" (riêng tư: chỉ thợ được chọn thấy) → "Ngân sách" (từ – đến, không bắt buộc) → "Cần làm khi nào" (chip mức khẩn) →
// nút "Đăng yêu cầu" / "Lưu thay đổi" dính đáy (StickyCta elevated). Thứ tự và chữ khớp web (request-form.tsx).
// React Hook Form + zodResolver(CreateServiceRequestInput của @hp/shared) — lỗi = key errors.*, hiện dưới đúng ô; lỗi server
// (rate_limited 5 / ngày, message_has_phone, banned…) → ô tương ứng / toast. Đăng xong: SuccessScreen → "Xem yêu cầu".
// Sửa: chỉ khi còn mở và CHƯA có báo giá (trigger báo request_has_quotes) — có báo giá thì khoá nút + Notice.
// Khác web (cố ý): chưa chọn vị trí trên bản đồ (chờ key Goong) → lat / lng gửi null; khu mặc định theo hồ sơ (server đặt).
import { zodResolver } from '@hookform/resolvers/zod';
import type { AppError } from '@hp/core';
import { useCreateServiceRequest, useRequestPrivate, useServiceRequest, useSession, useUpdateServiceRequest, useUploadRequestImage } from '@hp/core/react';
import {
  CreateServiceRequestInput,
  type CreateServiceRequestValues,
  LOCALES,
  type Locale,
  newUuid,
  SERVICE_REQUEST_RULES,
  SERVICE_URGENCIES,
  type ServiceTrade,
} from '@hp/shared';
import { tradeArtKey } from '@hp/tokens/category-art';
import { Wrench } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { track } from '@/core/analytics';
import { getLocale } from '@/core/i18n';
import { type PickedImage, pickImages, prepareListingImage } from '@/core/upload';
import { useErrorText } from '@/lib/errors';
import { requestImageUrl } from '@/lib/images';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ImagePicker,
  type ImagePickerItem,
  Input,
  Notice,
  PriceInput,
  Row,
  SectionHeader,
  ServiceGrid,
  ServiceTile,
  Skeleton,
  StickyCta,
  SuccessScreen,
  Text,
  toast,
} from '@/ui';
import { backOrHome, openServiceRequest, openThoTab } from '../navigation';
import { TRADES } from '../trades';

type Photo = ImagePickerItem & { path?: string; picked?: PickedImage };

const toLocale = (value: string): Locale => ((LOCALES as readonly string[]).includes(value) ? (value as Locale) : 'vi');

/** Ô chữ tự do: rỗng → null (Zod: null = không nhập). */
const orNull = (text: string) => (text === '' ? null : text);

export type RequestFormProps = {
  /** Có → sửa yêu cầu này (chủ, chưa có báo giá). */
  requestId?: string;
  /** Loại thợ chọn sẵn khi đăng mới (từ ô loại thợ ở trang chủ mini-app). */
  trade?: ServiceTrade;
};

export function RequestForm({ requestId, trade }: RequestFormProps) {
  const { t } = useTranslation('tho');
  const errorText = useErrorText();
  const { userId } = useSession();
  const editing = !!requestId;
  const existing = useServiceRequest(requestId);
  const privateInfo = useRequestPrivate(requestId, editing);
  const create = useCreateServiceRequest();
  const update = useUpdateServiceRequest();
  const upload = useUploadRequestImage();
  const draftId = useRef(newUuid()).current;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [created, setCreated] = useState<{ id: string } | null>(null);

  const form = useForm<CreateServiceRequestInput, unknown, CreateServiceRequestValues>({
    resolver: zodResolver(CreateServiceRequestInput),
    defaultValues: {
      trade: trade ?? 'electric_plumbing',
      title: '',
      description: null,
      images: [],
      site: null,
      addressText: null,
      lat: null,
      lng: null,
      budgetMin: null,
      budgetMax: null,
      urgency: 'flexible',
      lang: getLocale(),
    },
    mode: 'onTouched',
  });
  const err = (message: string | undefined) => (message ? errorText(message) : null);

  // Sửa: điền sẵn một lần khi yêu cầu + địa chỉ riêng đã tải.
  const prefilled = useRef(false);
  useEffect(() => {
    const r = existing.data;
    if (!editing || prefilled.current || !r || privateInfo.isLoading) return;
    prefilled.current = true;
    form.reset({
      trade: r.trade,
      title: r.title,
      description: r.description,
      images: r.images,
      site: null,
      addressText: privateInfo.data?.address_text ?? null,
      lat: null,
      lng: null,
      budgetMin: r.budget_min,
      budgetMax: r.budget_max,
      urgency: r.urgency,
      lang: toLocale(r.lang),
    });
    setPhotos(r.images.map((path) => ({ key: path, uri: requestImageUrl(path), status: 'done' as const, path })));
  }, [editing, existing.data, privateInfo.data, privateInfo.isLoading, form]);

  const patchPhoto = (key: string, patch: Partial<Photo>) =>
    setPhotos((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const uploadOne = async (key: string, picked: PickedImage, index: number) => {
    if (!userId) return;
    patchPhoto(key, { status: 'uploading' });
    const prepared = await prepareListingImage(picked);
    if ('error' in prepared) {
      patchPhoto(key, { status: 'error' });
      toast.show(errorText(prepared.error), 'danger');
      return;
    }
    try {
      const path = await upload.mutateAsync({ userId, requestId: draftId, index, body: prepared.data.body, contentType: prepared.data.contentType });
      patchPhoto(key, { status: 'done', path });
    } catch (e) {
      patchPhoto(key, { status: 'error' });
      toast.show(errorText((e as AppError).code), 'danger');
    }
  };

  const addPhotos = async () => {
    const picked = await pickImages(SERVICE_REQUEST_RULES.maxImages - photos.length);
    if (picked.length === 0) return;
    const items = picked.map((img, i) => ({ key: `${draftId}-${Date.now()}-${i}`, uri: img.uri, status: 'uploading' as const, picked: img }));
    setPhotos((list) => [...list, ...items]);
    const base = photos.length;
    await Promise.all(items.map((item, i) => uploadOne(item.key, item.picked, base + i)));
  };

  const busy = photos.some((p) => p.status === 'uploading');
  const hasQuotes = editing && (existing.data?.quotes_count ?? 0) > 0;
  const saving = create.isPending || update.isPending;

  const onServerError = (e: AppError, values: CreateServiceRequestValues) => {
    for (const [path, codes] of Object.entries(e.fieldErrors ?? {})) {
      if (path in values) form.setError(path as keyof CreateServiceRequestValues, { type: 'server', message: codes[0] ?? 'invalid_input' });
    }
    if (e.code === 'message_has_phone' || e.code === 'message_profanity') form.setError('title', { type: 'server', message: e.code });
    toast.show(errorText(e.code), 'danger');
  };

  const submit = () => {
    if (saving || busy) return;
    void form.handleSubmit((values) => {
      const images = photos.filter((p) => p.status === 'done' && p.path).map((p) => p.path as string);
      if (editing && requestId) {
        update.mutate(
          {
            id: requestId,
            title: values.title,
            description: values.description,
            images,
            addressText: values.addressText,
            budgetMin: values.budgetMin,
            budgetMax: values.budgetMax,
            urgency: values.urgency,
          },
          {
            onSuccess: () => {
              toast.show(t('form.save'), 'success');
              backOrHome();
            },
            onError: (e) => onServerError(e, values),
          },
        );
        return;
      }
      create.mutate(
        { ...values, images },
        {
          onSuccess: (r) => {
            track('create_request', { request_id: r.id, trade: values.trade, has_images: images.length > 0 });
            setCreated({ id: r.id });
          },
          onError: (e) => onServerError(e, values),
        },
      );
    })();
  };

  if (created) {
    return (
      <SuccessScreen
        icon={Wrench}
        celebrate
        title={t('form.success_title')}
        description={t('form.success_body')}
        primary={{ label: t('form.success_cta'), onPress: () => openServiceRequest(created.id, { replace: true }) }}
        secondary={[{ label: t('tabs.home'), onPress: () => openThoTab('index', { replace: true }) }]}
      />
    );
  }

  if (editing) {
    if (existing.isLoading || privateInfo.isLoading) return <FormSkeleton />;
    if (existing.error) {
      return existing.error.code === 'not_found' ? (
        <EmptyState icon={Wrench} title={t('list.empty_title')} action={{ label: t('list.title'), onPress: backOrHome }} />
      ) : (
        <ErrorState code={existing.error.code} onRetry={() => void existing.refetch()} />
      );
    }
  }

  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="gap-5 pb-6 pt-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {hasQuotes ? <Notice tone="warning" text={t('form.edit_locked')} /> : null}

        <Controller
          control={form.control}
          name="trade"
          render={({ field }) => (
            <Block title={t('form.trade')}>
              <View accessibilityLabel={t('form.trade')}>
                <ServiceGrid columns={3}>
                  {TRADES.map((code) => (
                    <View key={code} className={editing ? 'flex-1 opacity-60' : 'flex-1'}>
                      <ServiceTile
                        service="goiTho"
                        art={tradeArtKey(code)}
                        label={t(`trade.${code}`)}
                        selected={field.value === code}
                        onPress={editing ? undefined : () => field.onChange(code)}
                      />
                    </View>
                  ))}
                </ServiceGrid>
              </View>
              <Text variant="caption" tone="muted">
                {t(`trade_hint.${field.value}`)}
              </Text>
            </Block>
          )}
        />

        <Block title={t('form.title')}>
          <Controller
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <Input
                label={t('form.title')}
                placeholder={t('form.title_placeholder')}
                maxLength={SERVICE_REQUEST_RULES.titleMax}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={err(fieldState.error?.message)}
                editable={!hasQuotes}
              />
            )}
          />
          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Input
                label={t('form.description')}
                placeholder={t('form.description_placeholder')}
                multiline
                textAlignVertical="top"
                maxLength={SERVICE_REQUEST_RULES.descriptionMax}
                value={field.value ?? ''}
                onChangeText={(text) => field.onChange(orNull(text))}
                onBlur={field.onBlur}
                error={err(fieldState.error?.message)}
                editable={!hasQuotes}
                className="min-h-28"
              />
            )}
          />
        </Block>

        <Block title={t('form.photos')} subtitle={t('form.photos_hint', { max: SERVICE_REQUEST_RULES.maxImages })}>
          <ImagePicker
            items={photos}
            max={SERVICE_REQUEST_RULES.maxImages}
            cover={false}
            disabled={saving || hasQuotes}
            onAdd={() => void addPhotos()}
            onRemove={(key) => setPhotos((list) => list.filter((p) => p.key !== key))}
            onRetry={(key) => {
              const p = photos.find((x) => x.key === key);
              if (p?.picked) void uploadOne(key, p.picked, photos.indexOf(p));
            }}
          />
        </Block>

        <Block title={t('form.address')}>
          <Controller
            control={form.control}
            name="addressText"
            render={({ field, fieldState }) => (
              <Input
                label={t('form.address')}
                placeholder={t('form.address_placeholder')}
                hint={t('form.address_private')}
                maxLength={SERVICE_REQUEST_RULES.addressMax}
                value={field.value ?? ''}
                onChangeText={(text) => field.onChange(orNull(text))}
                onBlur={field.onBlur}
                error={err(fieldState.error?.message)}
              />
            )}
          />
        </Block>

        <Block title={t('form.budget')}>
          <Row gap={3} align="start">
            <View className="flex-1">
              <Controller
                control={form.control}
                name="budgetMin"
                render={({ field, fieldState }) => (
                  <PriceInput
                    label={t('form.budget_min')}
                    value={field.value ?? null}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={err(fieldState.error?.message)}
                    editable={!hasQuotes}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={form.control}
                name="budgetMax"
                render={({ field, fieldState }) => (
                  <PriceInput
                    label={t('form.budget_max')}
                    value={field.value ?? null}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={err(fieldState.error?.message)}
                    editable={!hasQuotes}
                  />
                )}
              />
            </View>
          </Row>
        </Block>

        <Controller
          control={form.control}
          name="urgency"
          render={({ field }) => (
            <Block title={t('form.urgency')}>
              <View accessibilityLabel={t('form.urgency')}>
                <Row gap={2} wrap>
                  {SERVICE_URGENCIES.map((u) => (
                    <Chip key={u} label={t(`urgency.${u}`)} selected={field.value === u} disabled={hasQuotes} onPress={() => field.onChange(u)} />
                  ))}
                </Row>
              </View>
            </Block>
          )}
        />
      </ScrollView>
      <StickyCta elevated>
        <Button
          label={t(editing ? 'form.save' : 'form.submit')}
          variant="accent"
          fullWidth
          loading={saving}
          disabled={busy || hasQuotes}
          onPress={submit}
        />
      </StickyCta>
    </>
  );
}

function Block({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <SectionHeader title={title} subtitle={subtitle} bar="primary" />
      <Card className="gap-3">{children}</Card>
    </View>
  );
}

function FormSkeleton() {
  return (
    <View className="gap-5 pt-4">
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
    </View>
  );
}

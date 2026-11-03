// Góp sân mới (mở từ ô Sân của form tạo kèo): tên sân → môn chơi (chọn sẵn môn đang tạo kèo) → địa chỉ → giá tham khảo
// mỗi giờ → SĐT của sân. React Hook Form + zodResolver(ContributeVenueInput của @hp/shared) — lỗi = key errors.*, hiện
// dưới đúng ô; lỗi server (rate_limited, phone_invalid, forbidden…) → ô tương ứng / toast. Sân mới ở trạng thái chờ
// duyệt (chưa hiện trong danh sách chọn) → gửi xong báo cảm ơn rồi quay lại form kèo (nội dung đang soạn còn nguyên).
// Chưa có bản đồ (chờ key Goong): lat / lng gửi null.
import { zodResolver } from '@hookform/resolvers/zod';
import type { AppError } from '@hp/core';
import { useContributeVenue } from '@hp/core/react';
import { ContributeVenueInput, type ContributeVenueValues, GROUP_SUB_KINDS, type GroupSubKind } from '@hp/shared';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useErrorText } from '@/lib/errors';
import { Button, Chip, Header, Input, Notice, PriceInput, Row, StickyCta, Text, toast } from '@/ui';
import { backOrHome } from '../navigation';

type SportCode = GroupSubKind<'sport'>;

const isSport = (v: string | undefined): v is SportCode => !!v && (GROUP_SUB_KINDS.sport as readonly string[]).includes(v);

/** Ô chữ tự do: rỗng → null (Zod: null = không nhập). */
const orNull = (text: string) => (text === '' ? null : text);

export function ContributeVenueForm({ sport }: { sport?: string }) {
  const { t } = useTranslation('group');
  const errorText = useErrorText();
  const contribute = useContributeVenue();
  const form = useForm<ContributeVenueInput, unknown, ContributeVenueValues>({
    resolver: zodResolver(ContributeVenueInput),
    defaultValues: { name: '', sports: isSport(sport) ? [sport] : [], address_text: null, lat: null, lng: null, price_ref: null, phone: null },
    mode: 'onTouched',
  });
  const err = (message: string | undefined) => (message ? errorText(message) : null);

  const submit = () => {
    if (contribute.isPending) return;
    void form.handleSubmit((values) =>
      contribute.mutate(values, {
        onSuccess: () => {
          toast.show(t('venue.submitted'), 'success');
          backOrHome();
        },
        onError: (e: AppError) => {
          for (const [path, codes] of Object.entries(e.fieldErrors ?? {})) {
            if (path in values) form.setError(path as keyof ContributeVenueValues, { type: 'server', message: codes[0] ?? 'invalid_input' });
          }
          if (e.code === 'phone_invalid') form.setError('phone', { type: 'server', message: e.code });
          toast.show(errorText(e.code), 'danger');
        },
      }),
    )();
  };

  return (
    <>
      <Header title={t('venue.contribute_title')} back onBack={backOrHome} />
      <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-6" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Notice text={t('venue.contribute_hint')} />

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              label={t('venue.name_label')}
              placeholder={t('form.venue_placeholder')}
              maxLength={120}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={err(fieldState.error?.message)}
            />
          )}
        />

        <Controller
          control={form.control}
          name="sports"
          render={({ field, fieldState }) => {
            const selected = field.value;
            const toggle = (s: SportCode) => {
              field.onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);
              field.onBlur();
            };
            return (
              <View className="gap-2" accessibilityLabel={t('venue.sports_label')}>
                <Text variant="label">{t('venue.sports_label')}</Text>
                <Row gap={2} wrap>
                  {GROUP_SUB_KINDS.sport.map((s) => (
                    <Chip key={s} label={t(`sub_kind.${s}`)} selected={selected.includes(s)} onPress={() => toggle(s)} />
                  ))}
                </Row>
                {fieldState.error?.message ? (
                  <Text variant="caption" tone="danger" accessibilityRole="alert">
                    {errorText(fieldState.error.message)}
                  </Text>
                ) : null}
              </View>
            );
          }}
        />

        <Controller
          control={form.control}
          name="address_text"
          render={({ field, fieldState }) => (
            <Input
              label={`${t('venue.address_label')} (${t('form.optional')})`}
              maxLength={200}
              value={field.value ?? ''}
              onChangeText={(text) => field.onChange(orNull(text))}
              onBlur={field.onBlur}
              error={err(fieldState.error?.message)}
            />
          )}
        />

        <Controller
          control={form.control}
          name="price_ref"
          render={({ field, fieldState }) => (
            <PriceInput
              label={`${t('venue.price_label')} (${t('form.optional')})`}
              value={field.value ?? null}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={err(fieldState.error?.message)}
            />
          )}
        />

        <Controller
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <Input
              label={`${t('venue.phone_label')} (${t('form.optional')})`}
              keyboardType="phone-pad"
              autoComplete="off"
              maxLength={16}
              value={field.value ?? ''}
              onChangeText={(text) => field.onChange(orNull(text))}
              onBlur={field.onBlur}
              error={err(fieldState.error?.message)}
            />
          )}
        />
      </ScrollView>
      <StickyCta>
        <Button label={t('venue.submit')} fullWidth loading={contribute.isPending} onPress={submit} />
      </StickyCta>
    </>
  );
}

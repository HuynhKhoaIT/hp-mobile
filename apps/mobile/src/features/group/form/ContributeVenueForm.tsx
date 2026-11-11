// Góp sân mới (mở từ ô Sân của form tạo kèo) — style Stitch "Đóng góp sân thể thao mới (ContributeVenueForm)", cùng kiểu
// GroupForm: header xanh (ContributeVenueHero = PageHero: quay lại trong mờ, ô icon dịch vụ, tiêu đề + dòng phụ) → các khối
// thẻ có tiêu đề vạch primary: "Môn chơi" (chip, chọn nhiều, chọn sẵn môn đang tạo kèo) → "Tên & địa chỉ sân" → "Giá &
// liên hệ" (giá tham khảo mỗi giờ + SĐT của sân, công khai khi duyệt) → hộp "sau khi gửi" (chờ kiểm duyệt, khu theo hồ sơ,
// 5 sân / 24 giờ) → nút "Gửi duyệt" dính đáy (StickyCta elevated, accent như nút đăng kèo). Thứ tự và chữ khớp web
// (contribute-venue-dialog.tsx).
// React Hook Form + zodResolver(ContributeVenueInput của @hp/shared) — lỗi = key errors.*, hiện dưới đúng ô; lỗi server
// (rate_limited, phone_invalid, forbidden…) → ô tương ứng / toast. Sân mới ở trạng thái chờ duyệt (chưa hiện trong danh
// sách chọn) → gửi xong báo cảm ơn rồi quay lại form kèo (nội dung đang soạn còn nguyên). Chưa có bản đồ (chờ key Goong):
// lat / lng gửi null.
// Khác Stitch (cố ý): không "+50 điểm tín nhiệm" / huy hiệu "Đóng góp tích cực" (không có hệ điểm thưởng), không chọn xã /
// khu (server đặt khu theo hồ sơ), không mốc công nghiệp gần sân, quy mô sân, khung giờ theo ca, tiện ích, ảnh sân, số Zalo,
// vai trò người gửi (bảng venues không có các cột đó), không hứa "duyệt trong 1–2 giờ" (không có cam kết thời gian), không
// môn bi-a / bóng chuyền / bóng bàn (danh mục môn chỉ có bóng đá, cầu lông, pickleball).
import { zodResolver } from '@hookform/resolvers/zod';
import type { AppError } from '@hp/core';
import { useContributeVenue } from '@hp/core/react';
import { ContributeVenueInput, type ContributeVenueValues, GROUP_SUB_KINDS, type GroupSubKind } from '@hp/shared';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { useErrorText } from '@/lib/errors';
import {
  Button,
  Card,
  Chip,
  Input,
  Notice,
  PageHero,
  PriceInput,
  Row,
  SectionHeader,
  type ServiceKey,
  StickyCta,
  Text,
  toast,
  useScheme,
} from '@/ui';
import { backOrHome } from '../navigation';

type SportCode = GroupSubKind<'sport'>;

const isSport = (v: string | undefined): v is SportCode => !!v && (GROUP_SUB_KINDS.sport as readonly string[]).includes(v);

/** Ô chữ tự do: rỗng → null (Zod: null = không nhập). */
const orNull = (text: string) => (text === '' ? null : text);

/**
 * Header xanh của màn góp sân (dùng cả khi đang tải phiên / chưa đăng nhập để màn không nhảy). Header tràn lên vùng trạng
 * thái → chữ thanh trạng thái sáng khi màn đang mở (như GroupFormHero).
 */
export function ContributeVenueHero({ service }: { service?: ServiceKey }) {
  const { t } = useTranslation('group');
  const focused = useIsFocused();
  const scheme = useScheme();
  return (
    <>
      <PageHero title={t('venue.contribute_title')} subtitle={t('venue.contribute_subtitle')} service={service} onBack={backOrHome} />
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </>
  );
}

/** Một khối của form: tiêu đề có vạch primary (+ dòng phụ) → nội dung trong thẻ (giống FormBlock của GroupForm). */
function VenueBlock({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <SectionHeader title={title} subtitle={subtitle} bar="primary" size="md" />
      <Card className="gap-4">{children}</Card>
    </View>
  );
}

export function ContributeVenueForm({ sport, service }: { sport?: string; service?: ServiceKey }) {
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
      <ContributeVenueHero service={service} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 pb-6 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
              <VenueBlock title={t('venue.sports_label')} subtitle={t('venue.sports_hint')}>
                <View accessibilityLabel={t('venue.sports_label')}>
                  <Row gap={2} wrap>
                    {GROUP_SUB_KINDS.sport.map((s) => (
                      <Chip key={s} label={t(`sub_kind.${s}`)} selected={selected.includes(s)} onPress={() => toggle(s)} />
                    ))}
                  </Row>
                </View>
                {fieldState.error?.message ? (
                  <Text variant="caption" tone="danger" accessibilityRole="alert">
                    {errorText(fieldState.error.message)}
                  </Text>
                ) : null}
              </VenueBlock>
            );
          }}
        />

        <VenueBlock title={t('venue.section_place')}>
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
            name="address_text"
            render={({ field, fieldState }) => (
              <Input
                label={`${t('venue.address_label')} (${t('form.optional')})`}
                placeholder={t('venue.address_placeholder')}
                multiline
                textAlignVertical="top"
                maxLength={200}
                value={field.value ?? ''}
                onChangeText={(text) => field.onChange(orNull(text))}
                onBlur={field.onBlur}
                error={err(fieldState.error?.message)}
                className="min-h-20"
              />
            )}
          />
        </VenueBlock>

        <VenueBlock title={t('venue.section_contact')} subtitle={t('form.optional')}>
          <Controller
            control={form.control}
            name="price_ref"
            render={({ field, fieldState }) => (
              <PriceInput
                label={t('venue.price_label')}
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
                label={t('venue.phone_label')}
                hint={t('venue.phone_hint')}
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
        </VenueBlock>

        <Notice variant="bordered" title={t('venue.contribute_hint')} text={t('venue.review_body')} />
      </ScrollView>
      <StickyCta elevated>
        <Button label={t('venue.submit')} variant="accent" fullWidth loading={contribute.isPending} onPress={submit} />
      </StickyCta>
    </>
  );
}

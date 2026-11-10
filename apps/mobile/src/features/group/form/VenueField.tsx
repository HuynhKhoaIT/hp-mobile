// Ô "Sân" của form tạo kèo (config.form.place = 'venue') — ba trạng thái:
//   đã chọn sân: thẻ sân (tên, địa chỉ, giá tham khảo, môn) + "Đổi sân";
//   danh sách: ô tìm sân (bấm Tìm mới gọi server) → sân đã duyệt theo môn đang chọn + khu của mình → "Sân khác (tự nhập)"
//     và "Góp sân mới" (màn riêng, chờ kiểm duyệt). Đang tải → dòng chờ; lỗi → thử lại gọn; rỗng → gợi ý tự gõ / góp sân;
//   tự nhập: ô chữ tên sân (venue_id null) + "Chọn sân" để quay lại danh sách.
// Danh sách nằm ngay trong form (không mở sheet) để cuộn / bàn phím đi cùng form.
import type { Venue } from '@hp/core';
import { useMyProfile } from '@hp/core/react';
import { GROUP_RULES } from '@hp/shared';
import { Check, MapPin, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useErrorText } from '@/lib/errors';
import { formatDistance, formatMoney } from '@/lib/format';
import { Badge, Button, Card, ErrorState, Icon, Input, Row, SearchBar, Skeleton, Text } from '@/ui';
import { useVenuePicker } from '../hooks';
import { openContributeVenue } from '../navigation';
import type { GroupFormState, GroupVenue } from './useGroupForm';

export function VenueField({ f }: { f: GroupFormState }) {
  const { t } = useTranslation('group');
  const errorText = useErrorText();
  const { control } = f.form;
  const venue = useWatch({ control, name: 'venue' });
  const subKind = useWatch({ control, name: 'sub_kind' });
  const { errors } = useFormState({ control, name: ['origin_text', 'venue'] });
  // Mở lại nháp có tên sân gõ tay (không có venue) → vào thẳng chế độ tự nhập.
  const [manual, setManual] = useState(() => !f.form.getValues('venue') && !!f.form.getValues('origin_text').trim());
  const me = useMyProfile();
  const picker = useVenuePicker({ sport: subKind, site: me.data?.site, enabled: !venue && !manual });
  const errorCode = errors.venue?.message ?? errors.origin_text?.message;
  const error = errorCode ? errorText(errorCode) : null;

  return (
    <View className="gap-2">
      <Text variant="label">{t('form.venue_label')}</Text>
      {venue ? (
        <SelectedVenue
          venue={venue}
          onChange={() => {
            f.clearVenue();
            setManual(false);
          }}
        />
      ) : manual ? (
        <>
          <Controller
            control={control}
            name="origin_text"
            render={({ field }) => (
              <Input
                accessibilityLabel={t('form.venue_label')}
                placeholder={t('form.venue_placeholder')}
                maxLength={GROUP_RULES.placeMax}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={error}
              />
            )}
          />
          <Button
            size="sm"
            variant="ghost"
            label={t('venue.pick_title')}
            className="-ml-4 self-start"
            onPress={() => {
              f.clearVenue();
              setManual(false);
            }}
          />
        </>
      ) : (
        <>
          <SearchBar
            value={picker.input}
            onChangeText={picker.setInput}
            onSubmit={picker.submit}
            placeholder={t('venue.search_placeholder')}
          />
          {picker.isLoading ? (
            <View className="gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-md" />
              ))}
            </View>
          ) : picker.isError ? (
            <ErrorState compact code={picker.errorCode} onRetry={picker.refetch} />
          ) : picker.items.length === 0 ? (
            <Text tone="muted">{t('venue.empty')}</Text>
          ) : (
            <View className="gap-2" accessibilityLabel={t('venue.pick_title')}>
              {picker.items.map((v) => (
                <VenueRow key={v.id} venue={v} onPress={() => f.pickVenue(v)} />
              ))}
            </View>
          )}
          {error ? (
            <Text variant="caption" tone="danger" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Row gap={2} wrap>
            <Button
              size="sm"
              variant="outline"
              label={t('venue.other_place')}
              onPress={() => {
                f.clearVenue();
                setManual(true);
              }}
            />
            <Button size="sm" variant="ghost" icon={Plus} label={t('venue.contribute')} onPress={() => openContributeVenue(subKind)} />
          </Row>
        </>
      )}
    </View>
  );
}

/** Dòng phụ của sân: giá tham khảo · khoảng cách (khi có). */
function useVenueMeta() {
  const { t } = useTranslation('group');
  return (v: { price_ref: number | null; distance_m?: number | null }) =>
    [
      v.price_ref ? t('venue.price_ref', { price: formatMoney(v.price_ref) }) : null,
      v.distance_m != null ? t('venue.distance', { distance: formatDistance(v.distance_m) }) : null,
    ]
      .filter(Boolean)
      .join(' · ');
}

function VenueRow({ venue: v, onPress }: { venue: Venue; onPress: () => void }) {
  const { t } = useTranslation('group');
  const meta = useVenueMeta()({ price_ref: v.price_ref ?? null, distance_m: v.distance_m ?? null });
  const sports = v.sports.map((s) => t(`sub_kind.${s}`)).join(' · ');
  return (
    <Card onPress={onPress} accessibilityLabel={[v.name, v.address_text, sports, meta].filter(Boolean).join(', ')}>
      <View className="flex-row items-start gap-3">
        <Icon icon={MapPin} service="sport" />
        <View className="flex-1 gap-0.5">
          <Text variant="label" numberOfLines={2}>
            {v.name}
          </Text>
          {v.address_text ? (
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {v.address_text}
            </Text>
          ) : null}
          <Text variant="caption" numberOfLines={1}>
            {sports}
          </Text>
          {meta ? (
            <Text variant="caption" weight="medium" tone="accent" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function SelectedVenue({ venue: v, onChange }: { venue: GroupVenue; onChange: () => void }) {
  const { t } = useTranslation('group');
  const meta = useVenueMeta()({ price_ref: v.price_ref });
  return (
    <Card className="gap-2 border border-primary">
      <Row gap={2}>
        <Icon icon={Check} tone="success" />
        <Text variant="caption" tone="success" weight="medium">
          {t('venue.selected')}
        </Text>
      </Row>
      <Text variant="label">{v.name}</Text>
      {v.address_text ? (
        <Text variant="caption" tone="muted">
          {v.address_text}
        </Text>
      ) : null}
      {meta ? (
        <Text variant="caption" weight="medium" tone="accent">
          {meta}
        </Text>
      ) : null}
      <Row gap={1} wrap>
        {v.sports.map((s) => (
          <Badge key={s} label={t(`sub_kind.${s}`)} />
        ))}
      </Row>
      <Button size="sm" variant="outline" label={t('venue.change')} onPress={onChange} className="self-start" />
    </Card>
  );
}

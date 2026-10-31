// Một trường `attributes` của form đăng tin, dựng từ ATTRIBUTE_FIELDS (@hp/shared) — không khai báo trường theo
// từng tính năng: enum → chip (`attr_value.<key>.<v>`), int → ô số + đơn vị, money → PriceInput, bool → ô tích,
// text → ô chữ, datetime (lost_at) → chip ngày "hôm nay … 6 ngày trước" (không cần thư viện chọn ngày).
import type { AttributeField, AttributeValue } from '@hp/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useErrorText } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { Checkbox, Chip, Input, PriceInput, Row, Text } from '@/ui';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_BACK = 7;
const INT_SUFFIX = { m2: 'form.suffix.m2', km: 'form.suffix.km', months: 'form.suffix.months', people: 'form.suffix.people' } as const;

export type AttributeInputProps = {
  field: AttributeField;
  value: unknown;
  onChange: (value: AttributeValue | undefined) => void;
  onBlur?: () => void;
  /** Mã lỗi (errors.*). */
  error?: string;
};

/** Ngày "cách đây n ngày", giờ tròn — đủ cho "mất / nhặt lúc nào" mà không giả vờ chính xác tới phút. */
function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * DAY_MS);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

export function AttributeInput({ field, value, onChange, onBlur, error }: AttributeInputProps) {
  const { t } = useTranslation('listing');
  const errorText = useErrorText();
  const label = t(`attr.${field.key}`);
  const message = error ? errorText(error) : null;

  switch (field.kind) {
    case 'enum':
      return (
        <ChipField label={label} error={message}>
          {field.options.map((opt) => (
            <Chip
              key={opt}
              label={t(`attr_value.${field.key}.${opt}`)}
              selected={value === opt}
              onPress={() => onChange(value === opt ? undefined : opt)}
            />
          ))}
        </ChipField>
      );
    case 'int':
      return (
        <Input
          label={label}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={field.unit === 'year' ? 4 : 8}
          value={typeof value === 'number' ? String(value) : ''}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, '');
            onChange(digits ? Number(digits) : undefined);
          }}
          onBlur={onBlur}
          suffix={field.unit && field.unit !== 'year' ? t(INT_SUFFIX[field.unit]) : undefined}
          error={message}
        />
      );
    case 'money':
      return (
        <PriceInput
          label={label}
          value={typeof value === 'number' ? value : null}
          onChange={(v) => onChange(v ?? undefined)}
          onBlur={onBlur}
          error={message}
        />
      );
    case 'bool':
      return (
        <Checkbox checked={value === true} onChange={(checked) => onChange(checked)} accessibilityLabel={label}>
          <Text>{label}</Text>
        </Checkbox>
      );
    case 'text':
      return (
        <Input
          label={label}
          maxLength={200}
          value={typeof value === 'string' ? value : ''}
          onChangeText={(text) => onChange(text)}
          onBlur={onBlur}
          error={message}
        />
      );
    case 'datetime': {
      const days = Array.from({ length: DAYS_BACK }, (_, i) => daysAgo(i));
      const current = typeof value === 'string' ? formatDate(value) : null;
      const matched = current !== null && days.some((d) => formatDate(d) === current);
      return (
        <ChipField label={label} error={message}>
          {current && !matched ? <Chip label={current} selected onPress={() => onChange(undefined)} /> : null}
          {days.map((iso, i) => {
            const selected = current !== null && formatDate(iso) === current;
            const text = i === 0 ? t('form.today') : i === 1 ? t('form.yesterday') : formatDate(iso);
            return <Chip key={iso} label={text} selected={selected} onPress={() => onChange(selected ? undefined : iso)} />;
          })}
        </ChipField>
      );
    }
  }
}

function ChipField({ label, error, children }: { label: string; error: string | null; children: ReactNode }) {
  return (
    <View className="gap-2" accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text variant="label">{label}</Text>
      <Row gap={2} wrap>
        {children}
      </Row>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

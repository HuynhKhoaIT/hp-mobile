// Bảng thông số tin theo readAttributes (@hp/shared — cùng nguồn với Zod và web): nhãn `attr.<key>`,
// giá trị enum `attr_value.<key>.<value>`, có / không, số kèm đơn vị, tiền (VND), ngày giờ (giờ Việt Nam).
import type { PublicListing } from '@hp/core';
import { type AttributeField, type AttributeValue, readAttributes } from '@hp/shared';
import { Fragment, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { Card, Divider, SectionHeader, Text } from '@/ui';

const MONEY_PER: Record<string, string> = {
  kwh: 'unit.per_kwh',
  month: 'card.per_month',
  hour: 'card.per_hour',
  day: 'card.per_day',
};

function useAttributeText() {
  const { t } = useTranslation('listing');
  return useCallback(
    (field: AttributeField, value: AttributeValue): string => {
      switch (field.kind) {
        case 'enum':
          return t(`attr_value.${field.key}.${String(value)}`);
        case 'bool':
          return t(value ? 'attr_value.bool.yes' : 'attr_value.bool.no');
        case 'int': {
          const n = Number(value);
          if (field.unit === 'year') return t('unit.year', { value: String(n) });
          if (field.unit === 'm2' || field.unit === 'km') return t(`unit.${field.unit}`, { value: formatNumber(n) });
          if (field.unit === 'months' || field.unit === 'people') return t(`unit.${field.unit}`, { count: n });
          return formatNumber(n);
        }
        case 'money': {
          const price = formatMoney(Number(value));
          return field.per ? t(MONEY_PER[field.per], { price }) : price;
        }
        case 'datetime':
          return formatDate(String(value), 'datetime');
        case 'text':
          return String(value);
      }
    },
    [t],
  );
}

export function AttributeList({ listing }: { listing: Pick<PublicListing, 'category' | 'attributes'> }) {
  const { t } = useTranslation('listing');
  const text = useAttributeText();
  const rows = readAttributes(listing.category, listing.attributes);
  if (rows.length === 0) return null;
  return (
    <View className="gap-2">
      <SectionHeader title={t('detail.attributes')} />
      <Card>
        {rows.map(({ field, value }, i) => (
          <Fragment key={field.key}>
            {i > 0 ? <Divider /> : null}
            <View className="min-h-11 flex-row items-start gap-3 py-2">
              <Text tone="muted" className="flex-1">
                {t(`attr.${field.key}`)}
              </Text>
              <Text variant="label" selectable className="flex-1 text-right">
                {text(field, value)}
              </Text>
            </View>
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

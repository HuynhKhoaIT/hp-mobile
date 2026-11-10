// Thông tin thêm theo GROUP_ATTRIBUTE_FIELDS[kind] (@hp/shared — cùng nguồn với Zod và web): nhãn `group.attr.<key>`,
// enum `group.attr_value.<key>.<value>`, có / không dùng chung ns listing. Không có trường nào → ẩn cả khối.
import type { PublicGroup } from '@hp/core';
import { GROUP_ATTRIBUTE_FIELDS } from '@hp/shared';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card, Divider, SectionHeader, Text } from '@/ui';

type Row = { key: string; value: string };

/** attributes (jsonb) → các dòng đã dịch, theo thứ tự trường của kind; bỏ trường trống / sai kiểu. */
function useAttributeRows(group: Pick<PublicGroup, 'kind' | 'attributes'>): Row[] {
  const { t } = useTranslation('group');
  const raw = group.attributes && typeof group.attributes === 'object' && !Array.isArray(group.attributes) ? group.attributes : {};
  return GROUP_ATTRIBUTE_FIELDS[group.kind].flatMap((field): Row[] => {
    const v = raw[field.key];
    if (field.kind === 'bool' && typeof v === 'boolean') {
      return [{ key: field.key, value: t(v ? 'listing:attr_value.bool.yes' : 'listing:attr_value.bool.no') }];
    }
    if (field.kind === 'enum' && typeof v === 'string' && (field.options as readonly string[]).includes(v)) {
      return [{ key: field.key, value: t(`attr_value.${field.key}.${v}`) }];
    }
    if (field.kind === 'text' && typeof v === 'string' && v.trim()) return [{ key: field.key, value: v.trim() }];
    return [];
  });
}

export function GroupAttributeList({ group }: { group: Pick<PublicGroup, 'kind' | 'attributes'> }) {
  const { t } = useTranslation('group');
  const rows = useAttributeRows(group);
  if (rows.length === 0) return null;
  return (
    <View className="gap-2">
      <SectionHeader title={t('detail.attributes')} />
      <Card>
        {rows.map((row, i) => (
          <Fragment key={row.key}>
            {i > 0 ? <Divider /> : null}
            <View className="min-h-11 flex-row items-start gap-3 py-2">
              <Text tone="muted" className="flex-1">
                {t(`attr.${row.key}`)}
              </Text>
              <Text variant="label" selectable className="flex-1 text-right">
                {row.value}
              </Text>
            </View>
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

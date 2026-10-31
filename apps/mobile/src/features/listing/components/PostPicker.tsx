// Bước 0 của "Đăng nhanh": chọn loại tin (4 tính năng Listing) rồi danh mục (chip) → form của danh mục đó.
// Dùng ở tab Đăng và màn listing/new (đặt sẵn tính năng khi đến từ danh sách của tính năng). Khớp web.
import { LISTING_FEATURES, type ListingCategory, type ListingFeature } from '@hp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { requireAuth } from '@/core/auth';
import { Chip, Col, Row, SectionHeader, ServiceTile, Text } from '@/ui';
import { openPostForm } from '../navigation';

const FEATURE_ORDER = Object.keys(LISTING_FEATURES) as ListingFeature[];

export function PostPicker({ initialFeature }: { initialFeature?: ListingFeature }) {
  const { t } = useTranslation('listing');
  const [feature, setFeature] = useState<ListingFeature | null>(initialFeature ?? null);
  const pick = (category: ListingCategory) => requireAuth(() => openPostForm(category));

  return (
    <Col gap={5}>
      <Col gap={3}>
        <Text variant="heading" accessibilityRole="header">
          {t('form.choose_feature')}
        </Text>
        {/* Lưới 2 cột: ô w-1/2 + p-1.5, khung -m-1.5 → khoảng cách ô 12. */}
        <View className="-m-1.5 flex-row flex-wrap">
          {FEATURE_ORDER.map((f) => (
            <View key={f} className="w-1/2 p-1.5">
              <ServiceTile service={f} label={t(`common:feature.${f}`)} selected={feature === f} onPress={() => setFeature(f)} />
            </View>
          ))}
        </View>
      </Col>
      {feature ? (
        <Col gap={3}>
          <SectionHeader title={t('form.choose_category')} />
          <Row gap={2} wrap>
            {LISTING_FEATURES[feature].map((c) => (
              <Chip key={c} label={t(`common:category.${c}`)} onPress={() => pick(c)} />
            ))}
          </Row>
        </Col>
      ) : null}
    </Col>
  );
}

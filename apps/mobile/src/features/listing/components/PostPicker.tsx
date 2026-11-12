// Bước 0 của "Đăng nhanh": chọn loại tin (4 tính năng Listing) rồi danh mục → form của danh mục đó (khách → đăng nhập trước).
// Dùng ở tab Đăng và màn listing/new (đặt sẵn tính năng khi đến từ danh sách của tính năng). Khớp web (FeaturePicker).
// Style Stitch L2: danh mục là lưới thẻ 2 cột — ô icon (config.categoryIcons, nền màu dịch vụ nhạt) + tên danh mục đậm +
// gợi ý ví dụ (`form.category_hint.<code>`); đồ thất lạc vì thế thành 2 thẻ lớn "Tôi làm mất / Tôi nhặt được".
// Config các tính năng do route truyền vào (engine không import feature khác).
// Mở từ mini-app (`mini`): tính năng đã cố định → chỉ lưới danh mục của nó; chọn danh mục giữ `mini` cho form và thay
// (replace) màn chọn → stack chỉ còn mini-app + form: "Xem tin" / "Đăng tin khác" ở màn kết quả không quay về bộ chọn cũ.
import { LISTING_FEATURES, type ListingCategory, type ListingFeature } from '@hp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { requireAuth } from '@/core/auth';
import { Card, Col, Icon, SectionHeader, SERVICE, ServiceTile, Text } from '@/ui';
import { type MiniSlug, openPostForm } from '../navigation';
import type { ListingFeatureConfig } from '../types';

const FEATURE_ORDER = Object.keys(LISTING_FEATURES) as ListingFeature[];

export type PostPickerProps = {
  /** Config 4 tính năng (registry features/configs) — icon danh mục. */
  configs: Record<ListingFeature, ListingFeatureConfig>;
  initialFeature?: ListingFeature;
  /** Luồng đăng của mini-app (slug) — khoá tính năng = initialFeature. */
  mini?: MiniSlug;
};

export function PostPicker({ configs, initialFeature, mini }: PostPickerProps) {
  const { t } = useTranslation('listing');
  const [feature, setFeature] = useState<ListingFeature | null>(initialFeature ?? null);
  const locked = !!mini && !!initialFeature;
  const pick = (category: ListingCategory) => requireAuth(() => openPostForm(category, { mini, replace: !!mini }));

  return (
    <Col gap={5}>
      {locked ? null : (
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
      )}
      {feature ? (
        <Col gap={3}>
          <SectionHeader title={t('form.choose_category')} bar="accent" />
          <View className="-m-1.5 flex-row flex-wrap">
            {LISTING_FEATURES[feature].map((c) => (
              <View key={c} className="w-1/2 p-1.5">
                <CategoryCard feature={feature} category={c} config={configs[feature]} onPress={() => pick(c)} />
              </View>
            ))}
          </View>
        </Col>
      ) : null}
    </Col>
  );
}

/** Thẻ một danh mục: ô icon size-10 rounded-md nền dịch vụ nhạt → tên (2 dòng, không cắt) → gợi ý text-sm muted. */
function CategoryCard({
  feature,
  category,
  config,
  onPress,
}: {
  feature: ListingFeature;
  category: ListingCategory;
  config: ListingFeatureConfig;
  onPress: () => void;
}) {
  const { t } = useTranslation('listing');
  const name = t(`common:category.${category}`);
  const hint = t(`form.category_hint.${category}`);
  return (
    <Card onPress={onPress} accessibilityLabel={`${name}. ${hint}`} className="min-h-32 gap-2">
      <View className={`size-10 items-center justify-center rounded-md ${SERVICE[feature].soft}`}>
        <Icon icon={config.categoryIcons?.[category] ?? SERVICE[feature].icon} service={feature} />
      </View>
      <Text variant="label" weight="semibold">
        {name}
      </Text>
      <Text variant="caption" tone="muted">
        {hint}
      </Text>
    </Card>
  );
}

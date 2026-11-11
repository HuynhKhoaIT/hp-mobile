// Khối mời đăng tin đầu danh sách (config.banner — style Stitch L3), ghép từ @/ui. Mỗi nút mở thẳng form đúng danh mục
// (usePostListingIn: khách → đăng nhập rồi quay lại). Khớp web `listing-banner.tsx`.
//   'actions' (đồ thất lạc): thẻ có dòng chữ + các nút chia đều, nút đầu nền primary, các nút sau viền; hẹp quá thì xuống hàng
//     (không cắt chữ trong nút).
//   'strip' (trọ): dải mỏng — chữ bên trái, một nút viền nhỏ bên phải.
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, Text } from '@/ui';
import { usePostListingIn } from '../hooks';
import type { ListingListBanner } from '../types';

export function ListingBanner({ banner }: { banner: ListingListBanner }) {
  const { t } = useTranslation('listing');
  const post = usePostListingIn();

  if (banner.variant === 'strip') {
    const action = banner.actions[0];
    return (
      <Card padded={false} className="flex-row items-center gap-3 px-4 py-2">
        <Text variant="body" weight="medium" className="flex-1">
          {t(banner.textKey)}
        </Text>
        {action ? (
          <Button size="sm" variant="outline" icon={action.icon} label={t(action.labelKey)} onPress={() => post(action.category)} />
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="gap-3">
      <Text variant="label" weight="semibold">
        {t(banner.textKey)}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {banner.actions.map((a, i) => (
          <View key={a.category} className="min-w-36 flex-1">
            <Button
              fullWidth
              variant={i === 0 ? 'primary' : 'outline'}
              icon={a.icon}
              label={t(a.labelKey)}
              onPress={() => post(a.category)}
            />
          </View>
        ))}
      </View>
    </Card>
  );
}

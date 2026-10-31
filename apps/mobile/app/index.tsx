// Screen type: Hub
// Màn tạm cho tới khi có Hub thật (tuần 3): tên app, dòng miễn trừ, lối vào ui-gallery khi chạy dev.
import { APP_NAME } from '@hp/shared';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Screen, Text } from '@/ui';

export default function HomeScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-3">
        <Text variant="heading">{APP_NAME}</Text>
        <Text variant="caption" tone="muted" className="text-center">
          {t('disclaimer')}
        </Text>
        {__DEV__ ? (
          <Link href="/ui-gallery" asChild>
            <Pressable accessibilityRole="link" className="mt-6 min-h-12 justify-center px-4">
              <Text variant="label" tone="primary">
                {t('dev.open_gallery')}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </Screen>
  );
}

// Hướng dẫn giao dịch an toàn — hiện một lần trước cuộc trò chuyện đầu tiên (docs/ARCHITECTURE.md: gặp nơi công cộng
// trong khu, kiểm tra hàng trước khi trả tiền, không đặt cọc). "Tôi đã hiểu" → không hiện lại trên máy này.
import type { LucideIcon } from 'lucide-react-native';
import { Flag, HandCoins, MapPin, SearchCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { BottomSheet, Button, Icon, Text } from '@/ui';

const TIPS: [LucideIcon, string][] = [
  [MapPin, 'safety.tip_meet'],
  [SearchCheck, 'safety.tip_check'],
  [HandCoins, 'safety.tip_deposit'],
  [Flag, 'safety.tip_report'],
];

export function SafetyGuideSheet({ open, onAccept }: { open: boolean; onAccept: () => void }) {
  const { t } = useTranslation('chat');
  return (
    <BottomSheet open={open} onClose={onAccept} title={t('safety.title')}>
      <Text tone="muted">{t('safety.intro')}</Text>
      <View className="gap-3">
        {TIPS.map(([icon, key]) => (
          <View key={key} className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-light">
              <Icon icon={icon} tone="primary" />
            </View>
            <Text className="flex-1 pt-2">{t(key)}</Text>
          </View>
        ))}
      </View>
      <Button label={t('safety.accept')} fullWidth onPress={onAccept} />
    </BottomSheet>
  );
}

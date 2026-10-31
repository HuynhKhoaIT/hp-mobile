// Screen — khung mọi màn hình: nền bg, chừa vùng an toàn, padding ngang 16 (p-4). scroll=true cho màn nội dung dài.
// Màn danh sách dùng FlashList bên trong Screen (scroll=false), không ScrollView bọc list.
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ScreenProps = {
  children?: ReactNode;
  scroll?: boolean;
  /** Bỏ padding ngang khi nội dung tự tràn mép (carousel, header cong). */
  edgeToEdge?: boolean;
  className?: string;
};

export function Screen({ children, scroll = false, edgeToEdge = false, className }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = edgeToEdge ? '' : 'px-4';
  const safe = { paddingTop: insets.top };

  if (scroll) {
    return (
      <ScrollView
        className="flex-1 bg-bg"
        style={safe}
        contentContainerClassName={[padding, 'pb-8', className].filter(Boolean).join(' ')}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View className={['flex-1 bg-bg', padding, className].filter(Boolean).join(' ')} style={{ ...safe, paddingBottom: insets.bottom }}>
      {children}
    </View>
  );
}

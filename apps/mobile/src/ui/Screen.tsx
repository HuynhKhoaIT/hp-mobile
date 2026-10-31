// Screen — khung mọi màn hình: nền bg, chừa vùng an toàn, padding ngang 16 (p-4). scroll=true cho màn nội dung dài.
// Màn danh sách dùng FlashList bên trong Screen (scroll=false), không ScrollView bọc list.
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ScreenProps = {
  children?: ReactNode;
  scroll?: boolean;
  /** Bỏ padding ngang khi nội dung tự tràn mép (carousel, header cong). */
  edgeToEdge?: boolean;
  /** Màn có ô nhập: đẩy nội dung lên khi bàn phím mở. */
  keyboard?: boolean;
  className?: string;
};

export function Screen({ keyboard = false, ...props }: ScreenProps) {
  if (!keyboard) return <ScreenBody {...props} />;
  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenBody {...props} />
    </KeyboardAvoidingView>
  );
}

function ScreenBody({ children, scroll = false, edgeToEdge = false, className }: Omit<ScreenProps, 'keyboard'>) {
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

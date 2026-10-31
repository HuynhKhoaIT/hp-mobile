// Screen — khung mọi màn hình: nền bg, chừa vùng an toàn, padding ngang 16 (p-4). scroll=true cho màn nội dung dài.
// Màn danh sách dùng FlashList bên trong Screen (scroll=false), không ScrollView bọc list.
// Hub: `statusBar="primary"` tô dải trạng thái màu primary (header xanh tràn lên vùng an toàn), `onScroll` nhận
// handler Reanimated (header thu gọn), `stickyHeaderIndices` giữ ô tìm kiếm trên cùng, `onRefresh` kéo xuống làm mới.
import type { ComponentProps, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedScrollView } from './interop';
import { useTheme } from './theme';

export type ScreenProps = {
  children?: ReactNode;
  scroll?: boolean;
  /** Bỏ padding ngang khi nội dung tự tràn mép (carousel, header cong). */
  edgeToEdge?: boolean;
  /** Màn có ô nhập: đẩy nội dung lên khi bàn phím mở. */
  keyboard?: boolean;
  /** Màn trong tab: thanh tab đã chừa vùng an toàn đáy → không cộng thêm. */
  tab?: boolean;
  /** Màu dải trạng thái (vùng an toàn trên). 'primary': màn có header xanh (Hub). */
  statusBar?: 'bg' | 'primary';
  /** Handler cuộn của Reanimated (useAnimatedScrollHandler) — chỉ khi scroll. */
  onScroll?: ComponentProps<typeof AnimatedScrollView>['onScroll'];
  /** Chỉ số con trực tiếp dính trên cùng khi cuộn (vd ô tìm kiếm của Hub). */
  stickyHeaderIndices?: number[];
  /** Kéo xuống làm mới (chỉ khi scroll). */
  refreshing?: boolean;
  onRefresh?: () => void;
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

function ScreenBody({
  children,
  scroll = false,
  edgeToEdge = false,
  tab = false,
  statusBar = 'bg',
  onScroll,
  stickyHeaderIndices,
  refreshing,
  onRefresh,
  className,
}: Omit<ScreenProps, 'keyboard'>) {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const bottom = tab ? 0 : insets.bottom;
  const padding = edgeToEdge ? '' : 'px-4';
  const safe = { paddingTop: insets.top };

  if (scroll && (onScroll || statusBar === 'primary' || onRefresh)) {
    const onPrimary = statusBar === 'primary';
    return (
      <View className="flex-1 bg-bg">
        {/* Dải trạng thái cố định: nội dung cuộn bên dưới, header dính không chui vào vùng tai thỏ. */}
        <View className={onPrimary ? 'bg-primary' : 'bg-bg'} style={{ height: insets.top }} />
        <AnimatedScrollView
          className="flex-1"
          contentContainerClassName={[padding, 'pb-8', className].filter(Boolean).join(' ')}
          contentContainerStyle={{ paddingBottom: bottom }}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
          stickyHeaderIndices={stickyHeaderIndices}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                // iOS: vòng quay hiện trên nền xanh của header → màu chữ trên primary; Android: nút tròn nền surface.
                tintColor={onPrimary ? t.colors.onPrimary : t.colors.primary}
                colors={[t.colors.primary]}
                progressBackgroundColor={t.colors.surface}
              />
            ) : undefined
          }
        >
          {children}
        </AnimatedScrollView>
      </View>
    );
  }

  if (scroll) {
    return (
      <ScrollView
        className="flex-1 bg-bg"
        style={safe}
        contentContainerClassName={[padding, 'pb-8', className].filter(Boolean).join(' ')}
        contentContainerStyle={{ paddingBottom: bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View className={['flex-1 bg-bg', padding, className].filter(Boolean).join(' ')} style={{ ...safe, paddingBottom: bottom }}>
      {children}
    </View>
  );
}

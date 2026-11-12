// Screen — khung mọi màn hình: nền bg, chừa vùng an toàn, padding ngang 16 (p-4). scroll=true cho màn nội dung dài.
// Màn danh sách dùng FlashList bên trong Screen (scroll=false), không ScrollView bọc list.
// Hub: `statusBar="primary"` tô dải trạng thái màu primary (header xanh tràn lên vùng an toàn; màn không scroll — vd trang
// chủ mini-app có header cuộn trong FlashList — cũng giữ dải primary cố định), `onScroll` nhận
// handler Reanimated (header thu gọn), `stickyHeaderIndices` giữ ô tìm kiếm trên cùng, `onRefresh` kéo xuống làm mới.
// Mini-app: `statusBar="app"` — dải trạng thái màu đầu gradient của mini-app (bg-app-from, header GradientSurface).
import type { ComponentProps, ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedScrollView } from './interop';
import { useTheme } from './theme';

export type ScreenProps = {
  children?: ReactNode;
  scroll?: boolean;
  /** Bỏ padding ngang khi nội dung tự tràn mép (carousel, header cong). */
  edgeToEdge?: boolean;
  /**
   * Màn có ô nhập: tránh bàn phím bằng react-native-keyboard-controller (animation bám từng khung hình bàn phím, iOS +
   * Android edge-to-edge). scroll → KeyboardAwareScrollView (tự cuộn tới ô đang nhập); không scroll →
   * KeyboardAvoidingView `padding`, trừ vùng an toàn đáy (bàn phím đã che home indicator) để nút / ô dưới cùng dính
   * sát bàn phím, không hở. Màn chat tự xử lý (KeyboardChatScrollView + KeyboardStickyView), không dùng prop này.
   */
  keyboard?: boolean;
  /** Màn trong tab: thanh tab đã chừa vùng an toàn đáy → không cộng thêm. */
  tab?: boolean;
  /** Màu dải trạng thái (vùng an toàn trên). 'primary': màn có header xanh (Hub). 'app': header gradient của mini-app. */
  statusBar?: 'bg' | 'primary' | 'app';
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
  const insets = useSafeAreaInsets();
  if (!keyboard) return <ScreenBody {...props} />;
  if (props.scroll) return <ScreenBody {...props} keyboardAware />;
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior="padding"
      keyboardVerticalOffset={props.tab ? 0 : -insets.bottom}
    >
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
  keyboardAware = false,
}: Omit<ScreenProps, 'keyboard'> & { keyboardAware?: boolean }) {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const bottom = tab ? 0 : insets.bottom;
  const padding = edgeToEdge ? '' : 'px-4';
  const safe = { paddingTop: insets.top };

  const strip = statusBar === 'app' ? 'bg-app-from' : statusBar === 'primary' ? 'bg-primary' : 'bg-bg';

  if (scroll && (onScroll || statusBar !== 'bg' || onRefresh)) {
    const onPrimary = statusBar !== 'bg';
    return (
      <View className="flex-1 bg-bg">
        {/* Dải trạng thái cố định: nội dung cuộn bên dưới, header dính không chui vào vùng tai thỏ. */}
        <View className={strip} style={{ height: insets.top }} />
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
                tintColor={statusBar === 'app' ? t.colors.onAccent : onPrimary ? t.colors.onPrimary : t.colors.primary}
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

  if (scroll && keyboardAware) {
    return (
      <KeyboardAwareScrollView
        className="flex-1 bg-bg"
        style={safe}
        contentContainerClassName={[padding, 'pb-8', className].filter(Boolean).join(' ')}
        contentContainerStyle={{ paddingBottom: bottom }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={t.space[4]}
      >
        {children}
      </KeyboardAwareScrollView>
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
      {/* Header xanh cuộn theo danh sách (trang chủ mini-app): dải trạng thái giữ màu primary khi header đã cuộn đi. */}
      {statusBar !== 'bg' ? <View className={`absolute inset-x-0 top-0 ${strip}`} style={{ height: insets.top }} /> : null}
      {children}
    </View>
  );
}

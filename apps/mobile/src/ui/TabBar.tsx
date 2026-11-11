// TabBar — thanh tab dưới (Expo Router js-tabs, prop `tabBar`), style Stitch: nền surface đặc (Android elevation + nền
// trong mờ vẽ lỗi bóng, không có BlurView) + viền trên border + shadow-bar; cao 64 + vùng an toàn đáy.
// Mỗi tab: icon Lucide 24 + chữ (luôn kèm chữ); đang mở: icon + chữ primary, nét icon đậm hơn (Icon strong), chữ 600,
// icon nảy nhẹ; chưa mở: muted. Tab `accent` (Đăng): nút tròn size-14 nổi lên trên thanh (-mt-6) — vòng ngoài 4 màu
// surface tách khỏi nội dung phía sau, lõi cam 48 — nền accent, icon Plus on-accent (trắng) + shadow-fab;
// vẫn kèm chữ "Đăng" dưới nút; xoay 45° khi đang mở. Vùng chạm cả cột tab ≥ 56 (phần nút nhô lên trên thanh không nhận
// chạm — ngoài khung cha). Nút Đăng "thở" chậm khi chưa mở (useAmbientLoop 'glow', t.motion.ambient.glow 2,8s/chu kỳ):
// quầng cam shadow-fab phía sau sáng dần + phóng ≤ 1.04 rồi tắt; đang mở (xoay 45°) → tắt quầng.
// Reduce Motion → không nảy / xoay / thở (tắt hẳn).
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Icon } from './Icon';
import { AnimatedView } from './interop';
import { Text } from './Text';
import { useReducedMotion, useTheme } from './theme';
import { useAmbientLoop } from './useAmbientLoop';

export type TabBarProps = BottomTabBarProps & {
  /** Tên route → icon. Route không có icon thì không hiện trên thanh. */
  icons: Record<string, LucideIcon>;
  /** Route hiện dạng nút Đăng (nền accent). */
  accent?: string;
  /** Tên route → chữ trên chấm đỏ (vd số hội thoại chưa đọc "3", "99+"); null / thiếu → không hiện. */
  badges?: Record<string, string | null | undefined>;
};

export function TabBar({ state, descriptors, emitter, navigateToTab, insets, icons, accent, badges }: TabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-border bg-surface px-1 pt-1 shadow-bar"
      style={{ paddingBottom: Math.max(insets.bottom, 4) }}
    >
      {state.routes.map((route, index) => {
        const icon = icons[route.name];
        if (!icon) return null;
        const focused = index === state.index;
        const options = descriptors[route.key]?.options;
        const label = typeof options?.title === 'string' ? options.title : route.name;
        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        return (
          <TabBarItem
            key={route.key}
            label={label}
            icon={icon}
            focused={focused}
            accent={route.name === accent}
            badge={badges?.[route.name] ?? null}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}

export type TabBarItemProps = {
  label: string;
  icon: LucideIcon;
  focused: boolean;
  /** Nút Đăng (nền accent, nổi trên thanh, thở chậm khi chưa mở). */
  accent?: boolean;
  badge?: string | null;
  onPress: () => void;
};

/** Một ô của TabBar (xuất riêng để trưng bày ở ui-gallery). */
export function TabBarItem({ label, icon, focused, accent = false, badge = null, onPress }: TabBarItemProps) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }, { rotate: `${rotate.get()}deg` }] }));
  // Quầng nút Đăng: chỉ khi là nút Đăng và chưa mở; Reduce Motion → hook tự tắt.
  const glow = useAmbientLoop('glow', accent && !focused);
  const glowPeak = motion.ambient.glow.scale;
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.progress.get(),
    transform: [{ scale: 1 + (glowPeak - 1) * glow.progress.get() }],
  }));

  useEffect(() => {
    if (reduced) {
      rotate.set(accent && focused ? 45 : 0);
      return;
    }
    if (accent) {
      rotate.set(withTiming(focused ? 45 : 0, { duration: motion.fast.duration }));
    } else if (focused) {
      scale.set(withSequence(withTiming(1.12, { duration: motion.instant.duration }), withTiming(1, { duration: motion.fast.duration })));
    }
  }, [focused, accent, reduced, rotate, scale, motion.fast.duration, motion.instant.duration]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={badge ? `${label}, ${badge}` : label}
      onPress={onPress}
      className="min-h-14 flex-1 items-center justify-end gap-0.5 py-1"
    >
      {accent ? (
        <View className="-mt-6 size-14">
          {/* Quầng thở: lớp accent + shadow-fab nằm sau nút (cộng thêm một lớp bóng cam khi sáng), không nhận chạm. */}
          {!reduced ? (
            <AnimatedView pointerEvents="none" style={glowStyle} className="absolute inset-0 rounded-full bg-accent shadow-fab" />
          ) : null}
          <AnimatedView style={style} className="size-14 items-center justify-center rounded-full border-4 border-surface bg-accent shadow-fab">
            <Icon icon={icon} tone="onAccent" size="tab" strong />
          </AnimatedView>
        </View>
      ) : (
        <AnimatedView style={style}>
          <Icon icon={icon} tone={focused ? 'primary' : 'muted'} size="tab" strong={focused} />
          {badge ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="absolute -right-3 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-accent px-1"
            >
              <Text variant="micro" weight="bold" tone="onAccent" maxFontSizeMultiplier={1.2}>
                {badge}
              </Text>
            </View>
          ) : null}
        </AnimatedView>
      )}
      <Text
        variant="caption"
        tone={focused ? 'primary' : 'muted'}
        numberOfLines={1}
        // 5 tab ở 360px, cỡ chữ 150%: thu nhỏ cho vừa ô thay vì cắt "Mess…".
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        weight={focused ? 'semibold' : 'medium'}
      >
        {label}
      </Text>
    </Pressable>
  );
}

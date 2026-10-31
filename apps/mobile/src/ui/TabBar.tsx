// TabBar — thanh tab dưới (Expo Router js-tabs, prop `tabBar`). Mỗi tab: icon Lucide 24 + chữ (luôn kèm chữ),
// tab đang mở tô primary + icon nảy nhẹ; tab `accent` (Đăng) là nút tròn cam, xoay 45° khi đang mở.
// Reduce Motion → không nảy / xoay. Vùng chạm ≥ 48, chừa vùng an toàn đáy.
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Icon } from './Icon';
import { AnimatedView } from './interop';
import { Text } from './Text';
import { useReducedMotion, useTheme } from './theme';

export type TabBarProps = BottomTabBarProps & {
  /** Tên route → icon. Route không có icon thì không hiện trên thanh. */
  icons: Record<string, LucideIcon>;
  /** Route hiện dạng nút Đăng (nền accent). */
  accent?: string;
};

export function TabBar({ state, descriptors, emitter, navigateToTab, insets, icons, accent }: TabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-border bg-surface px-1 pt-1"
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
          <TabItem key={route.key} label={label} icon={icon} focused={focused} accent={route.name === accent} onPress={onPress} />
        );
      })}
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  accent,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  focused: boolean;
  accent: boolean;
  onPress: () => void;
}) {
  const { motion } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }, { rotate: `${rotate.get()}deg` }] }));

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
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-12 flex-1 items-center justify-center gap-0.5 py-1"
    >
      {accent ? (
        <AnimatedView style={style} className="h-9 w-9 items-center justify-center rounded-full bg-accent">
          <Icon icon={icon} tone="onAccent" size="tab" />
        </AnimatedView>
      ) : (
        <AnimatedView style={style}>
          <Icon icon={icon} tone={focused ? 'primary' : 'muted'} size="tab" />
        </AnimatedView>
      )}
      <Text
        variant="caption"
        tone={focused ? 'primary' : 'muted'}
        numberOfLines={1}
        className={focused ? 'font-sans-medium' : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}

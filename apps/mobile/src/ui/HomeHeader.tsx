// Header trang chủ (Hub) — docs/design/home.md §4.1, §4.2, §10. Ba phần là ba con trực tiếp của ScrollView của
// Screen (để ô tìm kiếm dính bằng `stickyHeaderIndices`):
//   HomeHeader        nền primary, px-4 pt-3 (style Stitch): hàng 1 cao 48 (avatar size-10 viền 2px on-primary/30 |
//                     lời chào / tên app text-xl đậm 700 + câu phụ text-sm 90% | chuông size-11 nền on-primary/15) → chip
//                     khu pill trong mờ (MapPin 16 · text-sm 500 · ChevronDown 16, nền on-primary/15, rounded-full px-3 py-1).
//                     Khách: tên app + nút Đăng nhập pill trong mờ (Button glass). Hoạ tiết (HeroDecor, dùng lại ở hero
//                     tab Tôi): 2 vòng tròn on-primary/10 + 1 vòng nét đứt on-primary/15 (trang trí, ẩn với trình đọc màn hình). Thu gọn theo cuộn: mờ dần +
//                     dịch lên 8 (Reduce Motion: chỉ mờ).
//   HomeHeaderSearch  dính trên cùng khi cuộn: ô tìm kiếm cao 48 rounded-full nền surface shadow-card trên nền primary.
//   HomeHeaderCurve   phần đáy bo rounded-b-xl — cùng 8 dưới ô tìm kiếm tạo pb-16 (64) để lưới dịch vụ nổi lên 48.
// NotificationBell: số chưa đọc (> 9 → "9+", 0 → ẩn), lắc nhẹ một lần khi số tăng. SiteChip dùng riêng được.
import { ArrowLeftRight, Bell, ChevronDown, MapPin } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import {
  Extrapolation,
  FadeIn,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Icon } from './Icon';
import { AnimatedView } from './interop';
import { SearchBar } from './SearchBar';
import { Text } from './Text';
import { useReducedMotion, useTheme } from './theme';

export type HomeHeaderUser = { name: string; avatarUri?: string | null; onPress: () => void; accessibilityLabel: string };

export type HomeHeaderProps = {
  /** Vị trí cuộn dọc của Hub (useAnimatedScrollHandler) — có thì header thu gọn theo cuộn. */
  scrollY?: SharedValue<number>;
  /** Đã đăng nhập: avatar (bấm → tab Tôi) + chuông. null: khách (logo chữ + nút Đăng nhập). */
  user: HomeHeaderUser | null;
  /** Đang khôi phục phiên / hồ sơ: hàng 1 hiện khối chờ. */
  loading?: boolean;
  /** Lời chào (đã đăng nhập) hoặc logo chữ (khách). */
  title: string;
  subtitle?: string;
  site: SiteChipProps;
  bell?: NotificationBellProps;
  signIn?: { label: string; onPress: () => void };
};

export function HomeHeader({ scrollY, user, loading = false, title, subtitle, site, bell, signIn }: HomeHeaderProps) {
  const reduced = useReducedMotion();
  const height = useSharedValue(0);
  const onLayout = (e: LayoutChangeEvent) => height.set(e.nativeEvent.layout.height);

  const collapse = useAnimatedStyle(() => {
    const y = scrollY ? scrollY.get() : 0;
    const h = Math.max(height.get(), 1);
    return {
      opacity: interpolate(y, [0, h * 0.7], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: reduced ? 0 : interpolate(y, [0, h], [0, -8], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View onLayout={onLayout} className="bg-primary px-4 pb-1 pt-3">
      <HeroDecor />
      <AnimatedView style={collapse} className="gap-3">
        <View className="min-h-12 flex-row items-center gap-3">
          {loading ? (
            <>
              <View className="size-11 rounded-full bg-on-primary/15" />
              <View className="flex-1 gap-1.5">
                <View className="h-5 w-1/2 rounded-full bg-on-primary/15" />
                <View className="h-4 w-2/3 rounded-full bg-on-primary/15" />
              </View>
            </>
          ) : (
            <>
              {user ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={user.accessibilityLabel}
                  onPress={user.onPress}
                  className="rounded-full border-2 border-on-primary/30 active:opacity-80"
                >
                  <Avatar name={user.name} uri={user.avatarUri} />
                </Pressable>
              ) : null}
              <View className="flex-1">
                <Text variant="titleLg" weight="bold" tone="onPrimary" accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="caption" tone="onPrimary" className="opacity-90">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {user && bell ? <NotificationBell {...bell} /> : null}
              {!user && signIn ? <Button size="sm" variant="glass" shape="pill" label={signIn.label} onPress={signIn.onPress} /> : null}
            </>
          )}
        </View>
        <SiteChip {...site} />
      </AnimatedView>
    </View>
  );
}

/**
 * Nền + hoạ tiết header xanh (Hub, hero tab Tôi): dải primary kéo dài lên trên (iOS kéo quá đầu trang để làm mới vẫn
 * thấy xanh, không lộ nền xám) + 2 vòng tròn on-primary/10 và 1 vòng nét đứt on-primary/15 góc phải (giống web
 * hub-header.tsx). Đặt làm con đầu của khối `bg-primary` có position relative; `rounded` = bo của khối (cắt hoạ tiết
 * theo góc bo, vd 'rounded-b-xl').
 */
/**
 * Hoạ tiết header (vòng tròn on-primary) + dải màu kéo lên trên header (cuộn quá đầu không lộ nền). `strip`: 'primary'
 * (header nền primary) · 'app' (header gradient mini-app — GradientSurface — dải màu bg-app-from).
 */
export function HeroDecor({ rounded, strip = 'primary' }: { rounded?: string; strip?: 'primary' | 'app' }) {
  return (
    <>
      <View className={`absolute inset-x-0 bottom-full h-96 ${strip === 'app' ? 'bg-app-from' : 'bg-primary'}`} />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        className={['absolute inset-0 overflow-hidden', rounded].filter(Boolean).join(' ')}
      >
        <View className="absolute -right-12 -top-16 size-40 rounded-full bg-on-primary/10" />
        <View className="absolute -right-16 -top-10 size-28 rounded-full border border-dashed border-on-primary/15" />
        <View className="absolute right-28 top-12 size-12 rounded-full bg-on-primary/10" />
      </View>
    </>
  );
}

export function HomeHeaderSearch({ placeholder, onPress }: { placeholder: string; onPress: () => void }) {
  return (
    <View className="bg-primary px-4 py-2">
      <SearchBar variant="elevated" placeholder={placeholder} onPress={onPress} />
    </View>
  );
}

export function HomeHeaderCurve() {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="h-14 rounded-b-xl bg-primary" />;
}

// ── Chip chọn khu ────────────────────────────────────────────────────────────────

export type SiteChipProps = {
  /** Tên khu đang chọn; null khi đang tải danh sách khu. */
  label: string | null;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /**
   * 'chip' (mặc định): viên nhỏ "📍 Khu ▾" · 'bar': thanh rộng hết header (trang chủ mini-app Nhà trọ, style Stitch) —
   * "📍 {prefix}: Khu" + icon đổi (⇄), nền on-primary/15 bo md, chữ xuống dòng khi phóng chữ.
   */
  variant?: 'chip' | 'bar';
  /** Chữ đậm trước tên khu ở variant 'bar' (vd "Gần bạn"). */
  prefix?: string;
};

export function SiteChip({ label, onPress, accessibilityLabel, accessibilityHint, variant = 'chip', prefix }: SiteChipProps) {
  if (variant === 'bar') {
    if (label === null) return <View className="h-11 w-full rounded-md bg-on-primary/15" />;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        className="min-h-11 w-full flex-row items-center gap-2 rounded-md border border-on-primary/20 bg-on-primary/15 px-3 py-2 active:opacity-80"
      >
        <Icon icon={MapPin} tone="onPrimary" size={16} />
        <Text variant="caption" tone="onPrimary" className="flex-1">
          {prefix ? (
            <Text variant="caption" weight="semibold" tone="onPrimary">
              {`${prefix}: `}
            </Text>
          ) : null}
          {label}
        </Text>
        <Icon icon={ArrowLeftRight} tone="onPrimary" size={16} />
      </Pressable>
    );
  }
  if (label === null) return <View className="h-7 w-48 rounded-full bg-on-primary/15" />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8 }}
      className="max-w-full flex-row items-center gap-1 self-start rounded-full bg-on-primary/15 px-3 py-1 active:opacity-80"
    >
      <Icon icon={MapPin} tone="onPrimary" size={16} />
      <Text variant="caption" weight="medium" tone="onPrimary" className="shrink">
        {label}
      </Text>
      <Icon icon={ChevronDown} tone="onPrimary" size={16} />
    </Pressable>
  );
}

// ── Chuông thông báo ─────────────────────────────────────────────────────────────

export type NotificationBellProps = {
  count: number;
  onPress: () => void;
  /** Nhãn đọc màn hình (đã gồm số chưa đọc, vd "3 thông báo chưa đọc"). */
  accessibilityLabel: string;
};

export function NotificationBell({ count, onPress, accessibilityLabel }: NotificationBellProps) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const rotate = useSharedValue(0);
  const prev = useRef<number | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  // Lắc một lần khi số chưa đọc tăng (không lắc lần đầu hiển thị, không lặp). Reduce Motion: không lắc.
  useEffect(() => {
    const before = prev.current;
    prev.current = count;
    if (before === null || count <= before || reduced) return;
    const step = t.motion.instant.duration;
    rotate.set(
      withSequence(
        withTiming(-14, { duration: step }),
        withTiming(12, { duration: step }),
        withTiming(-8, { duration: step }),
        withTiming(6, { duration: step }),
        withTiming(0, { duration: step }),
      ),
    );
    setShakeKey((k) => k + 1);
  }, [count, reduced, rotate, t.motion.instant.duration]);

  const shake = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.get()}deg` }] }));
  const badge = count > 9 ? '9+' : String(count);
  const entering = reduced ? FadeIn.duration(t.motion.reduced.duration) : ZoomIn.duration(t.motion.fast.duration);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="size-11 items-center justify-center rounded-full bg-on-primary/15 active:opacity-80"
    >
      <AnimatedView style={shake}>
        <Icon icon={Bell} tone="onPrimary" size="tab" />
      </AnimatedView>
      {count > 0 ? (
        <AnimatedView
          key={shakeKey}
          entering={entering}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="absolute -right-1 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1"
        >
          <Text variant="micro" weight="bold" tone="onAccent" maxFontSizeMultiplier={1.2}>
            {badge}
          </Text>
        </AnimatedView>
      ) : null}
    </Pressable>
  );
}

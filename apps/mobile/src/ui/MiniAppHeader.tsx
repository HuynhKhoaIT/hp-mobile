// MiniAppHeader — header xanh của mini-app trong super app (style Stitch "Sub-App Chợ Pass", "Tin đã lưu", "Quản lý tin
// đăng", "Bộ lọc & Tìm kiếm"): cùng ngôn ngữ với PageHero / header Hub — nền primary bo đáy rounded-b-xl + hoạ tiết HeroDecor
// (dải xanh kéo lên vùng trạng thái), tràn mép màn (-mx-4 bù padding 16 của Screen).
//   Hàng 1 (min-h-12): nút viên "← {nhãn}" trong mờ (rời mini-app về super app, hoặc về trang chủ mini-app) | vùng phải.
//   Khối tên: ô vuông size-12 nền accent + icon on-accent (tuỳ chọn) | dòng nhỏ in hoa (eyebrow) → tiêu đề text-xl đậm +
//   viên cam (`badge`: số tin đã lưu, "3 tin đang bán") + nhãn viền trong mờ (`tag`: "MINI-APP") → dòng phụ.
//   `aside` (vd chip khu) một hàng riêng dưới khối tên; `children` (ô tìm kiếm…) cuối header.
// Font 150% / 360 px: tiêu đề + viên + nhãn xuống dòng (flex-wrap), chữ nút viên xuống dòng (không cắt); không chiều cao cố định.
import { ArrowLeft, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { HeroDecor } from './HomeHeader';
import { Icon } from './Icon';
import { Text } from './Text';

export type MiniAppHeaderProps = {
  /** Nút viên đầu header: "← {label}". */
  back: { label: string; onPress: () => void; accessibilityLabel?: string };
  /** Vùng phải hàng 1 (IconButton glass, NotificationBell…). */
  right?: ReactNode;
  /** Dòng nhỏ in hoa trên tiêu đề (vd tên mini-app ở màn Quản lý tin). */
  eyebrow?: string;
  title: string;
  /** Viên cam sau tiêu đề (số đếm / trạng thái ngắn). */
  badge?: string;
  /** Nhãn viền trong mờ sau tiêu đề (vd "MINI-APP"). */
  tag?: string;
  subtitle?: string;
  /** Ô icon nền accent trước khối tên (trang chủ mini-app). */
  icon?: LucideIcon;
  /** Hàng riêng dưới khối tên (vd chip khu). */
  aside?: ReactNode;
  children?: ReactNode;
};

export function MiniAppHeader({ back, right, eyebrow, title, badge, tag, subtitle, icon, aside, children }: MiniAppHeaderProps) {
  return (
    <View className="-mx-4 rounded-b-xl bg-primary px-4 pb-4 pt-2">
      <HeroDecor rounded="rounded-b-xl" />
      <View className="min-h-12 flex-row items-center gap-2">
        <BackPill {...back} />
        <View className="flex-1" />
        {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
      </View>
      <View className="mt-2 flex-row items-center gap-3">
        {icon ? (
          <View className="size-12 items-center justify-center rounded-lg bg-accent shadow-fab">
            <Icon icon={icon} tone="onAccent" size="tab" strong />
          </View>
        ) : null}
        <View className="flex-1 gap-0.5">
          {eyebrow ? (
            <Text variant="micro" weight="semibold" tone="onPrimary" className="uppercase opacity-90">
              {eyebrow}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <Text variant="titleLg" weight="bold" tone="onPrimary" accessibilityRole="header">
              {title}
            </Text>
            {badge ? (
              <View className="min-w-6 items-center rounded-full bg-accent px-2 py-0.5">
                <Text variant="caption" weight="bold" tone="onAccent" maxFontSizeMultiplier={1.3}>
                  {badge}
                </Text>
              </View>
            ) : null}
            {tag ? (
              <View className="rounded-sm border border-on-primary/30 bg-on-primary/15 px-1.5 py-0.5">
                <Text variant="micro" weight="bold" tone="onPrimary" maxFontSizeMultiplier={1.3}>
                  {tag}
                </Text>
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <Text variant="caption" tone="onPrimary" className="opacity-90">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {aside ? <View className="mt-3 flex-row flex-wrap items-center gap-2">{aside}</View> : null}
      {children ? <View className="mt-3 gap-2">{children}</View> : null}
    </View>
  );
}

/** Nút viên trong mờ "← nhãn" trên nền primary (vùng chạm ≥ 44). */
function BackPill({ label, onPress, accessibilityLabel }: MiniAppHeaderProps['back']) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={4}
      className="min-h-11 shrink flex-row items-center gap-1.5 rounded-full border border-on-primary/20 bg-on-primary/15 px-3 active:opacity-80"
    >
      <Icon icon={ArrowLeft} tone="onPrimary" />
      <Text variant="caption" weight="semibold" tone="onPrimary" className="shrink">
        {label}
      </Text>
    </Pressable>
  );
}

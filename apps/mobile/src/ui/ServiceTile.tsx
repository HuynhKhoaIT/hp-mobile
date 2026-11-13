// ServiceTile — ô dịch vụ. Icon ở Hub luôn kèm chữ; chữ dùng text-fg (không dùng màu dịch vụ cho chữ).
// variant 'card' (mặc định): thẻ Card (bo lg, viền hairline), icon tròn 48 — bước chọn loại tin (PostPicker), có `selected`
//   (viền 2 primary do Card vẽ); `hint` → dòng gợi ý nhỏ muted dưới nhãn (ô danh mục 3 cột ở trang chủ mini-app Nhà trọ,
//   style Stitch: icon tròn + nhãn đậm + gợi ý; nhãn / gợi ý xuống dòng khi phóng chữ, không cắt).
// variant 'grid': ô trong lưới 8 ô của Hub (style Stitch) — ô icon 48×48 rounded-md nền nhạt bg-service-<x>-soft + viền
//   nhạt cùng tông (border-service-<x>/20), icon 24 màu dịch vụ (ô tiện ích có `icon`: bg-primary-light, viền primary/15,
//   icon primary); nhãn text-sm 500 tối đa 2 dòng trong khung min-h-10 (không numberOfLines: phóng chữ 150% thì khung giãn
//   theo minHeight, không cắt chữ). Nhãn góc "Mới" (bg-accent + chữ on-accent trắng đậm, in hoa) / "Sắp có" lệch -8/-8 góc trên
//   phải ô icon; nhãn "Mới" nổi lên xuống nhẹ (useAmbientLoop 'float': −3px, 2,4s/chu kỳ; Reduce Motion → đứng yên); ô sắp có mờ 60% (nhãn góc giữ rõ) + accessibilityState.disabled nhưng vẫn bấm được (mở màn "Sắp có").
//   Nhấn: scale 0.97 (motion.fast) + nền surface-2. Vùng chạm cả ô (icon + nhãn) ≥ 48.
// Glyph: `service` (icon + màu dịch vụ) · `service` + `icon` (icon riêng tô màu dịch vụ trên nền dịch vụ nhạt — ô danh mục
//   ở trang chủ riêng của tính năng) · `icon` (tiện ích, primary).
// ServiceGrid xếp các ô 'grid' thành hàng `columns` cột (mặc định 4; gap-x-2, gap-y-4) — RN không có CSS grid nên chia
// hàng tường minh.
import type { LucideIcon } from 'lucide-react-native';
import { Children, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import { Card } from './Card';
import { Icon } from './Icon';
import { AnimatedView } from './interop';
import { SERVICE, type ServiceKey } from './service';
import { Text } from './Text';
import { useTheme } from './theme';
import { useAmbientLoop } from './useAmbientLoop';
import { usePressScale } from './usePressScale';

export type ServiceTileBadge = { label: string; tone: 'soon' | 'new' };

type Glyph = { service: ServiceKey; icon?: LucideIcon } | { icon: LucideIcon; service?: undefined };

export type ServiceTileProps = Glyph & {
  label: string;
  onPress?: () => void;
  /** Ô đang chọn (bước chọn loại tin): viền primary + accessibilityState.selected. Chỉ variant 'card'. */
  selected?: boolean;
  variant?: 'card' | 'grid';
  /** Nhãn góc (variant 'grid'). */
  badge?: ServiceTileBadge;
  /** Tính năng chưa có: mờ 60% + đọc "đã tắt" (vẫn bấm được để mở màn "Sắp có"). */
  soon?: boolean;
  /** Dòng gợi ý dưới nhãn (variant 'card'), vd "Có gác lửng". Được đọc kèm nhãn. */
  hint?: string;
  /** Nhãn đọc màn hình thay cho `label` (vd "Xem Xe cộ" ở ô danh mục); nhãn góc vẫn được đọc kèm. */
  accessibilityLabel?: string;
  className?: string;
};

const BADGE: Record<ServiceTileBadge['tone'], { box: string; tone: 'muted' | 'onAccent'; text: string }> = {
  soon: { box: 'border border-border bg-surface-2', tone: 'muted', text: '' },
  new: { box: 'bg-accent', tone: 'onAccent', text: 'uppercase' },
};

/** Icon dịch vụ / icon riêng tô màu dịch vụ (màu nhận diện) hoặc icon tiện ích (primary). */
function TileIcon({ glyph, size }: { glyph: Glyph; size: 'tab' | number }) {
  if (glyph.service !== undefined) return <Icon icon={glyph.icon ?? SERVICE[glyph.service].icon} service={glyph.service} size={size} />;
  return <Icon icon={glyph.icon} tone="primary" size={size} />;
}

const softOf = (glyph: Glyph) => (glyph.service !== undefined ? SERVICE[glyph.service].soft : 'bg-primary-light');
/** Viền nhạt cùng tông của ô icon ở lưới Hub. */
const ringOf = (glyph: Glyph) => (glyph.service !== undefined ? SERVICE[glyph.service].ring : 'border-primary/15');

export function ServiceTile(props: ServiceTileProps) {
  if (props.variant === 'grid') return <GridTile {...props} />;
  const { label, hint, onPress, selected, className, accessibilityLabel } = props;
  const a11y = accessibilityLabel ?? label;
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={hint ? `${a11y}, ${hint}` : a11y}
      selected={selected}
      className={['min-h-24 items-center gap-2', hint && 'px-2 py-3', className].filter(Boolean).join(' ')}
    >
      <View className={`h-12 w-12 items-center justify-center rounded-full ${softOf(props)}`}>
        <TileIcon glyph={props} size="tab" />
      </View>
      <View className="items-center gap-0.5">
        <Text variant="label" weight={hint ? 'semibold' : undefined} className="text-center">
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" tone="muted" className="text-center">
            {hint}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function GridTile(props: ServiceTileProps) {
  const { label, onPress, badge, soon = false, className, accessibilityLabel = label } = props;
  const press = usePressScale('fast');
  const { motion } = useTheme();
  // Chỉ nhãn "Mới" nổi (lặp chậm); nhãn "Sắp có" đứng yên.
  const float = useAmbientLoop('float', badge?.tone === 'new');
  const floatY = motion.ambient.float.translateY;
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY * float.progress.get() }] }));
  const dim = soon ? 'opacity-60' : '';
  const a11yLabel = badge ? `${accessibilityLabel}, ${badge.label}` : accessibilityLabel;
  return (
    // Bề rộng do nơi đặt quyết định (ô trong ServiceGrid: bọc View / StaggerItem `flex-1`) — không flex-1 ở đây vì
    // trong khung cao tự do, flex-1 theo chiều dọc làm ô co về 0.
    <AnimatedView style={press.style} className={className}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={soon ? { disabled: true } : undefined}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        className="min-h-12 items-center gap-2 rounded-lg py-1 active:bg-surface-2"
      >
        <View className="relative">
          <View className={['size-12 items-center justify-center rounded-md border', softOf(props), ringOf(props), dim].join(' ')}>
            <TileIcon glyph={props} size="tab" />
          </View>
          {badge ? (
            <AnimatedView
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={floatStyle}
              className={`absolute -right-2 -top-2 rounded-full px-1.5 py-0.5 ${BADGE[badge.tone].box}`}
            >
              <Text
                variant="micro"
                weight="bold"
                tone={BADGE[badge.tone].tone}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                className={BADGE[badge.tone].text || undefined}
              >
                {badge.label}
              </Text>
            </AnimatedView>
          ) : null}
        </View>
        <View className={['min-h-10 w-full justify-start', dim].join(' ')}>
          <Text variant="caption" weight="medium" className="text-center">
            {label}
          </Text>
        </View>
      </Pressable>
    </AnimatedView>
  );
}

/** Lưới ô 'grid': `columns` cột (mặc định 4), mỗi con là một cột `flex-1` (bọc View / StaggerItem `flex-1`); hàng thiếu ô được bù chỗ trống. */
export function ServiceGrid({ children, columns = 4, className }: { children: ReactNode; columns?: number; className?: string }) {
  const items = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View className={['gap-4', className].filter(Boolean).join(' ')}>
      {rows.map((row, r) => (
        <View key={r} className="flex-row items-start gap-x-2">
          {row}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad-${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}

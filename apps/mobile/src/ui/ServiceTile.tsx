// ServiceTile — ô dịch vụ. Icon ở Hub luôn kèm chữ; chữ dùng text-fg (không dùng màu dịch vụ cho chữ).
// variant 'card' (mặc định): thẻ Card (bo lg, viền hairline), icon tròn 48 — bước chọn loại tin (PostPicker), có `selected`
//   (viền 2 primary do Card vẽ).
// variant 'grid': ô trong lưới 8 ô của Hub (style Stitch) — ô icon 48×48 rounded-md nền nhạt bg-service-<x>-soft + viền
//   nhạt cùng tông (border-service-<x>/20), icon 24 màu dịch vụ (ô tiện ích có `icon`: bg-primary-light, viền primary/15,
//   icon primary); nhãn text-sm 500 tối đa 2 dòng trong khung min-h-10 (không numberOfLines: phóng chữ 150% thì khung giãn
//   theo minHeight, không cắt chữ). Nhãn góc "Mới" (bg-accent + chữ on-accent trắng đậm, in hoa) / "Sắp có" lệch -8/-8 góc trên
//   phải ô icon; ô sắp có mờ 60% (nhãn góc giữ rõ) + accessibilityState.disabled nhưng vẫn bấm được (mở màn "Sắp có").
//   Nhấn: scale 0.97 (motion.fast) + nền surface-2. Vùng chạm cả ô (icon + nhãn) ≥ 48.
// ServiceGrid xếp các ô 'grid' thành hàng 4 cột (gap-x-2, gap-y-4) — RN không có CSS grid nên chia hàng tường minh.
import type { LucideIcon } from 'lucide-react-native';
import { Children, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import { AnimatedView } from './interop';
import { SERVICE, type ServiceKey } from './service';
import { Text } from './Text';
import { usePressScale } from './usePressScale';

export type ServiceTileBadge = { label: string; tone: 'soon' | 'new' };

type Glyph = { service: ServiceKey; icon?: undefined } | { icon: LucideIcon; service?: undefined };

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
  className?: string;
};

const BADGE: Record<ServiceTileBadge['tone'], { box: string; tone: 'muted' | 'onAccent'; text: string }> = {
  soon: { box: 'border border-border bg-surface-2', tone: 'muted', text: '' },
  new: { box: 'bg-accent', tone: 'onAccent', text: 'uppercase' },
};

/** Icon dịch vụ (màu nhận diện) hoặc icon tiện ích (primary). */
function TileIcon({ glyph, size }: { glyph: Glyph; size: 'tab' | number }) {
  if (glyph.service !== undefined) return <Icon icon={SERVICE[glyph.service].icon} service={glyph.service} size={size} />;
  return <Icon icon={glyph.icon} tone="primary" size={size} />;
}

const softOf = (glyph: Glyph) => (glyph.service !== undefined ? SERVICE[glyph.service].soft : 'bg-primary-light');
/** Viền nhạt cùng tông của ô icon ở lưới Hub. */
const ringOf = (glyph: Glyph) => (glyph.service !== undefined ? SERVICE[glyph.service].ring : 'border-primary/15');

export function ServiceTile(props: ServiceTileProps) {
  if (props.variant === 'grid') return <GridTile {...props} />;
  const { label, onPress, selected, className } = props;
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={label}
      selected={selected}
      className={['min-h-24 items-center gap-2', className].filter(Boolean).join(' ')}
    >
      <View className={`h-12 w-12 items-center justify-center rounded-full ${softOf(props)}`}>
        <TileIcon glyph={props} size="tab" />
      </View>
      <Text variant="label" className="text-center">
        {label}
      </Text>
    </Card>
  );
}

function GridTile(props: ServiceTileProps) {
  const { label, onPress, badge, soon = false, className } = props;
  const press = usePressScale('fast');
  const dim = soon ? 'opacity-60' : '';
  const a11yLabel = badge ? `${label}, ${badge.label}` : label;
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
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
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
            </View>
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

// CategoryArt — ô hình danh mục: nền nhạt bo md + hình minh hoạ nhiều màu (dữ liệu dùng chung với web ở
// `@hp/tokens/category-art`). Thay ô icon Lucide ở lưới danh mục; danh mục chưa có hình → `hasCategoryArt` false, nơi gọi
// giữ icon cũ. Trang trí thuần: nơi gọi đã có nhãn chữ / accessibilityLabel nên ẩn khỏi trình đọc màn hình.
import { CATEGORY_ART_SIZE, getCategoryArt, type ArtShape } from '@hp/tokens/category-art';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useTheme } from './theme';

/** Hình chiếm 78% ô, canh giữa (phần còn lại là lề trong của nền). */
const ART_SCALE = 0.78;
const ART_OFFSET = (CATEGORY_ART_SIZE * (1 - ART_SCALE)) / 2;
/** Bo góc nền theo lưới 48 — tương đương rounded-md (12) ở ô 48. */
const TILE_RADIUS = 12;

/** Boolean thường (không type guard): nhánh "không có hình" không bị thu hẹp kiểu danh mục về `never`. */
export function hasCategoryArt(category: string | undefined): boolean {
  return category !== undefined && getCategoryArt(category) !== undefined;
}

function Shape({ shape }: { shape: ArtShape }) {
  switch (shape.t) {
    case 'rect':
      return <Rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} fill={shape.fill} opacity={shape.o} />;
    case 'circle':
      return <Circle cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} opacity={shape.o} />;
    case 'path':
      return shape.stroke ? (
        <Path d={shape.d} fill="none" stroke={shape.stroke} strokeWidth={shape.sw} strokeLinecap="round" opacity={shape.o} />
      ) : (
        <Path d={shape.d} fill={shape.fill} opacity={shape.o} />
      );
  }
}

export type CategoryArtProps = {
  /** Mã danh mục, vd `pass_vehicle`; không có hình → không vẽ gì (nơi gọi kiểm `hasCategoryArt` trước để giữ icon cũ). */
  category: string | undefined;
  /** Cạnh ô (px). Mặc định 48 — cùng cỡ ô icon của lưới danh mục. */
  size?: number;
  className?: string;
};

export function CategoryArt({ category, size = CATEGORY_ART_SIZE, className }: CategoryArtProps) {
  const { scheme } = useTheme();
  const art = category === undefined ? undefined : getCategoryArt(category);
  if (!art) return null;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className={className}>
      <Svg width={size} height={size} viewBox={`0 0 ${CATEGORY_ART_SIZE} ${CATEGORY_ART_SIZE}`}>
        <Rect width={CATEGORY_ART_SIZE} height={CATEGORY_ART_SIZE} rx={TILE_RADIUS} fill={art.tint[scheme === 'dark' ? 'dark' : 'light']} />
        <G transform={`translate(${ART_OFFSET} ${ART_OFFSET}) scale(${ART_SCALE})`}>
          {art.shapes.map((shape, i) => (
            <Shape key={i} shape={shape} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

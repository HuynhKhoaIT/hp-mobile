// CategoryArt — ô hình danh mục: nền nhạt bo md + hình minh hoạ nhiều màu (dữ liệu dùng chung với web ở
// `@hp/tokens/category-art`). Thay ô icon Lucide ở lưới danh mục; danh mục chưa có hình → `hasCategoryArt` false, nơi gọi
// giữ icon cũ. Trang trí thuần: nơi gọi đã có nhãn chữ / accessibilityLabel nên ẩn khỏi trình đọc màn hình.
// Chiều sâu: mỗi khối tô màu là gradient dọc (đầu sáng, đáy tối — tính từ màu gốc) + vệt bóng loáng ở nửa trên nền ô.
import {
  ART_GLOSS_OPACITY,
  artFills,
  artGlossId,
  artGradientId,
  CATEGORY_ART_SIZE,
  depthStops,
  getCategoryArt,
  type ArtShape,
} from '@hp/tokens/category-art';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
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

/** `url(#gradient)` cho màu có gradient, màu gốc cho phần còn lại. */
type FillOf = (fill: string) => string;

function Shape({ shape, fillOf }: { shape: ArtShape; fillOf: FillOf }) {
  switch (shape.t) {
    case 'rect':
      return <Rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} fill={fillOf(shape.fill)} opacity={shape.o} />;
    case 'circle':
      return <Circle cx={shape.cx} cy={shape.cy} r={shape.r} fill={fillOf(shape.fill)} opacity={shape.o} />;
    case 'path':
      return shape.stroke ? (
        <Path d={shape.d} fill="none" stroke={shape.stroke} strokeWidth={shape.sw} strokeLinecap="round" opacity={shape.o} />
      ) : (
        <Path d={shape.d} fill={fillOf(shape.fill ?? '#000000')} opacity={shape.o} />
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
  if (!art || category === undefined) return null;
  const dark = scheme === 'dark';
  const fills = artFills(art);
  const fillOf: FillOf = (fill) => {
    const i = fills.indexOf(fill);
    return i < 0 ? fill : `url(#${artGradientId(category, i)})`;
  };
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className={className}>
      <Svg width={size} height={size} viewBox={`0 0 ${CATEGORY_ART_SIZE} ${CATEGORY_ART_SIZE}`}>
        <Defs>
          {fills.map((fill, i) => {
            const stops = depthStops(fill);
            if (!stops) return null;
            return (
              <LinearGradient key={fill} id={artGradientId(category, i)} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stops[0]} />
                <Stop offset="1" stopColor={stops[1]} />
              </LinearGradient>
            );
          })}
          <LinearGradient id={artGlossId(category)} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={dark ? ART_GLOSS_OPACITY.dark : ART_GLOSS_OPACITY.light} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width={CATEGORY_ART_SIZE} height={CATEGORY_ART_SIZE} rx={TILE_RADIUS} fill={art.tint[dark ? 'dark' : 'light']} />
        <Rect width={CATEGORY_ART_SIZE} height={CATEGORY_ART_SIZE * 0.6} rx={TILE_RADIUS} fill={`url(#${artGlossId(category)})`} />
        <G transform={`translate(${ART_OFFSET} ${ART_OFFSET}) scale(${ART_SCALE})`}>
          {art.shapes.map((shape, i) => (
            <Shape key={i} shape={shape} fillOf={fillOf} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

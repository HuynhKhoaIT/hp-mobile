// CategoryArt — ô hình danh mục: nền nhạt bo md + hình minh hoạ nhiều màu (dữ liệu dùng chung với app ở
// `@hp/tokens/category-art`). Thay ô icon Lucide ở lưới danh mục; danh mục chưa có hình → `hasCategoryArt` false, nơi gọi
// giữ icon cũ. Server Component được (không hook). Trang trí thuần: nơi gọi đã có nhãn chữ / aria-label nên `aria-hidden`.
// Nền đổi sáng / tối bằng hai <rect> bật tắt theo class `dark` (không cần JS, không nhấp nháy khi hydrate).
// Chiều sâu: mỗi khối tô màu là gradient dọc (đầu sáng, đáy tối — tính từ màu gốc) + vệt bóng loáng ở nửa trên nền ô.
import {
  ART_GLOSS_OPACITY,
  type ArtShape,
  artFills,
  artGlossId,
  artGradientId,
  CATEGORY_ART_SIZE,
  depthStops,
  getCategoryArt,
} from '@hp/tokens/category-art';
import { cn } from '@/lib/utils';

/** Hình chiếm 78% ô, canh giữa. */
const ART_SCALE = 0.78;
const ART_OFFSET = (CATEGORY_ART_SIZE * (1 - ART_SCALE)) / 2;
/** Bo góc nền theo lưới 48 — tương đương rounded-md (12) ở ô 48. */
const TILE_RADIUS = 12;
const GLOSS_HEIGHT = CATEGORY_ART_SIZE * 0.6;

/** Boolean thường (không type guard): nhánh "không có hình" không bị thu hẹp kiểu danh mục về `never`. */
export function hasCategoryArt(category: string | undefined): boolean {
  return category !== undefined && getCategoryArt(category) !== undefined;
}

/** `url(#gradient)` cho màu có gradient, màu gốc cho phần còn lại. */
type FillOf = (fill: string) => string;

function Shape({ shape, fillOf }: { shape: ArtShape; fillOf: FillOf }) {
  switch (shape.t) {
    case 'rect':
      return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} fill={fillOf(shape.fill)} opacity={shape.o} />;
    case 'circle':
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} fill={fillOf(shape.fill)} opacity={shape.o} />;
    case 'path':
      return shape.stroke ? (
        <path d={shape.d} fill="none" stroke={shape.stroke} strokeWidth={shape.sw} strokeLinecap="round" opacity={shape.o} />
      ) : (
        <path d={shape.d} fill={fillOf(shape.fill ?? '#000000')} opacity={shape.o} />
      );
  }
}

export function CategoryArt({ category, className }: { category: string | undefined; className?: string }) {
  const art = category === undefined ? undefined : getCategoryArt(category);
  if (!art || category === undefined) return null;
  const fills = artFills(art);
  const fillOf: FillOf = (fill) => {
    const i = fills.indexOf(fill);
    return i < 0 ? fill : `url(#${artGradientId(category, i)})`;
  };
  const gloss = `url(#${artGlossId(category)})`;
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox={`0 0 ${CATEGORY_ART_SIZE} ${CATEGORY_ART_SIZE}`}
      className={cn('shrink-0', className)}
    >
      <defs>
        {fills.map((fill, i) => {
          const stops = depthStops(fill);
          if (!stops) return null;
          return (
            <linearGradient key={fill} id={artGradientId(category, i)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={stops[0]} />
              <stop offset="1" stopColor={stops[1]} />
            </linearGradient>
          );
        })}
        <linearGradient id={artGlossId(category)} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect className="dark:hidden" width={CATEGORY_ART_SIZE} height={CATEGORY_ART_SIZE} rx={TILE_RADIUS} fill={art.tint.light} />
      <rect className="hidden dark:block" width={CATEGORY_ART_SIZE} height={CATEGORY_ART_SIZE} rx={TILE_RADIUS} fill={art.tint.dark} />
      <rect className="dark:hidden" width={CATEGORY_ART_SIZE} height={GLOSS_HEIGHT} rx={TILE_RADIUS} fill={gloss} opacity={ART_GLOSS_OPACITY.light} />
      <rect className="hidden dark:block" width={CATEGORY_ART_SIZE} height={GLOSS_HEIGHT} rx={TILE_RADIUS} fill={gloss} opacity={ART_GLOSS_OPACITY.dark} />
      <g transform={`translate(${ART_OFFSET} ${ART_OFFSET}) scale(${ART_SCALE})`}>
        {art.shapes.map((shape, i) => (
          <Shape key={i} shape={shape} fillOf={fillOf} />
        ))}
      </g>
    </svg>
  );
}

// CategoryArt — ô hình danh mục: nền nhạt bo md + hình minh hoạ nhiều màu (dữ liệu dùng chung với app ở
// `@hp/tokens/category-art`). Thay ô icon Lucide ở lưới danh mục; danh mục chưa có hình → `hasCategoryArt` false, nơi gọi
// giữ icon cũ. Server Component được (không hook). Trang trí thuần: nơi gọi đã có nhãn chữ / aria-label nên `aria-hidden`.
// Nền đổi sáng / tối bằng hai <rect> bật tắt theo class `dark` (không cần JS, không nhấp nháy khi hydrate).
import { CATEGORY_ART_SIZE, type ArtShape, getCategoryArt } from '@hp/tokens/category-art';
import { cn } from '@/lib/utils';

/** Hình chiếm 78% ô, canh giữa. */
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
      return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} fill={shape.fill} opacity={shape.o} />;
    case 'circle':
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} opacity={shape.o} />;
    case 'path':
      return shape.stroke ? (
        <path d={shape.d} fill="none" stroke={shape.stroke} strokeWidth={shape.sw} strokeLinecap="round" opacity={shape.o} />
      ) : (
        <path d={shape.d} fill={shape.fill} opacity={shape.o} />
      );
  }
}

export function CategoryArt({ category, className }: { category: string | undefined; className?: string }) {
  const art = category === undefined ? undefined : getCategoryArt(category);
  if (!art) return null;
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox={`0 0 ${CATEGORY_ART_SIZE} ${CATEGORY_ART_SIZE}`}
      className={cn('shrink-0', className)}
    >
      <rect className="dark:hidden" width={CATEGORY_ART_SIZE} height={CATEGORY_ART_SIZE} rx={TILE_RADIUS} fill={art.tint.light} />
      <rect className="hidden dark:block" width={CATEGORY_ART_SIZE} height={CATEGORY_ART_SIZE} rx={TILE_RADIUS} fill={art.tint.dark} />
      <g transform={`translate(${ART_OFFSET} ${ART_OFFSET}) scale(${ART_SCALE})`}>
        {art.shapes.map((shape, i) => (
          <Shape key={i} shape={shape} />
        ))}
      </g>
    </svg>
  );
}

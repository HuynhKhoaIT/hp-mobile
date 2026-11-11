// Trang chủ mini của tính năng (config.home — Pass đồ): bộ lọc + link "Xem tất cả" của từng dải. Hàm thuần, dùng ở server
// (render sẵn — components/feature-home.tsx) và client (tải lại khi lỗi — components/feature-home-rail.tsx) để hai bên đọc
// đúng một bộ lọc. Dải đọc trang đầu danh sách cùng bộ lọc với link "Xem tất cả" → dùng chung cache 300s.
import { HOME_RAIL_SIZE, type ListingCategory } from '@hp/shared';
import type { ListingFeatureConfig, ListingHomeRail } from './feature-config';
import { filterQuery } from './filters';

export type HomeRailQuery = {
  categories: readonly ListingCategory[];
  site: string | null;
  freeOnly?: boolean;
  /** Số tin của dải. */
  size: number;
};

/** Bộ lọc của dải: gần khu (khu mặc định; null = mọi khu) · cho tặng · một danh mục. */
export function homeRailQuery(cfg: ListingFeatureConfig, rail: ListingHomeRail, site: string | null): HomeRailQuery {
  switch (rail.kind) {
    case 'near':
      return { categories: cfg.categories, site, size: HOME_RAIL_SIZE.near };
    case 'free':
      return { categories: cfg.categories, site: null, freeOnly: true, size: HOME_RAIL_SIZE.feature };
    case 'category':
      return { categories: [rail.category], site: null, size: HOME_RAIL_SIZE.feature };
  }
}

/** "Xem tất cả" → danh sách đã lọc tương ứng (?site= · ?free=1 · ?category=). */
export function homeRailHref(cfg: ListingFeatureConfig, rail: ListingHomeRail, site: string | null) {
  switch (rail.kind) {
    case 'near':
      return { pathname: cfg.path, query: filterQuery({ site }) };
    case 'free':
      return { pathname: cfg.path, query: filterQuery({ freeOnly: true }) };
    case 'category':
      return { pathname: cfg.path, query: filterQuery({ category: rail.category }) };
  }
}

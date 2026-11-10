// Đọc cho landing: tin mới nhất (dùng chung cache trang đầu /tin) + số liệu cộng đồng. Lỗi → null, khối đó ẩn / báo lỗi riêng.
import 'server-only';
import { LISTING_CATEGORIES } from '@hp/shared';
import { getListPage, getPublicStats, type PublicStats } from '@/features/listing/queries';

const LATEST_SIZE = 4;
/** Dưới mức này ẩn khối số liệu (số nhỏ làm cộng đồng trông vắng; không bao giờ dùng số giả). */
const STATS_MIN = 100;

export async function getLatestListings() {
  try {
    const { page, now } = await getListPage({ categories: LISTING_CATEGORIES, site: null, query: '' });
    return { items: page.items.slice(0, LATEST_SIZE), now };
  } catch {
    return null;
  }
}

export async function getLandingStats(): Promise<PublicStats | null> {
  try {
    const stats = await getPublicStats();
    return Number(stats.listings) >= STATS_MIN && Number(stats.users) >= STATS_MIN ? stats : null;
  } catch {
    return null;
  }
}

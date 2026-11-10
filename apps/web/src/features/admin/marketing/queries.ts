// Banner trang chủ / danh sách (chỉ admin — policy banners_*_admin; admin thấy cả banner tắt / hết hạn). Theo request.
import 'server-only';
import { type AdminBanner, listAdminBanners } from '@hp/core';
import { requireStaff } from '../session';
import { pick, type SearchParams } from '../lib/params';
import { unwrap } from '../lib/server';

export type MarketingData = { forbidden: true } | { forbidden: false; banners: AdminBanner[]; placement: string | null; now: number };

export async function getMarketingPage(params: SearchParams): Promise<MarketingData> {
  const check = await requireStaff('admin');
  if (!check.ok) {
    if (check.code === 'forbidden') return { forbidden: true };
    throw new Error(check.code);
  }
  const placement = pick(params, 'placement') ?? null;
  const banners = unwrap(await listAdminBanners(check.staff.supabase, { placement: placement ?? undefined }));
  return { forbidden: false, banners, placement, now: Date.now() };
}

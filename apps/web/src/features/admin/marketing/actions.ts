'use server';

// Server Action banner (chỉ admin). Trigger trg_banners_audit ghi `banner.insert|update`. Làm mới cache trang chủ / danh
// sách bằng tag `banners` (features/home/queries.ts cacheTag('banners')).
import { saveBanner, setBannerActive } from '@hp/core';
import { updateTag } from 'next/cache';
import type { ActionResult } from '@/lib/action-result';
import { asRecord, refreshAdmin, withStaff } from '../lib/server';

function refresh() {
  updateTag('banners');
  refreshAdmin();
}

export async function saveBannerAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const v = asRecord(raw);
  const result = await withStaff('admin', (s) =>
    saveBanner(s.supabase, {
      id: v.id,
      placement: v.placement,
      locale: v.locale,
      title: v.title,
      subtitle: v.subtitle,
      ctaLabel: v.ctaLabel,
      linkUrl: v.linkUrl,
      tone: v.tone,
      startsAt: v.startsAt,
      endsAt: v.endsAt,
      isActive: v.isActive,
      sort: v.sort,
    }),
  );
  if (result.ok) refresh();
  return result;
}

export async function setBannerActiveAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  const result = await withStaff('admin', (s) => setBannerActive(s.supabase, { id: v.id, active: v.active }));
  if (result.ok) refresh();
  return result;
}

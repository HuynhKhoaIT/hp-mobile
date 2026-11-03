'use server';

// Server Action danh mục. audit_log do trigger DB ghi: sites → `site.*` (trg_sites_audit), venues → `venue.approve|reject|
// update|hide` (trg_venues_guard), banned_keywords → `keyword.insert|update|delete` (trg_banned_keywords_audit).
// Quyền: sân → moderator+; khu + từ khoá cấm → chỉ admin (kiểm lại ở đây, RLS là chốt cuối).
import {
  createBannedKeyword,
  createSite,
  deleteBannedKeyword,
  reviewVenue,
  setVenueHidden,
  updateBannedKeyword,
  updateSite,
  updateVenue,
} from '@hp/core';
import { updateTag } from 'next/cache';
import type { ActionResult } from '@/lib/action-result';
import { asRecord, refreshAdmin, withStaff } from '../lib/server';

function done<T>(result: ActionResult<T>, extra?: () => void): ActionResult<T> {
  if (result.ok) {
    extra?.();
    refreshAdmin();
  }
  return result;
}

// ── Sân (moderator+) ──
export async function reviewVenueAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  return done(await withStaff('moderator', (s) => reviewVenue(s.supabase, { id: v.id, approve: v.approve, rejectReason: v.rejectReason })));
}

export async function updateVenueAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  return done(
    await withStaff('moderator', (s) =>
      updateVenue(s.supabase, {
        id: v.id,
        name: v.name,
        sports: v.sports,
        site: v.site,
        addressText: v.addressText,
        priceRef: v.priceRef,
        phone: v.phone,
      }),
    ),
  );
}

export async function setVenueHiddenAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  return done(await withStaff('moderator', (s) => setVenueHidden(s.supabase, { id: v.id, hidden: v.hidden })));
}

// ── Khu (admin) ──
export async function createSiteAction(raw: unknown): Promise<ActionResult<{ code: string }>> {
  const v = asRecord(raw);
  return done(
    await withStaff('admin', async (s) => {
      const r = await createSite(s.supabase, { code: v.code, name: v.name, lat: v.lat, lng: v.lng, sortOrder: v.sortOrder });
      return r.error ? r : { data: { code: r.data.code }, error: null };
    }),
    () => updateTag('sites'),
  );
}

export async function updateSiteAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  return done(
    await withStaff('admin', (s) =>
      updateSite(s.supabase, { code: v.code, name: v.name, sortOrder: v.sortOrder, isActive: v.isActive, lat: v.lat, lng: v.lng }),
    ),
    () => updateTag('sites'),
  );
}

// ── Từ khoá cấm (admin) ──
export async function createKeywordAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const v = asRecord(raw);
  return done(await withStaff('admin', (s) => createBannedKeyword(s.supabase, { keyword: v.keyword, action: v.action, categories: v.categories })));
}

export async function updateKeywordAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  return done(await withStaff('admin', (s) => updateBannedKeyword(s.supabase, { id: v.id, action: v.action, categories: v.categories })));
}

export async function deleteKeywordAction(raw: unknown): Promise<ActionResult<null>> {
  const v = asRecord(raw);
  return done(await withStaff('admin', (s) => deleteBannedKeyword(s.supabase, v.id)));
}

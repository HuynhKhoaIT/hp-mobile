// Nháp form đăng tin trong localStorage (apps/web/CLAUDE.md mục 7: "tự lưu bản nháp vào localStorage, bọc try/catch").
// Chỉ phần chữ (tính năng, danh mục, giá trị ô) — ảnh không lưu được. Mỗi trình duyệt một nháp; xoá khi đăng / lưu nháp
// lên server / bỏ tin. Đọc qua useSyncExternalStore (server snapshot = null) để không lệch hydrate.
import type { ListingCategory, ListingFeature } from '@hp/shared';
import { LISTING_CATEGORIES } from '@hp/shared';
import type { FormValues } from '../../form-values';

const KEY = 'hp:listing-form:v1';
const listeners = new Set<() => void>();

export type StoredDraft = { feature: ListingFeature; category: ListingCategory; values: FormValues };

export function subscribeDraft(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Chuỗi thô (snapshot ổn định theo giá trị cho useSyncExternalStore). */
export function readDraftRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseDraft(raw: string | null): StoredDraft | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<StoredDraft>;
    if (!v.values || !v.feature || !v.category || !(LISTING_CATEGORIES as readonly string[]).includes(v.category)) return null;
    return v as StoredDraft;
  } catch {
    return null;
  }
}

export function writeDraft(draft: StoredDraft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Hết dung lượng / bị chặn: bỏ qua.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Bỏ qua.
  }
  for (const l of listeners) l();
}

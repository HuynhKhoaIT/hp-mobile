// Nháp form đăng tin trong localStorage (apps/web/CLAUDE.md mục 7: "tự lưu bản nháp vào localStorage, bọc try/catch").
// Chỉ phần chữ (tính năng, danh mục, giá trị ô) — ảnh không lưu được. Xoá khi đăng / lưu nháp lên server / bỏ tin. Đọc qua
// useSyncExternalStore (server snapshot = null) để không lệch hydrate.
// Hai loại khoá:
// - Form chung /dang-tin: một nháp mỗi trình duyệt (KEY — giữ nguyên khoá cũ, nháp cũ vẫn đọc được).
// - Form trong mini-app (/pass-do/dang-tin — `scope`): một nháp mỗi tính năng (`KEY:<tính năng>`) → không ghi đè / không xoá
//   nháp của tính năng khác ở KEY chung. Mini-app vẫn đọc nháp KEY chung nếu nó thuộc đúng tính năng (nháp tạo ở /dang-tin
//   trước đó) và chỉ xoá KEY chung khi nháp đó thuộc tính năng của mini-app.
import type { ListingCategory, ListingFeature } from '@hp/shared';
import { LISTING_CATEGORIES } from '@hp/shared';
import type { FormValues } from '../../form-values';

const KEY = 'hp:listing-form:v1';
const listeners = new Set<() => void>();

export type StoredDraft = { feature: ListingFeature; category: ListingCategory; values: FormValues };

const keyOf = (scope?: ListingFeature) => (scope ? `${KEY}:${scope}` : KEY);

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Bỏ qua.
  }
}

export function subscribeDraft(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Chuỗi thô (snapshot ổn định theo giá trị cho useSyncExternalStore). `scope` (mini-app): nháp riêng của tính năng, không
 * có thì nháp KEY chung nếu thuộc đúng tính năng.
 */
export function readDraftRaw(scope?: ListingFeature): string | null {
  if (!scope) return read(KEY);
  const own = read(keyOf(scope));
  if (own) return own;
  const shared = read(KEY);
  return parseDraft(shared)?.feature === scope ? shared : null;
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

/** `scope` (mini-app) → khoá riêng của tính năng; nháp KEY chung (có thể của tính năng khác) giữ nguyên. */
export function writeDraft(draft: StoredDraft, scope?: ListingFeature): void {
  try {
    window.localStorage.setItem(keyOf(scope), JSON.stringify(draft));
  } catch {
    // Hết dung lượng / bị chặn: bỏ qua.
  }
}

/** Không `scope`: xoá nháp KEY chung. `scope`: xoá nháp riêng + nháp KEY chung chỉ khi thuộc đúng tính năng đó. */
export function clearDraft(scope?: ListingFeature): void {
  if (scope) {
    remove(keyOf(scope));
    if (parseDraft(read(KEY))?.feature === scope) remove(KEY);
  } else {
    remove(KEY);
  }
  for (const l of listeners) l();
}

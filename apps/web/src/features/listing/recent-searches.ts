'use client';

// Từ khoá tìm gần đây của mini-app (trang bộ lọc "Tìm gần đây") — chỉ trên trình duyệt này (localStorage, tối đa 8, mới
// nhất trước, không trùng — so không phân biệt hoa thường), theo tính năng. localStorage bọc try / catch: chế độ riêng tư /
// bị chặn → danh sách rỗng, không lỗi. Server render coi như rỗng (không lệch hydrate).
import type { ListingFeature } from '@hp/shared';
import { useCallback, useSyncExternalStore } from 'react';

const LIMIT = 8;
const EMPTY: readonly string[] = [];
const keyOf = (feature: ListingFeature) => `hp:recent-search:${feature}`;
const listeners = new Set<() => void>();
/** Ảnh chụp theo chuỗi gốc → mảng ổn định cho useSyncExternalStore. */
const snapshots = new Map<string, { raw: string | null; list: readonly string[] }>();

function read(feature: ListingFeature): readonly string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(keyOf(feature));
  } catch {
    return EMPTY;
  }
  const cached = snapshots.get(feature);
  if (cached && cached.raw === raw) return cached.list;
  let list: readonly string[] = EMPTY;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed.filter((v): v is string => typeof v === 'string').slice(0, LIMIT);
  } catch {
    list = EMPTY;
  }
  snapshots.set(feature, { raw, list });
  return list;
}

function write(feature: ListingFeature, list: readonly string[]) {
  try {
    window.localStorage.setItem(keyOf(feature), JSON.stringify(list.slice(0, LIMIT)));
  } catch {
    // Không lưu được: bỏ qua.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/** Ghi một từ khoá (gọi khi gửi tìm kiếm / mở trang kết quả có ?q=). */
export function rememberSearch(feature: ListingFeature, query: string) {
  const q = query.trim();
  if (!q) return;
  const rest = read(feature).filter((v) => v.toLocaleLowerCase() !== q.toLocaleLowerCase());
  write(feature, [q, ...rest]);
}

export function useRecentSearches(feature: ListingFeature) {
  const list = useSyncExternalStore(
    subscribe,
    () => read(feature),
    () => EMPTY,
  );
  const remove = useCallback((query: string) => write(feature, read(feature).filter((v) => v !== query)), [feature]);
  const clear = useCallback(() => write(feature, []), [feature]);
  return { list, remove, clear };
}

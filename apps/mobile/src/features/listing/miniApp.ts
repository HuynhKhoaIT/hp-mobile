// Engine mini-app của tính năng Listing (config.miniApp — Pass đồ → "Chợ Pass Đồ"): ngữ cảnh mini-app (config + khu của
// super app), state bộ lọc dùng chung trang chủ + màn Bộ lọc, lịch sử tìm kiếm. Chỉ gọi lại engine (useListingBrowser) —
// không gọi supabase, không khai báo query key.
//
// State bộ lọc: một "phiên" mỗi lần mở mini-app (layout mini/[feature] mở phiên khi mount, đóng khi rời) trong store
// Zustand chỉ trong bộ nhớ (không persist): trang chủ đọc / sửa qua useMiniBrowser, màn Bộ lọc chép state làm bản nháp
// rồi "Áp dụng" ghi lại. Danh sách tính năng / Khám phá / Tìm kiếm vẫn dùng state cục bộ của useListingBrowser như cũ.
// Lịch sử tìm kiếm: 8 từ khoá gần nhất mỗi tính năng, persist MMKV (chỉ trên máy).
import type { ListingFeature } from '@hp/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kv, storage } from '@/core/storage';
import { initialBrowserState, type ListingBrowserInitial, type ListingBrowserState, useListingBrowser } from './hooks';
import type { ListingFeatureConfig, ListingMiniAppConfig } from './types';

/** Config của tính năng có mini-app (đã kiểm `miniApp`). */
export type MiniAppFeatureConfig = ListingFeatureConfig & {
  key: ListingFeature;
  slug: Exclude<ListingFeatureConfig['slug'], 'all'>;
  miniApp: ListingMiniAppConfig;
};

export const isMiniAppConfig = (config: ListingFeatureConfig | undefined): config is MiniAppFeatureConfig =>
  !!config?.miniApp && config.slug !== 'all' && config.key !== 'all';

/** Khu (sites) tối giản cho header / chip "Gần {khu}". */
export type MiniAppSite = { code: string; name: string };

/**
 * Ngữ cảnh mini-app do layout mini/[feature] cấp: config, id phiên bộ lọc, khu đang chọn của super app (useHomeSite của
 * Hub — cùng nguồn, đổi ở đây là đổi cả Hub).
 */
export type MiniAppContextValue = {
  config: MiniAppFeatureConfig;
  session: string;
  site: MiniAppSite | null;
  sites: readonly MiniAppSite[];
  siteLoading: boolean;
  changeSite: (code: string) => void;
};

export const MiniAppContext = createContext<MiniAppContextValue | null>(null);

export function useMiniApp(): MiniAppContextValue {
  const value = useContext(MiniAppContext);
  if (!value) throw new Error('useMiniApp must be used inside mini/[feature] layout');
  return value;
}

// ── Phiên bộ lọc ─────────────────────────────────────────────────────────────────

const useMiniStore = create<{ sessions: Readonly<Record<string, ListingBrowserState>> }>(() => ({ sessions: {} }));
let sessionSeq = 0;

function writeSession(id: string, state: ListingBrowserState) {
  useMiniStore.setState((s) => ({ sessions: { ...s.sessions, [id]: state } }));
}

/** Phiên mới: id `{slug}:{số tăng dần}` + ghi state ban đầu. */
function openSession(config: MiniAppFeatureConfig, init: ListingBrowserState) {
  sessionSeq += 1;
  const id = `${config.slug}:${sessionSeq}`;
  writeSession(id, init);
  return { id, init };
}

/**
 * Mở phiên bộ lọc khi layout mini-app mount (bộ lọc đặt sẵn từ link: khu / "Tìm nhanh" / category), đóng khi rời. Mở lại
 * mini-app → phiên mới (bộ lọc sạch). Effect tự ghi lại phiên nếu bị dọn (StrictMode chạy cleanup hai lần ở dev).
 */
export function useMiniSession(config: MiniAppFeatureConfig, initial: ListingBrowserInitial): string {
  // Một lần cho mỗi lần mount: id phiên + state ban đầu (ghi ngay để màn con đọc được bộ lọc đặt sẵn ở lần render đầu).
  const [session] = useState(() => openSession(config, initialBrowserState(config, initial)));
  useEffect(() => {
    if (!useMiniStore.getState().sessions[session.id]) writeSession(session.id, session.init);
    return () =>
      useMiniStore.setState((s) => {
        const rest = { ...s.sessions };
        delete rest[session.id];
        return { sessions: rest };
      });
  }, [session]);
  return session.id;
}

/** State + ghi state của phiên đang mở (màn Bộ lọc: đọc làm bản nháp, "Áp dụng" ghi lại). */
export function useMiniFilterState() {
  const { config, session } = useMiniApp();
  const fallback = useMemo(() => initialBrowserState(config), [config]);
  const state = useMiniStore((s) => s.sessions[session]) ?? fallback;
  const update = useCallback(
    (fn: (prev: ListingBrowserState) => ListingBrowserState) =>
      useMiniStore.setState((s) => ({ sessions: { ...s.sessions, [session]: fn(s.sessions[session] ?? fallback) } })),
    [session, fallback],
  );
  return { state, update, initial: fallback };
}

/** Danh sách + thao tác lọc của trang chủ mini-app (useListingBrowser trên state của phiên). */
export function useMiniBrowser() {
  const { config } = useMiniApp();
  const store = useMiniFilterState();
  return useListingBrowser(config, {}, store);
}

// ── Lịch sử tìm kiếm ─────────────────────────────────────────────────────────────

const RECENT_MAX = 8;

const useRecentStore = create<{ byFeature: Readonly<Record<string, readonly string[]>> }>()(
  persist(() => ({ byFeature: {} }), { name: 'mini-recent-searches', storage: createJSONStorage(() => kv(storage)) }),
);

const EMPTY: readonly string[] = [];

/** 8 từ khoá gần nhất của tính năng (mới nhất trước, không trùng — so không phân biệt hoa thường). */
export function useRecentSearches(feature: string) {
  const list = useRecentStore((s) => s.byFeature[feature]) ?? EMPTY;
  const write = (fn: (prev: readonly string[]) => readonly string[]) =>
    useRecentStore.setState((s) => ({ byFeature: { ...s.byFeature, [feature]: fn(s.byFeature[feature] ?? EMPTY) } }));
  return {
    list,
    add: (query: string) => {
      const q = query.trim();
      if (!q) return;
      write((prev) => [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_MAX));
    },
    remove: (query: string) => write((prev) => prev.filter((x) => x !== query)),
    clear: () => write(() => EMPTY),
  };
}

'use client';

// Trạng thái theo người dùng của trang chủ (docs/design/home.md §4.1, §4.7, §5) — một nơi cho header, thẻ cá nhân, dải
// "Gần {khu}" và "Dành cho bạn":
// - Phiên + hồ sơ: đọc ở trình duyệt sau khi trang tĩnh đã hiện (trang không đọc cookie → vẫn prerender).
// - Khu đã chọn: profiles.site (đã đăng nhập) → khu lưu trên máy → khu đầu tiên theo sort_order (server truyền vào).
//   Đổi khu: khách chỉ lưu máy; đã đăng nhập ghi profiles.site (updateMyProfile, RLS: chỉ hồ sơ của mình), lỗi → trả lại
//   khu cũ + toast.
// - Dải "Gần {khu}": server render sẵn cho khu mặc định (khách / bot thấy tin thật ngay); khu khác → tải lại ở trình duyệt.
//   Không có danh mục khu (lỗi đọc sites) → dải "Mới đăng" toàn bộ.
import {
  getMyProfile,
  type MyProfile,
  type Result,
  searchListings,
  type Site,
  updateMyProfile,
} from '@hp/core';
import { HOME_RAIL_SIZE } from '@hp/shared';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/shared/toast';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { createBrowserClient } from '@/lib/supabase/client';
import { readStoredSite, storeSite } from '../site-preference';
import type { RailData } from '../types';
import { type Loadable, useLoadable } from '../use-loadable';

export type Viewer =
  | { status: 'loading' }
  | { status: 'guest' }
  /** profile null + profileError: đã đăng nhập nhưng đọc hồ sơ lỗi (thẻ cá nhân hiện lỗi + Thử lại). */
  | { status: 'user'; id: string; profile: MyProfile | null; profileError: string | null };

type HomeContextValue = {
  viewer: Viewer;
  sites: readonly Site[];
  /** Khu đang chọn (null khi không đọc được danh mục khu). */
  site: Site | null;
  chooseSite: (code: string) => void;
  retryProfile: () => void;
  near: Loadable<RailData>;
  retryNear: () => void;
};

const HomeContext = createContext<HomeContextValue | null>(null);

export function useHome(): HomeContextValue {
  const value = useContext(HomeContext);
  if (!value) throw new Error('useHome() must be used inside <HomeProvider>');
  return value;
}

export function HomeProvider({
  sites,
  initialNear,
  children,
}: {
  sites: readonly Site[];
  /** Dải "Gần {khu}" server render sẵn cho khu mặc định (sites[0]); null = lỗi / không có khu. */
  initialNear: { site: string; data: RailData } | null;
  children: ReactNode;
}) {
  const toast = useToast();
  const errorText = useErrorText();
  const [viewer, setViewer] = useState<Viewer>({ status: 'loading' });
  const [siteCode, setSiteCode] = useState<string | null>(sites[0]?.code ?? null);
  const [attempt, setAttempt] = useState(0);

  const isSite = useCallback((code: string | null | undefined): code is string => !!code && sites.some((s) => s.code === code), [sites]);

  useEffect(() => {
    let active = true;
    const client = createBrowserClient();
    void (async () => {
      const { data } = await client.auth.getSession();
      if (!active) return;
      const stored = readStoredSite();
      if (isSite(stored)) setSiteCode(stored);
      const uid = data.session?.user.id;
      if (!uid) {
        setViewer({ status: 'guest' });
        return;
      }
      const res = await getMyProfile(client);
      if (!active) return;
      if (res.error) {
        // Phiên hết hạn / bị thu hồi → như khách.
        setViewer(
          res.error.code === 'auth_required' ? { status: 'guest' } : { status: 'user', id: uid, profile: null, profileError: res.error.code },
        );
        return;
      }
      setViewer({ status: 'user', id: uid, profile: res.data, profileError: null });
      if (isSite(res.data.site)) {
        setSiteCode(res.data.site);
        storeSite(res.data.site);
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, isSite]);

  const retryProfile = useCallback(() => {
    setViewer({ status: 'loading' });
    setAttempt((a) => a + 1);
  }, []);

  const chooseSite = useCallback(
    (code: string) => {
      if (!isSite(code) || code === siteCode) return;
      const previous = siteCode;
      setSiteCode(code);
      storeSite(code);
      if (viewer.status !== 'user' || !viewer.profile) return;
      void updateMyProfile(createBrowserClient(), { site: code }).then((res) => {
        if (res.error) {
          setSiteCode(previous);
          if (previous) storeSite(previous);
          toast.show(errorText(res.error.code), 'error');
          return;
        }
        setViewer((v) => (v.status === 'user' ? { ...v, profile: res.data } : v));
      });
    },
    [errorText, isSite, siteCode, toast, viewer],
  );

  const loadNear = useCallback(async (): Promise<Result<RailData>> => {
    const res = await searchListings(createBrowserClient(), { site: siteCode ?? undefined, limit: HOME_RAIL_SIZE.near });
    return res.error ? res : { data: { items: res.data.items, now: Date.now() }, error: null };
  }, [siteCode]);
  const [near, retryNear] = useLoadable(
    `near:${siteCode ?? '*'}`,
    loadNear,
    initialNear ? { key: `near:${initialNear.site}`, data: initialNear.data } : null,
  );

  const value = useMemo<HomeContextValue>(
    () => ({
      viewer,
      sites,
      site: sites.find((s) => s.code === siteCode) ?? null,
      chooseSite,
      retryProfile,
      near,
      retryNear,
    }),
    [viewer, sites, siteCode, chooseSite, retryProfile, near, retryNear],
  );

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

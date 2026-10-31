// Cài đặt cục bộ của máy (không đồng bộ server): giao diện sáng / tối; khu làm việc đã chọn ở Hub (khách chỉ lưu ở
// máy; đã đăng nhập còn ghi profiles.site). Ngôn ngữ ở i18n.ts (còn ghi profiles.locale).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kv, storage } from './storage';

export type ThemePref = 'system' | 'light' | 'dark';

type SettingsState = {
  themePref: ThemePref;
  setThemePref: (pref: ThemePref) => void;
  /** Mã khu chọn lần trước ở Hub (sites.code) — mặc định khi chưa có profiles.site. */
  homeSite: string | null;
  setHomeSite: (site: string | null) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themePref: 'system',
      setThemePref: (themePref) => set({ themePref }),
      homeSite: null,
      setHomeSite: (homeSite) => set({ homeSite }),
    }),
    { name: 'settings', storage: createJSONStorage(() => kv(storage)) },
  ),
);

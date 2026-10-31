// Cài đặt cục bộ của máy (không đồng bộ server): giao diện sáng / tối. Ngôn ngữ ở i18n.ts (còn ghi profiles.locale).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kv, storage } from './storage';

export type ThemePref = 'system' | 'light' | 'dark';

type SettingsState = {
  themePref: ThemePref;
  setThemePref: (pref: ThemePref) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themePref: 'system',
      setThemePref: (themePref) => set({ themePref }),
    }),
    { name: 'settings', storage: createJSONStorage(() => kv(storage)) },
  ),
);

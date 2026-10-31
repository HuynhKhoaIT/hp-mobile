// Bản nháp cục bộ (app-only, capabilities.offlineDrafts): Zustand + MMKV. Form đăng tin tự lưu (debounce 500ms)
// để thoát app / mất mạng không mất nội dung đang soạn; xoá khi đăng xong hoặc người dùng bỏ.
// Khác "Lưu nháp" trên server (status draft) — cái đó đồng bộ với web.
import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kv, storage } from '../storage';

const DEBOUNCE_MS = 500;

type DraftState = {
  drafts: Record<string, { value: unknown; savedAt: number }>;
  put: (key: string, value: unknown) => void;
  remove: (key: string) => void;
};

const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      put: (key, value) => set((s) => ({ drafts: { ...s.drafts, [key]: { value, savedAt: Date.now() } } })),
      remove: (key) =>
        set((s) => {
          const { [key]: _removed, ...rest } = s.drafts;
          return { drafts: rest };
        }),
    }),
    { name: 'drafts', storage: createJSONStorage(() => kv(storage)), partialize: (s) => ({ drafts: s.drafts }) },
  ),
);

/**
 * Đọc bản nháp đã lưu (một lần lúc mở form) + lưu (debounce) + xoá. `key` null → tắt (vd form sửa tin).
 * Kiểu T do nơi gọi đảm bảo (cùng một form ghi và đọc).
 */
export function useDraft<T>(key: string | null) {
  const [initial] = useState<T | null>(() => (key ? ((useDraftStore.getState().drafts[key]?.value as T | undefined) ?? null) : null));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const save = useCallback(
    (value: T) => {
      if (!key) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => useDraftStore.getState().put(key, value), DEBOUNCE_MS);
    },
    [key],
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (key) useDraftStore.getState().remove(key);
  }, [key]);

  return { initial, save, clear };
}

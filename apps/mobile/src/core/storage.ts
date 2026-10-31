// MMKV: lưu trữ đồng bộ, nhanh hơn AsyncStorage. Tách instance theo mục đích để xoá riêng được
// (đăng xuất xoá `hp-auth`, đổi phiên bản bỏ `hp-query-cache`).
// MMKV là module native → cần development build (expo-dev-client), không chạy trong Expo Go.
import { createMMKV, type MMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'hp' });
export const authStorage = createMMKV({ id: 'hp-auth' });
export const queryCacheStorage = createMMKV({ id: 'hp-query-cache' });

/** Adapter kiểu Web Storage cho supabase-js, TanStack persister, zustand persist. */
export function kv(instance: MMKV) {
  return {
    getItem: (key: string): string | null => instance.getString(key) ?? null,
    setItem: (key: string, value: string): void => instance.set(key, value),
    removeItem: (key: string): void => {
      instance.remove(key);
    },
  };
}

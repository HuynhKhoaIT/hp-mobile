// TanStack Query: staleTime 60s cho danh sách, cache persist qua MMKV để mở app có dữ liệu ngay (CLAUDE.md mục 9).
import { QueryClient, focusManager } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { kv, queryCacheStorage } from '../storage';

const DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    // refetchOnWindowFocus bật riêng cho chat và thông báo (.claude/rules/mobile-performance.md).
    queries: { staleTime: 60_000, gcTime: DAY, retry: 2, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

export const persistOptions = {
  persister: createSyncStoragePersister({ storage: kv(queryCacheStorage), throttleTime: 1000 }),
  maxAge: DAY,
  // Đổi phiên bản app → bỏ cache cũ (tránh dữ liệu sai hình dạng sau khi đổi API).
  buster: Constants.expoConfig?.version ?? '0',
};

// Quay lại app → refetch query đã cũ (React Native không có sự kiện focus cửa sổ).
AppState.addEventListener('change', (state) => {
  focusManager.setFocused(state === 'active');
});

// Query key chỉ lấy từ @hp/core (không khai báo key ở app).
export { keys } from '@hp/core';

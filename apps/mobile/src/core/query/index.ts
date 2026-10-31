// TanStack Query: staleTime 60s cho danh sách, cache persist qua MMKV để mở app có dữ liệu ngay (CLAUDE.md mục 9).
import { QueryClient, focusManager } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { kv, queryCacheStorage } from '../storage';

const DAY = 24 * 60 * 60 * 1000;

/** Lỗi thử lại cũng không đổi kết quả (AppError.code của @hp/core) → báo ngay (vd "Tin không còn"). */
const NO_RETRY = new Set(['not_found', 'invalid_input', 'forbidden', 'auth_required', 'banned']);
const shouldRetry = (failureCount: number, error: unknown) =>
  failureCount < 2 && !NO_RETRY.has((error as { code?: string } | null)?.code ?? '');

export const queryClient = new QueryClient({
  defaultOptions: {
    // refetchOnWindowFocus bật riêng cho chat và thông báo (.claude/rules/mobile-performance.md).
    queries: { staleTime: 60_000, gcTime: DAY, retry: shouldRetry, refetchOnWindowFocus: false },
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

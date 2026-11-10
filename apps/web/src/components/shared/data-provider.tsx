'use client';

// Dữ liệu phía trình duyệt của khu người dùng (app/[locale]/(app)/layout.tsx): TanStack Query + SupabaseProvider để dùng
// hook chung @hp/core/react (chat, thông báo, báo cáo / chặn — giống app). Realtime hộp thư + thông báo gắn MỘT lần ở đây:
// chấm đỏ tin nhắn / chuông trên header và thanh dưới cập nhật khi tab đang mở. Khách: hook tự tắt (không có phiên).
// Không persist cache (khác app): web mở lại tab là đọc mới; TanStack tự làm mới query cũ khi tab được focus lại.
import { SupabaseProvider, useInboxRealtime, useNotificationsRealtime } from '@hp/core/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { createProviderClient } from '@/lib/supabase/client';

/** Lỗi thử lại cũng không đổi kết quả (AppError.code của @hp/core) → báo ngay. Giống app (apps/mobile/src/core/query). */
const NO_RETRY = new Set(['not_found', 'invalid_input', 'forbidden', 'auth_required', 'banned']);
const shouldRetry = (failureCount: number, error: unknown) =>
  failureCount < 2 && !NO_RETRY.has((error as { code?: string } | null)?.code ?? '');

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, retry: shouldRetry },
      mutations: { retry: 0 },
    },
  });
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createProviderClient);
  const [queryClient] = useState(makeQueryClient);
  return (
    <SupabaseProvider client={client}>
      <QueryClientProvider client={queryClient}>
        <RealtimeBridge />
        {children}
      </QueryClientProvider>
    </SupabaseProvider>
  );
}

/** Nghe tin nhắn mới (mọi hội thoại) + thông báo mới của mình → làm mới hộp thư và hai số chưa đọc. */
function RealtimeBridge() {
  useInboxRealtime();
  useNotificationsRealtime();
  return null;
}

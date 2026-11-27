'use client';

// Lỗi đọc trang Gọi thợ: khối lỗi + thử lại, giữ header / dải tab của mini-app.
import { ErrorState } from '@/components/shared/error-state';

export default function GoiThoError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}

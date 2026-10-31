'use client';

// error.tsx của các trang tin (danh sách + chi tiết): lỗi đọc dữ liệu → khối lỗi + nút thử lại (reset), giữ header / footer.
// queries.ts ném lỗi thay vì cache kết quả lỗi, nên thử lại sẽ đọc lại thật.
import { ErrorState } from '@/components/shared/error-state';
import { useRouter } from '@/i18n/navigation';

export function ListingErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
      <ErrorState
        onRetry={() => {
          // refresh: tải lại dữ liệu server; reset: dựng lại cây lỗi.
          router.refresh();
          reset();
        }}
      />
    </section>
  );
}

'use client';

// error.tsx của các trang tin (danh sách + chi tiết): lỗi đọc dữ liệu → khối lỗi + nút thử lại (reset), giữ header / footer.
// queries.ts ném lỗi thay vì cache kết quả lỗi, nên thử lại sẽ đọc lại thật.
// RefreshErrorState: lỗi mà Server Component tự hiện (không ném — vd form đăng / sửa tin không đọc được hồ sơ) → khối lỗi theo
// mã + "Thử lại" = router.refresh() (dựng lại phần server của trang, đọc lại dữ liệu theo request).
import { ErrorState } from '@/components/shared/error-state';
import { useRouter } from '@/i18n/navigation';

export function RefreshErrorState({ code }: { code: string }) {
  const router = useRouter();
  return <ErrorState code={code} onRetry={() => router.refresh()} />;
}

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

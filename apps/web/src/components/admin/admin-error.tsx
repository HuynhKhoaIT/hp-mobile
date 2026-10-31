'use client';

// error.tsx của các trang admin: lỗi đọc dữ liệu (queries ném lỗi) → khối lỗi + thử lại, giữ thanh bên / thanh trên.
// Mã lỗi errors.* lấy từ message khi có (queries ném Error(code)); production Next che message → errors.unknown.
import { ErrorState } from '@/components/shared/error-state';
import { useRouter } from '@/i18n/navigation';

export function AdminErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const code = /^[a-z_]+$/.test(error.message) ? error.message : 'unknown';
  return (
    <section className="flex flex-1 flex-col px-4 py-8 lg:px-8">
      <ErrorState
        code={code}
        onRetry={() => {
          router.refresh();
          reset();
        }}
      />
    </section>
  );
}

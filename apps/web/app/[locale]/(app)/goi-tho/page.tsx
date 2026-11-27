// /goi-tho — trang chủ mini-app Gọi thợ: "Việc quanh bạn" (yêu cầu đang mở, lọc theo loại thợ / từ khoá). Công khai nhưng noindex.
// Dữ liệu đọc ở trình duyệt qua hook @hp/core/react (khung tĩnh = skeleton).
import type { Metadata } from 'next';
import { ClientOnly } from '@/components/shared/client-only';
import { RequestCardSkeleton } from '@/features/goi-tho/components/request-card';
import { RequestBrowser } from '@/features/goi-tho/components/request-browser';
import { goiThoMetadata } from '@/features/goi-tho/metadata';

export function generateMetadata(): Promise<Metadata> {
  return goiThoMetadata('home');
}

export default function Page() {
  return (
    <ClientOnly
      fallback={
        <ul className="mx-auto grid w-full max-w-6xl gap-3 px-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <RequestCardSkeleton />
            </li>
          ))}
        </ul>
      }
    >
      <RequestBrowser />
    </ClientOnly>
  );
}

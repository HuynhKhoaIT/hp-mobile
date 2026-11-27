// /goi-tho/cua-toi — "Của tôi": yêu cầu mình đăng + báo giá mình đã gửi. Cần đăng nhập (proxy.ts); noindex. Dữ liệu riêng đọc ở
// trình duyệt qua hook @hp/core/react (khung tĩnh = skeleton).
import type { Metadata } from 'next';
import { ClientOnly } from '@/components/shared/client-only';
import { RequestCardSkeleton } from '@/features/goi-tho/components/request-card';
import { MyView } from '@/features/goi-tho/components/my-view';
import { goiThoMetadata } from '@/features/goi-tho/metadata';

export function generateMetadata(): Promise<Metadata> {
  return goiThoMetadata('mine');
}

export default function Page() {
  return (
    <ClientOnly
      fallback={
        <ul className="mx-auto grid w-full max-w-6xl gap-3 px-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <RequestCardSkeleton />
            </li>
          ))}
        </ul>
      }
    >
      <MyView />
    </ClientOnly>
  );
}

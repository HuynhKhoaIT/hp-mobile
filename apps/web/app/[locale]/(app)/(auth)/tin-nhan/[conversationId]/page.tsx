// /tin-nhan/[conversationId] — khung chat một hội thoại (cột phải của layout /tin-nhan). Dữ liệu đọc ở trình duyệt
// (@hp/core/react, RLS: chỉ thành viên); id không hợp lệ / không phải thành viên → "Không tìm thấy cuộc trò chuyện".
import { Suspense } from 'react';
import { ThreadSkeleton } from '@/features/chat/components/chat-skeletons';
import { ThreadFromParams } from '@/features/chat/components/thread-from-params';

// Cache Components cần ít nhất một giá trị tham số để dựng khung tĩnh (layout dùng usePathname / segment — giống
// /toi/tin-cua-toi/[id]/sua). id giữ chỗ: chỉ khung được prerender; id thật đọc trong <Suspense>.
export function generateStaticParams() {
  return [{ conversationId: '00000000-0000-0000-0000-000000000000' }];
}

export default function Page({ params }: PageProps<'/[locale]/tin-nhan/[conversationId]'>) {
  return (
    <Suspense fallback={<ThreadSkeleton />}>
      <ThreadFromParams params={params} />
    </Suspense>
  );
}

// /goi-tho/tin-nhan/[conversationId] — khung chat một hội thoại trong mini-app Gọi thợ (cùng ChatThread của /tin-nhan/[id]; header có
// thẻ yêu cầu), quay lại → hộp thư của mini-app (/goi-tho/tin-nhan). Dữ liệu đọc ở trình duyệt (RLS: chỉ thành viên); cần đăng nhập
// (proxy.ts — tiền tố /goi-tho/tin-nhan); noindex. < 640px phủ toàn màn hình như /tin-nhan/[id]; từ 640px nằm dưới dải tab mini-app.
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ThreadSkeleton } from '@/features/chat/components/chat-skeletons';
import { ThreadFromParams } from '@/features/chat/components/thread-from-params';
import { goiThoMetadata } from '@/features/goi-tho/metadata';
import { GOI_THO_PATHS } from '@/features/goi-tho/trades';

// Cache Components cần ít nhất một giá trị tham số để dựng khung tĩnh (giống /tin-nhan/[conversationId]). id giữ chỗ: chỉ
// khung được prerender; id thật đọc trong <Suspense>.
export function generateStaticParams() {
  return [{ conversationId: '00000000-0000-0000-0000-000000000000' }];
}

export function generateMetadata(): Promise<Metadata> {
  return goiThoMetadata('chat');
}

export default function Page({ params }: PageProps<'/[locale]/goi-tho/tin-nhan/[conversationId]'>) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-6 sm:px-4 sm:pt-6">
      <div className="flex flex-col bg-surface max-sm:fixed max-sm:inset-0 max-sm:z-50 sm:h-chat-panel sm:overflow-hidden sm:rounded-lg sm:border sm:border-border">
        <Suspense fallback={<ThreadSkeleton />}>
          <ThreadFromParams params={params} inboxHref={GOI_THO_PATHS.chat} />
        </Suspense>
      </div>
    </div>
  );
}

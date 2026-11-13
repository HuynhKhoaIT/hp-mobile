// Đọc conversationId từ params (trong <Suspense> của page) rồi dựng khung chat. `key` = id → đổi hội thoại thì ô nhập,
// lỗi, vị trí cuộn bắt đầu lại. Dữ liệu chỉ có ở trình duyệt → server render skeleton (ClientOnly). `inboxHref`: hộp thư để
// quay lại khi khung chat nằm ngoài /tin-nhan (mini-app — /pass-do/tin-nhan).
import { ClientOnly } from '@/components/shared/client-only';
import { ChatThread } from './chat-thread';
import { ThreadSkeleton } from './chat-skeletons';

export async function ThreadFromParams({
  params,
  inboxHref,
}: {
  params: Promise<{ conversationId: string }>;
  inboxHref?: string;
}) {
  const { conversationId } = await params;
  return (
    <ClientOnly fallback={<ThreadSkeleton />}>
      <ChatThread key={conversationId} conversationId={conversationId} inboxHref={inboxHref} />
    </ClientOnly>
  );
}

// Đọc conversationId từ params (trong <Suspense> của page) rồi dựng khung chat. `key` = id → đổi hội thoại thì ô nhập,
// lỗi, vị trí cuộn bắt đầu lại. Dữ liệu chỉ có ở trình duyệt → server render skeleton (ClientOnly).
import { ClientOnly } from '@/components/shared/client-only';
import { ChatThread } from './chat-thread';
import { ThreadSkeleton } from './chat-skeletons';

export async function ThreadFromParams({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return (
    <ClientOnly fallback={<ThreadSkeleton />}>
      <ChatThread key={conversationId} conversationId={conversationId} />
    </ClientOnly>
  );
}

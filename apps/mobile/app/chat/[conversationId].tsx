// Screen type: Conversation
// Hội thoại 1-1: mở từ hộp thư, CTA "Nhắn tin" ở chi tiết tin, push new_message (data.params.id).
// Bàn phím do ChatThread xử lý (KeyboardChatScrollView + KeyboardStickyView), không dùng Screen keyboard.
import { useLocalSearchParams } from 'expo-router';
import { ChatThread } from '@/features/chat/components/ChatThread';
import { Screen } from '@/ui';

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  return (
    <Screen edgeToEdge>
      <ChatThread conversationId={conversationId} />
    </Screen>
  );
}

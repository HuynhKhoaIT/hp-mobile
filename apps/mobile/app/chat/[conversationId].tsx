// Screen type: Conversation
// Hội thoại 1-1 / nhóm: mở từ hộp thư, CTA "Nhắn tin" ở chi tiết tin, push new_message (data.params.id).
// Bàn phím do ChatThread xử lý (KeyboardChatScrollView + KeyboardStickyView), không dùng Screen keyboard.
// Header xanh (style Stitch) → chữ / icon thanh trạng thái sáng khi màn đang hiện.
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChatThread } from '@/features/chat/components/ChatThread';
import { Screen, useScheme } from '@/ui';

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const focused = useIsFocused();
  const scheme = useScheme();
  return (
    <Screen edgeToEdge>
      <ChatThread conversationId={conversationId} />
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}

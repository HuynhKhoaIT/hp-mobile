// Screen type: Conversation
// Hội thoại 1-1 / nhóm: mở từ hộp thư, CTA "Nhắn tin" ở chi tiết tin, push new_message (data.params.id).
// Bàn phím do ChatThread xử lý (KeyboardChatScrollView + KeyboardStickyView), không dùng Screen keyboard.
// Header xanh (style Stitch) → chữ / icon thanh trạng thái sáng khi màn đang hiện.
// `?mini=<slug>`: mở từ mini-app (hộp thư / chi tiết tin của mini-app) → màu mini-app, "Xem tin" mở chi tiết trong mini-app.
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChatThread } from '@/features/chat/components/ChatThread';
import { miniThemeOf } from '@/features/configs';
import { isMiniSlug } from '@/features/listing/navigation';
import { AppThemeProvider, Screen, useScheme } from '@/ui';

function ConversationScreenBody() {
  const { conversationId, mini } = useLocalSearchParams<{ conversationId: string; mini?: string }>();
  const focused = useIsFocused();
  const scheme = useScheme();
  return (
    <Screen edgeToEdge>
      <ChatThread conversationId={conversationId} mini={isMiniSlug(mini) ? mini : undefined} />
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}

/** Mở từ mini-app (`?mini=<slug>`) → giữ màu của mini-app (AppThemeProvider); ngoài mini-app không bọc gì. */
export default function ConversationScreen() {
  const { mini } = useLocalSearchParams<{ mini?: string }>();
  return (
    <AppThemeProvider theme={miniThemeOf(mini)}>
      <ConversationScreenBody />
    </AppThemeProvider>
  );
}

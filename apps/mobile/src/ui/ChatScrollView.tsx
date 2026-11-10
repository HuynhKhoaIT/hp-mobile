// ChatScrollView — ScrollView cho danh sách tin nhắn (FlashList `renderScrollComponent`): KeyboardChatScrollView của
// react-native-keyboard-controller đẩy tin lên đúng nhịp bàn phím (kiểu Telegram), iOS + Android edge-to-edge.
// Dùng cùng ô nhập bọc <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}> (màn hội thoại).
// `offset` = vùng an toàn đáy: ô nhập vốn nằm trên vùng này, bàn phím chỉ "ăn thêm" phần còn lại.
import { forwardRef } from 'react';
import type { ScrollViewProps } from 'react-native';
import { KeyboardChatScrollView, type KeyboardChatScrollViewRef } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ChatScrollView = forwardRef<KeyboardChatScrollViewRef, ScrollViewProps>(function ChatScrollView(props, ref) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardChatScrollView
      ref={ref}
      inverted
      offset={insets.bottom}
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      {...props}
    />
  );
});

// Nút "Chat nhóm" ở thanh dính đáy chi tiết nhóm (chủ nhóm / thành viên đã được nhận): lấy id hội thoại nhóm
// (useGroupConversationId — RLS chỉ trả cho thành viên) rồi mở màn chat qua useOpenConversation (lối duy nhất vào chat).
// Vừa tham gia (avatar thêm lạc quan) có thể đã đọc id trước khi server thêm mình vào hội thoại → cache null: bấm thì đọc
// lại rồi mở; vẫn chưa có → toast "Tham gia nhóm để chat cùng mọi người".
import { useGroupConversationId } from '@hp/core/react';
import { MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useOpenConversation } from '@/features/chat/hooks';
import { Button, toast } from '@/ui';

export function GroupChatButton({ groupId }: { groupId: string }) {
  const { t } = useTranslation('group');
  const conversation = useGroupConversationId(groupId);
  const chat = useOpenConversation();

  const open = async () => {
    const id = conversation.data ?? (await conversation.refetch()).data;
    if (id) chat.openGroupChat(id);
    else toast.show(t('chat.join_to_chat'));
  };

  return (
    <Button
      label={t('chat.open')}
      icon={MessageCircle}
      fullWidth
      loading={conversation.isFetching && !conversation.data}
      onPress={() => void open()}
    />
  );
}

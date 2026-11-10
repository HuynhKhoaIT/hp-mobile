// MessageBubble — một tin nhắn trong màn hội thoại. Của mình: nền primary, bên phải, góc dưới phải nhọn; người kia:
// nền surface, bên trái. Ảnh (signed URL hoặc ảnh cục bộ khi đang gửi) bo theo bong bóng. Dòng phụ: giờ + trạng thái
// (đang gửi / đã gửi / đã xem); lỗi → chữ đỏ "Chưa gửi được. Chạm để gửi lại" (không truyền tin chỉ bằng màu).
// Chat nhóm: `author` (tin của người khác) → tên người gửi phía trên tin đầu chuỗi (`showAuthor`) + avatar nhỏ bên trái
// tin cuối chuỗi (`showAvatar`); tin giữa chuỗi chừa chỗ avatar để bong bóng thẳng hàng.
import { CircleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { Image } from './interop';
import { Text } from './Text';
import { useTheme } from './theme';

export type MessageStatus = 'sending' | 'sent' | 'seen' | 'failed';

export type MessageBubbleProps = {
  mine: boolean;
  body?: string | null;
  /** URL ảnh đã ký hoặc uri cục bộ. `imagePending` = có ảnh nhưng chưa lấy được URL. */
  imageUri?: string | null;
  imagePending?: boolean;
  time: string;
  /** Chỉ tin của mình. Không truyền → không hiện dòng trạng thái. */
  status?: MessageStatus;
  /** Hiện giờ / trạng thái (tắt cho tin giữa chuỗi liên tiếp). */
  showMeta?: boolean;
  onRetry?: () => void;
  onLongPress?: () => void;
  /** Chat nhóm, tin của người khác: tên ("An N.") + ảnh đại diện người gửi. */
  author?: { name: string; avatarUri?: string | null };
  /** Hiện tên người gửi (tin đầu chuỗi liên tiếp). */
  showAuthor?: boolean;
  /** Hiện avatar (tin cuối chuỗi liên tiếp). */
  showAvatar?: boolean;
};

export function MessageBubble({
  mine,
  body,
  imageUri,
  imagePending = false,
  time,
  status,
  showMeta = true,
  onRetry,
  onLongPress,
  author,
  showAuthor = false,
  showAvatar = false,
}: MessageBubbleProps) {
  const { t } = useTranslation('chat');
  const theme = useTheme();
  const failed = status === 'failed';
  const statusText =
    status === 'sending' ? t('thread.sending') : status === 'seen' ? t('thread.seen') : status === 'sent' ? t('thread.sent') : null;
  const hasImage = !!imageUri || imagePending;
  const withAuthor = !!author && !mine;

  const content = (
    <View className={[withAuthor ? 'flex-1' : 'w-full', 'gap-1', mine ? 'items-end' : 'items-start'].join(' ')}>
      {withAuthor && showAuthor ? (
        <Text variant="caption" tone="muted" weight="medium" numberOfLines={1} className="px-1">
          {author.name}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole={failed ? 'button' : undefined}
        accessibilityLabel={[withAuthor ? author.name : null, body, hasImage ? t('thread.image_alt') : null, time, failed ? t('thread.failed') : statusText]
          .filter(Boolean)
          .join(', ')}
        disabled={!failed && !onLongPress}
        onPress={failed ? onRetry : undefined}
        onLongPress={onLongPress}
        className={[
          'max-w-xs overflow-hidden rounded-xl',
          mine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm border border-border bg-surface',
          failed ? 'opacity-70' : '',
        ].join(' ')}
      >
        {hasImage ? (
          imageUri ? (
            <Image
              source={{ uri: imageUri }}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={t('thread.image_alt')}
              className="aspect-square w-56 bg-surface-2"
            />
          ) : (
            <View className="aspect-square w-56 items-center justify-center bg-surface-2">
              <ActivityIndicator color={theme.colors.textMuted} />
            </View>
          )
        ) : null}
        {body ? (
          <Text tone={mine ? 'onPrimary' : 'default'} className="px-3 py-2" selectable>
            {body}
          </Text>
        ) : null}
      </Pressable>
      {failed ? (
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8} className="flex-row items-center gap-1">
          <Icon icon={CircleAlert} tone="danger" />
          <Text variant="caption" tone="danger">
            {t('thread.failed')}
          </Text>
        </Pressable>
      ) : showMeta ? (
        <Text variant="caption" tone="muted">
          {statusText && mine ? `${time} · ${statusText}` : time}
        </Text>
      ) : null}
    </View>
  );

  if (!withAuthor) return content;
  return (
    <View className="w-full flex-row items-end gap-2">
      {/* Avatar cạnh đáy bong bóng cuối chuỗi; tin khác chừa đúng bề rộng avatar (size-8). */}
      <View className="size-8">{showAvatar ? <Avatar uri={author.avatarUri} name={author.name} size="sm" /> : null}</View>
      {content}
    </View>
  );
}

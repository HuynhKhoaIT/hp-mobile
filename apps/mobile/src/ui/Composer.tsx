// Composer — ô nhập tin nhắn đáy màn hội thoại (style Stitch): thanh nền surface viền trên + shadow-bar · nút ảnh · ô chữ
// nhiều dòng viên thuốc (nền surface-2 viền border, tự cao tới ~5 dòng) · nút gửi tròn nền accent (cam, icon on-accent,
// shadow-fab khi gửi được). Nút gửi chỉ bật khi có chữ; vượt giới hạn ký tự → báo đỏ ngay dưới ô (không cắt chữ người dùng
// gõ). `disabledText` (vd đã chặn) thay cả thanh bằng một dòng giải thích + hành động phụ.
import { ImagePlus, SendHorizontal } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';
import { Button } from './Button';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { AnimatedView } from './interop';
import { Text } from './Text';
import { useTheme } from './theme';
import { usePressScale } from './usePressScale';

export type ComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPickImage?: () => void;
  maxLength: number;
  /** Lỗi nội dung từ server / kiểm tra trước (vd có SĐT, từ thô tục) — hiện đỏ dưới ô, giữ nguyên chữ. */
  error?: string;
  /** Thay ô nhập bằng thông báo (bị chặn, tài khoản bị khoá…). */
  disabledText?: string;
  disabledAction?: { label: string; onPress: () => void };
};

export function Composer({ value, onChangeText, onSend, onPickImage, maxLength, error, disabledText, disabledAction }: ComposerProps) {
  const { t } = useTranslation('chat');
  const theme = useTheme();
  const tooLong = value.length > maxLength;
  const canSend = value.trim().length > 0 && !tooLong;
  const press = usePressScale();

  if (disabledText) {
    return (
      <View className="items-center gap-2 border-t border-border bg-surface px-4 py-3">
        <Text tone="muted" className="text-center">
          {disabledText}
        </Text>
        {disabledAction ? <Button label={disabledAction.label} variant="outline" size="sm" onPress={disabledAction.onPress} /> : null}
      </View>
    );
  }

  return (
    <View className="gap-1 border-t border-border bg-surface px-2 py-2 shadow-bar">
      <View className="flex-row items-end gap-1.5">
        {onPickImage ? <IconButton icon={ImagePlus} accessibilityLabel={t('thread.attach_image')} tone="primary" onPress={onPickImage} /> : null}
        <View className={['min-h-11 flex-1 justify-center rounded-xl border bg-surface-2 px-4', tooLong || error ? 'border-danger' : 'border-border'].join(' ')}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={t('thread.placeholder')}
            accessibilityLabel={t('thread.placeholder')}
            placeholderTextColor={theme.colors.textDisabled}
            selectionColor={theme.colors.primary}
            maxFontSizeMultiplier={1.5}
            multiline
            textAlignVertical="center"
            className="max-h-32 py-2 font-sans text-md text-fg"
          />
        </View>
        <AnimatedView style={press.style}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('thread.send')}
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            hitSlop={4}
            onPressIn={press.onPressIn}
            onPressOut={press.onPressOut}
            onPress={onSend}
            className={['h-11 w-11 items-center justify-center rounded-full bg-accent', canSend ? 'shadow-fab' : 'opacity-50'].join(' ')}
          >
            <Icon icon={SendHorizontal} tone="onAccent" />
          </Pressable>
        </AnimatedView>
      </View>
      {tooLong || error ? (
        <Text variant="caption" tone="danger" className="px-2" accessibilityLiveRegion="polite">
          {tooLong ? t('thread.too_long', { max: maxLength }) : error}
        </Text>
      ) : null}
    </View>
  );
}

// SearchBar — ô tìm kiếm: icon kính lúp, bàn phím nút "Tìm", nút xoá từ khoá khi có chữ. Cao 48, chữ 16.
// Tìm khi bấm Tìm trên bàn phím (onSubmit) — không gọi server theo từng ký tự (mạng yếu).
import { Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { useTheme } from './theme';

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  /** Xoá từ khoá. Mặc định: đổi chữ về rỗng rồi tìm lại (bỏ lọc theo từ khoá). */
  onClear?: () => void;
  placeholder?: string;
  className?: string;
};

export function SearchBar({ value, onChangeText, onSubmit, onClear, placeholder, className }: SearchBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const clear =
    onClear ??
    (() => {
      onChangeText('');
      onSubmit('');
    });
  return (
    <View
      className={['min-h-12 flex-row items-center gap-2 rounded-full border border-border bg-surface pl-4', className]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon icon={Search} tone="muted" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={(e) => onSubmit(e.nativeEvent.text)}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        maxFontSizeMultiplier={1.5}
        placeholderTextColor={theme.colors.textDisabled}
        selectionColor={theme.colors.primary}
        className="min-h-12 flex-1 py-3 font-sans text-md text-fg"
      />
      {value ? (
        <IconButton icon={X} accessibilityLabel={t('listing:list.clear_search')} onPress={clear} tone="muted" size="button" />
      ) : (
        <View className="w-3" />
      )}
    </View>
  );
}

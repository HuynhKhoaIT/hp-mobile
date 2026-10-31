// SearchBar — ô tìm kiếm: icon kính lúp, bàn phím nút "Tìm", nút xoá từ khoá khi có chữ. Cao 48, chữ 16.
// Tìm khi bấm Tìm trên bàn phím (onSubmit) — không gọi server theo từng ký tự (mạng yếu).
// Có `onPress` → chỉ là nút trông như ô tìm kiếm (Hub → mở màn Tìm kiếm).
import { Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { useTheme } from './theme';

type SearchBarInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  /** Xoá từ khoá. Mặc định: đổi chữ về rỗng rồi tìm lại (bỏ lọc theo từ khoá). */
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onPress?: undefined;
};

type SearchBarButtonProps = { onPress: () => void; placeholder?: string; className?: string };

export type SearchBarProps = SearchBarInputProps | SearchBarButtonProps;

const BOX = 'min-h-12 flex-row items-center gap-2 rounded-full border border-border bg-surface pl-4';

export function SearchBar(props: SearchBarProps) {
  if (props.onPress) {
    const { onPress, placeholder, className } = props;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={placeholder}
        onPress={onPress}
        className={[BOX, 'pr-4 active:opacity-80', className].filter(Boolean).join(' ')}
      >
        <Icon icon={Search} tone="muted" />
        <Text tone="disabled" numberOfLines={1} className="flex-1 py-3">
          {placeholder}
        </Text>
      </Pressable>
    );
  }
  return <SearchInput {...props} />;
}

function SearchInput({ value, onChangeText, onSubmit, onClear, placeholder, className, autoFocus }: SearchBarInputProps) {
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
      className={[BOX, className].filter(Boolean).join(' ')}
    >
      <Icon icon={Search} tone="muted" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={(e) => onSubmit(e.nativeEvent.text)}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoFocus={autoFocus}
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

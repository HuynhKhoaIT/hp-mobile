// ImagePicker — lưới ảnh của form đăng tin: ô "Thêm ảnh" (đếm n/max), ảnh đầu là ảnh bìa (có nhãn), trạng thái
// từng ảnh (đang tải / lỗi). Chạm một ảnh → BottomSheet: Đặt làm ảnh bìa · Tải lại · Xoá ảnh (nút lớn, dùng một tay).
// Chỉ hiển thị: chọn ảnh từ máy (expo-image-picker), nén, upload do feature + src/core/upload làm.
import { CircleAlert, ImagePlus, RotateCw, Star, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Icon } from './Icon';
import { Image } from './interop';
import { Text } from './Text';
import { useTheme } from './theme';

export type ImagePickerItemStatus = 'idle' | 'uploading' | 'done' | 'error';
export type ImagePickerItem = { key: string; uri: string; status: ImagePickerItemStatus };

export type ImagePickerProps = {
  items: ImagePickerItem[];
  max: number;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onMakeCover: (key: string) => void;
  onRetry?: (key: string) => void;
  /** Đang đăng / đang tải: khoá thêm, xoá, đổi bìa. */
  disabled?: boolean;
};

export function ImagePicker({ items, max, onAdd, onRemove, onMakeCover, onRetry, disabled = false }: ImagePickerProps) {
  const { t } = useTranslation('listing');
  const theme = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const selectedIndex = items.findIndex((i) => i.key === selected);
  const current = selectedIndex >= 0 ? items[selectedIndex] : undefined;
  const close = () => setSelected(null);
  const canAdd = items.length < max && !disabled;

  return (
    <View className="-m-1 flex-row flex-wrap">
      {items.map((item, index) => (
        <View key={item.key} className="w-1/3 p-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={[
              t('detail.image_count', { current: index + 1, total: items.length }),
              index === 0 ? t('form.cover') : null,
              item.status === 'error' ? t('errors:upload_failed') : null,
            ]
              .filter(Boolean)
              .join(', ')}
            accessibilityState={{ disabled }}
            disabled={disabled && item.status !== 'error'}
            onPress={() => setSelected(item.key)}
            className="aspect-avatar w-full overflow-hidden rounded-md bg-surface-2"
          >
            <Image source={{ uri: item.uri }} contentFit="cover" className="h-full w-full" accessibilityIgnoresInvertColors />
            {index === 0 ? (
              <View className="absolute bottom-1 left-1 rounded-full bg-primary px-2 py-0.5">
                <Text variant="caption" tone="onPrimary">
                  {t('form.cover')}
                </Text>
              </View>
            ) : null}
            {item.status === 'uploading' ? (
              <View className="absolute inset-0 items-center justify-center bg-bg/60">
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : item.status === 'error' ? (
              <View className="absolute inset-0 items-center justify-center gap-1 bg-bg/70 p-1">
                <Icon icon={CircleAlert} tone="danger" />
                <Text variant="caption" tone="danger" className="text-center">
                  {t('form.photo_failed')}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      ))}
      {items.length < max ? (
        <View className="w-1/3 p-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('form.add_photo')}, ${items.length}/${max}`}
            accessibilityState={{ disabled: !canAdd }}
            disabled={!canAdd}
            onPress={onAdd}
            className={[
              'aspect-avatar w-full items-center justify-center gap-1 rounded-md border border-dashed border-primary bg-primary-light active:opacity-80',
              !canAdd && 'opacity-50',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Icon icon={ImagePlus} tone="primary" size="tab" />
            <Text variant="caption" tone="primary" className="text-center">
              {t('form.add_photo')}
            </Text>
            <Text variant="caption" tone="primary">
              {items.length}/{max}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <BottomSheet
        open={!!current}
        onClose={close}
        title={current ? t('detail.image_count', { current: selectedIndex + 1, total: items.length }) : undefined}
      >
        {current ? (
          <View className="gap-2">
            {current.status === 'error' && onRetry ? (
              <Button
                label={t('form.upload_retry')}
                icon={RotateCw}
                fullWidth
                onPress={() => {
                  close();
                  onRetry(current.key);
                }}
              />
            ) : null}
            {selectedIndex > 0 ? (
              <Button
                label={t('form.make_cover')}
                icon={Star}
                variant="outline"
                fullWidth
                disabled={disabled}
                onPress={() => {
                  close();
                  onMakeCover(current.key);
                }}
              />
            ) : null}
            <Button
              label={t('form.remove_photo')}
              icon={Trash2}
              variant="outline"
              fullWidth
              disabled={disabled}
              onPress={() => {
                close();
                onRemove(current.key);
              }}
            />
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

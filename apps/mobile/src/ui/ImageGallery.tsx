// ImageGallery — ảnh chi tiết tin: vuốt ngang từng ảnh (4:3), đếm "Ảnh 2/5". expo-image cache memory-disk.
// Không có ảnh → màn chi tiết hiện ListingCover (ô giữ chỗ màu dịch vụ) thay vì component này.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Image } from './interop';
import { Text } from './Text';
import { useTheme } from './theme';

export type ImageGalleryProps = {
  uris: string[];
  /** Mô tả ảnh cho trình đọc màn hình (vd tiêu đề tin). */
  accessibilityLabel: string;
};

export function ImageGallery({ uris, accessibilityLabel }: ImageGalleryProps) {
  const { t } = useTranslation();
  const { motion } = useTheme();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const total = uris.length;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      className="aspect-card w-full overflow-hidden rounded-md bg-surface-2"
    >
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {uris.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={motion.fast.duration}
              accessibilityIgnoresInvertColors
              className="h-full"
              style={{ width }}
            />
          ))}
        </ScrollView>
      ) : null}
      {total > 1 ? (
        <View className="absolute bottom-2 right-2 rounded-full bg-surface px-3 py-1">
          <Text variant="caption">{t('listing:detail.image_count', { current: index + 1, total })}</Text>
        </View>
      ) : null}
    </View>
  );
}

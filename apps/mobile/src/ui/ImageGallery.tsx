// ImageGallery — ảnh chi tiết tin: vuốt ngang từng ảnh (4:3), đếm "Ảnh 2/5" (icon máy ảnh). expo-image cache memory-disk.
// `bleed` (chi tiết tin, style Stitch): tràn mép màn (-mx-4, bù padding 16 của Screen), không bo góc.
// `thumbnails`: hàng ảnh nhỏ size-16 dưới ảnh chính (≥ 2 ảnh) — chạm để nhảy tới ảnh đó; ảnh đang xem viền primary.
// Không có ảnh → màn chi tiết hiện ListingCover (ô giữ chỗ màu dịch vụ) thay vì component này.
import { Camera } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, type ScrollViewInstance, View } from 'react-native';
import { Icon } from './Icon';
import { Image } from './interop';
import { Text } from './Text';
import { useTheme } from './theme';

export type ImageGalleryProps = {
  uris: string[];
  /** Mô tả ảnh cho trình đọc màn hình (vd tiêu đề tin). */
  accessibilityLabel: string;
  /** Tràn mép màn, không bo góc (đặt trong vùng có padding ngang 16). */
  bleed?: boolean;
  /** Hàng ảnh nhỏ chọn ảnh (chỉ hiện khi ≥ 2 ảnh); `uris` của ảnh nhỏ, mặc định dùng lại `uris`. */
  thumbnails?: boolean | string[];
};

export function ImageGallery({ uris, accessibilityLabel, bleed = false, thumbnails = false }: ImageGalleryProps) {
  const { t } = useTranslation();
  const { motion } = useTheme();
  const scroller = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const total = uris.length;
  const thumbs = Array.isArray(thumbnails) ? thumbnails : thumbnails ? uris : [];

  const go = (i: number) => {
    setIndex(i);
    scroller.current?.scrollTo({ x: i * width, animated: true });
  };

  return (
    <View className={bleed ? '-mx-4 gap-3' : 'gap-3'}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        className={['aspect-card w-full overflow-hidden bg-surface-2', bleed ? '' : 'rounded-md'].filter(Boolean).join(' ')}
      >
        {width > 0 ? (
          <ScrollView
            ref={scroller}
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
          <View className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded-full bg-surface px-3 py-1 shadow-card">
            <Icon icon={Camera} size={16} tone="muted" />
            <Text variant="caption" weight="medium" accessibilityLiveRegion="polite">
              {t('listing:detail.image_count', { current: index + 1, total })}
            </Text>
          </View>
        ) : null}
      </View>
      {thumbs.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName={['gap-2', bleed ? 'px-4' : ''].filter(Boolean).join(' ')}
        >
          {thumbs.map((uri, i) => (
            <Pressable
              key={uri}
              accessibilityRole="button"
              accessibilityLabel={t('listing:detail.image_thumb', { current: i + 1, total })}
              accessibilityState={{ selected: i === index }}
              onPress={() => go(i)}
              className={[
                'size-16 overflow-hidden rounded-md border-2',
                i === index ? 'border-primary' : 'border-transparent opacity-70',
              ].join(' ')}
            >
              <Image source={{ uri }} contentFit="cover" cachePolicy="memory-disk" accessibilityIgnoresInvertColors className="size-full" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

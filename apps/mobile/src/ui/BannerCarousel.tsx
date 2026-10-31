// BannerCarousel — banner trượt ngang ở Hub (docs/design/home.md §4.4, §6, §10). Tràn mép màn: mỗi slide rộng bằng
// khối nội dung (màn − 2 × 16), cách nhau 12, dừng đúng đầu slide (snap). Khung tối thiểu 16:7 (`aspect.banner`),
// rounded-xl. Slide ảnh: ảnh phủ kín. Slide chữ theo tone — primary / accent: nền đậm, chữ on-*, nút CTA nền surface;
// dịch vụ: nền service-soft, chữ fg, icon dịch vụ 64 góc phải dưới (mờ 90%), nút CTA nền primary. Nội dung p-5:
// tiêu đề text-xl 700 tối đa 2 dòng, phụ đề text-sm 90% tối đa 2 dòng, nút h-9 px-4 rounded-full text-sm 600 (cả slide
// là một vùng bấm — nút chỉ là gợi ý). Phóng chữ 150%: slide cao thêm theo nội dung (minHeight), mọi slide cao bằng nhau.
// Chấm vị trí dưới banner gap-1.5: hiện tại w-5 primary, còn lại w-1.5 border; co giãn motion.fast.
// Tự chuyển 5 giây (chuyển cảnh motion.base), dừng khi chạm / kéo (chạy lại 5 giây sau khi thả), khi màn không hiển thị
// (`active`), khi bấm nút dừng; tắt hẳn khi Reduce Motion. Mỗi slide đọc "Banner 1 / 3: tiêu đề. phụ đề".
import { aspect } from '@hp/tokens';
import { Pause, Play } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { LinearTransition, scrollTo, useAnimatedReaction, useAnimatedRef, useSharedValue, withSpring } from 'react-native-reanimated';
import { Icon } from './Icon';
import { AnimatedScrollView, AnimatedView, Image } from './interop';
import { SERVICE, type ServiceKey } from './service';
import { Text, type TextTone } from './Text';
import { useReducedMotion, useTheme } from './theme';

export type BannerTone = 'primary' | 'accent' | ServiceKey;

export type BannerSlide = {
  id: string;
  title: string;
  subtitle?: string | null;
  ctaLabel?: string | null;
  /** URL ảnh đầy đủ (bucket banners); có ảnh → slide ảnh. */
  imageUri?: string | null;
  tone: BannerTone;
  /** false: slide chỉ để đọc (không có link) — không phải nút. */
  linked?: boolean;
};

export type BannerCarouselProps = {
  slides: BannerSlide[];
  onPress?: (slide: BannerSlide, index: number) => void;
  /** false khi màn bị che / rời tab → dừng tự chuyển. */
  active?: boolean;
  className?: string;
};

const AUTOPLAY_MS = 5000;
const [RATIO_W, RATIO_H] = aspect.banner.split('/').map((n) => Number(n.trim())) as [number, number];

type ToneStyle = { box: string; text: TextTone; cta: string; ctaText: TextTone; service?: ServiceKey };

function toneStyle(tone: BannerTone): ToneStyle {
  if (tone === 'primary') return { box: 'bg-primary', text: 'onPrimary', cta: 'bg-surface', ctaText: 'default' };
  if (tone === 'accent') return { box: 'bg-accent', text: 'onAccent', cta: 'bg-surface', ctaText: 'default' };
  return { box: SERVICE[tone].soft, text: 'default', cta: 'bg-primary', ctaText: 'onPrimary', service: tone };
}

export function BannerCarousel({ slides, onPress, active = true, className }: BannerCarouselProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width);
  const [rawIndex, setIndex] = useState(0);
  const [touching, setTouching] = useState(false);
  const [paused, setPaused] = useState(false);
  const ref = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(-1);
  const scrollX = useRef(0);

  const gutter = theme.space[4];
  const gap = theme.space[3];
  const slideWidth = Math.max(width - gutter * 2, 0);
  const interval = slideWidth + gap;
  const minHeight = (slideWidth * RATIO_H) / RATIO_W;
  const count = slides.length;
  // Danh sách đổi (làm mới, đổi ngôn ngữ) mà chỉ số cũ không còn → coi như slide đầu.
  const index = rawIndex < count ? rawIndex : 0;
  const autoplay = count > 1 && !reduced;

  // Tự chuyển: hoạt ảnh offset (spring của motion.base, không vọt quá) → scrollTo mỗi khung hình trên UI thread.
  useAnimatedReaction(
    () => offset.get(),
    (x) => {
      if (x >= 0) scrollTo(ref, x, 0, false);
    },
  );

  const goTo = useCallback(
    (next: number) => {
      const target = next * interval;
      offset.set(scrollX.current);
      offset.set(withSpring(target, { damping: theme.motion.base.damping, stiffness: theme.motion.base.stiffness, overshootClamping: true }));
      setIndex(next);
    },
    [interval, offset, theme.motion.base.damping, theme.motion.base.stiffness],
  );

  useEffect(() => {
    if (!autoplay || touching || paused || !active || interval <= 0) return;
    const timer = setInterval(() => goTo((index + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [active, autoplay, count, goTo, index, interval, paused, touching]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    scrollX.current = x;
    if (interval <= 0) return;
    const i = Math.min(Math.max(Math.round(x / interval), 0), count - 1);
    if (i !== index) setIndex(i);
  };
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== width) setWidth(w);
  };
  const release = () => setTouching(false);

  if (count === 0) return null;

  return (
    <View onLayout={onLayout} accessibilityLabel={t('home.banner.label')} className={['gap-3', className].filter(Boolean).join(' ')}>
      <AnimatedScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={interval}
        snapToAlignment="start"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        onTouchStart={() => setTouching(true)}
        onTouchEnd={release}
        onTouchCancel={release}
        onMomentumScrollEnd={release}
        contentContainerClassName="gap-3 px-4"
      >
        {slides.map((slide, i) => (
          <Slide
            key={slide.id}
            slide={slide}
            width={slideWidth}
            minHeight={minHeight}
            label={`${t('home.banner.slide', { current: i + 1, total: count })}: ${[slide.title, slide.subtitle].filter(Boolean).join('. ')}`}
            onPress={onPress && slide.linked !== false ? () => onPress(slide, i) : undefined}
          />
        ))}
      </AnimatedScrollView>

      {count > 1 ? (
        <View className="min-h-8 flex-row items-center justify-center px-4">
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="flex-row items-center gap-1.5">
            {slides.map((slide, i) => (
              <AnimatedView
                key={slide.id}
                layout={reduced ? undefined : LinearTransition.duration(theme.motion.fast.duration)}
                className={`h-1.5 rounded-full ${i === index ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`}
              />
            ))}
          </View>
          {autoplay ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={paused ? t('home.banner.play') : t('home.banner.pause')}
              onPress={() => setPaused((p) => !p)}
              hitSlop={6}
              className="absolute right-4 size-8 items-center justify-center rounded-full active:bg-surface-2"
            >
              <Icon icon={paused ? Play : Pause} tone="muted" size={16} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Slide({
  slide,
  width,
  minHeight,
  label,
  onPress,
}: {
  slide: BannerSlide;
  width: number;
  minHeight: number;
  label: string;
  onPress?: () => void;
}) {
  const { motion } = useTheme();
  const box = { width, minHeight };
  if (slide.imageUri) {
    return (
      <Pressable
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={label}
        onPress={onPress}
        style={box}
        className="overflow-hidden rounded-xl bg-surface-2 active:opacity-90"
      >
        <Image
          source={{ uri: slide.imageUri }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={motion.fast.duration}
          accessibilityIgnoresInvertColors
          className="absolute inset-0"
        />
      </Pressable>
    );
  }
  const s = toneStyle(slide.tone);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={label}
      onPress={onPress}
      style={box}
      className={`overflow-hidden rounded-xl active:opacity-90 ${s.box}`}
    >
      {s.service ? (
        <View className="absolute bottom-4 right-4 opacity-90">
          <Icon icon={SERVICE[s.service].icon} service={s.service} size={64} />
        </View>
      ) : null}
      <View className={`flex-1 justify-between gap-3 p-5 ${s.service ? 'pr-20' : ''}`}>
        <View className="gap-1">
          <Text variant="titleLg" weight="bold" tone={s.text} numberOfLines={2}>
            {slide.title}
          </Text>
          {slide.subtitle ? (
            <Text variant="caption" tone={s.text} numberOfLines={2} className="opacity-90">
              {slide.subtitle}
            </Text>
          ) : null}
        </View>
        {slide.ctaLabel ? (
          <View className={`min-h-9 justify-center self-start rounded-full px-4 ${s.cta}`}>
            <Text variant="caption" weight="semibold" tone={s.ctaText}>
              {slide.ctaLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

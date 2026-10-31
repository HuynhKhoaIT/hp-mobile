// Banner Hub (§4.4): bảng `banners` placement app_home theo ngôn ngữ (useBanners). Đang tải → khung 16:7 chờ + chấm;
// lỗi → ErrorState gọn ở khối này; không có banner → ẩn cả khối. Bấm → event home_banner_click + mở link
// (đường dẫn web nội bộ → màn app tương ứng; https → trình duyệt).
import type { Banner } from '@hp/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { track } from '@/core/analytics';
import { bannerImageUrl } from '@/lib/images';
import { BannerCarousel, type BannerSlide, type BannerTone, ErrorState, Skeleton } from '@/ui';
import { useHomeBanners } from '../hooks';
import { openWebLink } from '../navigation';

/** banners.tone (DB, kebab-case) → tone của BannerCarousel. */
function toneOf(tone: Banner['tone']): BannerTone {
  switch (tone) {
    case 'lost-found':
      return 'lostFound';
    case 'accent':
    case 'pass':
    case 'room':
    case 'job':
    case 'ride':
    case 'sport':
      return tone;
    default:
      return 'primary';
  }
}

function toSlide(b: Banner): BannerSlide {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    ctaLabel: b.link_url ? b.cta_label : null,
    imageUri: b.image_path ? bannerImageUrl(b.image_path) : null,
    tone: toneOf(b.tone),
    linked: !!b.link_url,
  };
}

export function HomeBanners({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const banners = useHomeBanners();
  const list = banners.data ?? [];

  if (banners.isLoading) {
    return (
      <View className="gap-3 px-4">
        <Skeleton className="aspect-banner w-full rounded-xl" />
        <View className="min-h-8 flex-row items-center justify-center gap-1.5">
          <Skeleton className="h-1.5 w-5 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
        </View>
      </View>
    );
  }
  if (banners.isError) {
    return (
      <ErrorState compact className="mx-4" title={t('home.section_error')} code={banners.error.code} onRetry={() => void banners.refetch()} />
    );
  }
  if (list.length === 0) return null;

  return (
    <BannerCarousel
      active={active}
      slides={list.map(toSlide)}
      onPress={(slide) => {
        const banner = list.find((b) => b.id === slide.id);
        if (!banner?.link_url) return;
        track('home_banner_click', { banner_id: banner.id });
        openWebLink(banner.link_url);
      }}
    />
  );
}

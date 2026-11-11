// Banner trượt theo placement (bảng `banners` theo ngôn ngữ — useBanners): Hub 'app_home', trang chủ riêng của tính năng
// (config.home.bannerPlacement, vd 'app_pass'). Đang tải → khung 16:7 chờ + chấm; lỗi → ErrorState gọn có Thử lại, hoặc
// ẩn (`hideOnError` — banner chỉ là khuyến mãi, không chặn trang); không có banner → ẩn cả khối. Bấm → `onBannerPress`
// (analytics) rồi mở link (đường dẫn web nội bộ → màn app tương ứng; https → trình duyệt). Lề 16 nằm trong khối.
import type { Banner } from '@hp/core';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { bannerImageUrl } from '@/lib/images';
import { openWebLink } from '@/lib/urls';
import { BannerCarousel, type BannerSlide, type BannerTone, ErrorState, Skeleton } from '@/ui';
import { usePlacementBanners } from '../hooks';

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

export type PlacementBannersProps = {
  placement: Banner['placement'];
  /** Màn đang hiện → tự chuyển slide (BannerCarousel `active`). */
  active: boolean;
  /** Lỗi tải → ẩn khối thay vì ErrorState. */
  hideOnError?: boolean;
  /** Gọi trước khi mở link của banner (analytics). */
  onBannerPress?: (banner: Banner) => void;
};

export function PlacementBanners({ placement, active, hideOnError = false, onBannerPress }: PlacementBannersProps) {
  const { t } = useTranslation();
  // Banner theo ngôn ngữ đang dùng (đổi ngôn ngữ → tải bộ banner của ngôn ngữ đó).
  const banners = usePlacementBanners(placement);
  const list = banners.data ?? [];

  if (banners.isLoading) {
    return (
      <View className="gap-3 px-4">
        <Skeleton className="aspect-banner w-full rounded-lg" />
        <View className="min-h-8 flex-row items-center justify-center gap-1.5">
          <Skeleton className="h-1.5 w-5 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
        </View>
      </View>
    );
  }
  if (banners.isError) {
    if (hideOnError) return null;
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
        onBannerPress?.(banner);
        openWebLink(banner.link_url);
      }}
    />
  );
}

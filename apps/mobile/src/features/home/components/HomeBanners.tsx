// Banner Hub (§4.4): placement app_home qua khối dùng chung PlacementBanners (engine listing) — đang tải → khung 16:7 chờ
// + chấm; lỗi → ErrorState gọn ở khối này; không có banner → ẩn cả khối. Bấm → event home_banner_click + mở link
// (đường dẫn web nội bộ → màn app tương ứng; https → trình duyệt).
import { track } from '@/core/analytics';
import { PlacementBanners } from '@/features/listing/components/PlacementBanners';

export function HomeBanners({ active }: { active: boolean }) {
  return (
    <PlacementBanners placement="app_home" active={active} onBannerPress={(banner) => track('home_banner_click', { banner_id: banner.id })} />
  );
}

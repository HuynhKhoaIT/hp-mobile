// Tìm việc — chỉ là config cho engine features/listing (quy tắc vàng).
// Stitch L1: lọc nhanh ca ngày / ca đêm; thẻ có nhãn ca làm; mẹo không nộp phí để được nhận việc.
// Stitch L2 (form): thẻ danh mục có icon; ca làm + lương lên bước Thông tin chính (việc làm không có ô giá).
// Stitch L3 ("Danh sách việc làm ca kíp"): chip lọc nhanh thêm "Ca xoay"; thẻ có dòng người đăng (nhà tuyển dụng + dấu xác
// minh) và nút tim lưu tin.
// Mini-app "Việc Làm Dung Quất": bấm Tìm việc ở super app mở mini/job — màu chàm (appThemes.job), trang chủ bố cục 'directory'
// (loại việc + ô Ca ngày / Ca đêm / Ca xoay, chip nhanh, khối "Tìm việc an tâm", danh sách thẻ hàng, khối mời nhà tuyển dụng),
// Đã lưu, Chat, Quản lý tin, Bộ lọc. Không có thẻ nổi bật (home.featured — tin việc ít ảnh) và không có "Đã bán": việc làm chỉ
// "Đóng tin" nên Quản lý tin không có tab / số liệu "Đã bán" (featureListingsTabs của @hp/core). Không có banner placement riêng.
import { LISTING_FEATURES } from '@hp/shared';
import { Briefcase, CirclePlus, Clock3, Megaphone, Moon, RefreshCw, Sun } from 'lucide-react-native';
import type { ListingFeatureConfig } from '@/features/listing/types';

export const jobConfig: ListingFeatureConfig = {
  key: 'job',
  slug: 'job',
  categories: LISTING_FEATURES.job,
  color: 'job',
  titleKey: 'common:feature.job',
  subtitleKey: 'listing:list.subtitle_job',
  tipKey: 'listing:tip.job',
  quickFilters: [
    { key: 'shift', value: 'day' },
    { key: 'shift', value: 'night' },
    { key: 'shift', value: 'rotating' },
  ],
  // Tin việc ít ảnh, cần đọc lương + khu → thẻ hàng ngang, một cột.
  card: { variant: 'row', estimatedHeight: 180, display: { facts: ['shift'], owner: true, bookmark: true } },
  filters: ['subcategory', 'site'],
  categoryIcons: { job_main: Briefcase, job_parttime: Clock3 },
  form: {
    photos: 'optional',
    price: false,
    defaultPriceType: 'negotiable',
    primaryAttributes: ['shift', 'pay_type', 'salary_min', 'salary_max'],
  },
  miniApp: {
    titleKey: 'listing:mini_app.title.job',
    subtitleKey: 'listing:mini_app.subtitle.job',
    homeTabKey: 'listing:mini_app.tabs.home.job',
    icon: Briefcase,
    homeTabIcon: Briefcase,
    home: {
      layout: 'directory',
      badgeKey: 'listing:mini_app.job.badge',
      nearLabelKey: 'listing:mini_app.job.near_label',
      categoriesTitleKey: 'listing:mini_app.job.categories_title',
      // Ca làm = thông số enum `shift` (cùng giá trị với chip lọc nhanh ở trên).
      extraTiles: [
        {
          key: 'day',
          labelKey: 'listing:mini_app.job.tile_day',
          hintKey: 'listing:mini_app.job.tile_day_hint',
          icon: Sun,
          filter: { attributes: { shift: 'day' } },
        },
        {
          key: 'night',
          labelKey: 'listing:mini_app.job.tile_night',
          hintKey: 'listing:mini_app.job.tile_night_hint',
          icon: Moon,
          filter: { attributes: { shift: 'night' } },
        },
        {
          key: 'rotating',
          labelKey: 'listing:mini_app.job.tile_rotating',
          hintKey: 'listing:mini_app.job.tile_rotating_hint',
          icon: RefreshCw,
          filter: { attributes: { shift: 'rotating' } },
        },
      ],
      trust: { titleKey: 'listing:mini_app.job.trust_title', bodyKey: 'listing:mini_app.job.trust_body' },
      list: { titleKey: 'listing:mini_app.job.list_title', subtitleKey: 'listing:mini_app.job.list_subtitle' },
      promo: {
        eyebrowKey: 'listing:mini_app.job.employer_eyebrow',
        titleKey: 'listing:mini_app.job.employer_title',
        bodyKey: 'listing:mini_app.job.employer_body',
        ctaKey: 'listing:mini_app.job.employer_cta',
        category: 'job_main',
        icon: Megaphone,
        ctaIcon: CirclePlus,
      },
    },
  },
  detail: {
    primaryCta: 'chat',
    primaryCtaKey: 'listing:mini_app.job_detail.contact_cta',
    titleKey: 'listing:mini_app.job_detail.title',
    availabilityKey: 'listing:mini_app.job_detail.open',
    texts: { owner: 'listing:mini_app.job_detail.employer_title', updated: 'listing:mini_app.job_detail.updated' },
  },
};

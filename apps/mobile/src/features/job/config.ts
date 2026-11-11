// Tìm việc — chỉ là config cho engine features/listing (quy tắc vàng).
// Stitch L1: lọc nhanh ca ngày / ca đêm; thẻ có nhãn ca làm; mẹo không nộp phí để được nhận việc.
// Stitch L2 (form): thẻ danh mục có icon; ca làm + lương lên bước Thông tin chính (việc làm không có ô giá).
import { LISTING_FEATURES } from '@hp/shared';
import { Briefcase, Clock3 } from 'lucide-react-native';
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
  ],
  // Tin việc ít ảnh, cần đọc lương + khu → thẻ hàng ngang, một cột.
  card: { variant: 'row', estimatedHeight: 150, display: { facts: ['shift'] } },
  filters: ['subcategory', 'site'],
  categoryIcons: { job_main: Briefcase, job_parttime: Clock3 },
  form: {
    photos: 'optional',
    price: false,
    defaultPriceType: 'negotiable',
    primaryAttributes: ['shift', 'pay_type', 'salary_min', 'salary_max'],
  },
  detail: { primaryCta: 'chat' },
};

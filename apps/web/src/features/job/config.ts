// Tìm việc — /viec-lam. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES } from '@hp/shared';
import { Briefcase, Clock3 } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';

export const jobConfig: ListingFeatureConfig = {
  feature: 'job',
  path: LISTING_FEATURE_PATHS.job,
  categories: LISTING_FEATURES.job,
  Icon: Briefcase,
  tone: { soft: 'bg-service-job-soft', fg: 'text-service-job' },
  cardLayout: 'row',
  jsonLd: 'job',
  // Stitch L1 (khớp app): lọc nhanh ca ngày / ca đêm, thẻ có nhãn ca làm, mẹo không nộp phí để được nhận việc.
  // Stitch L3 ("Danh sách việc làm ca kíp", khớp app): thêm chip "Ca xoay"; thẻ có dòng người đăng (+ dấu xác minh) và tim lưu tin.
  card: { facts: ['shift'], owner: true, bookmark: true },
  quickFilters: [
    { key: 'shift', value: 'day' },
    { key: 'shift', value: 'night' },
    { key: 'shift', value: 'rotating' },
  ],
  tipKey: 'listing.tip.job',
  primaryCta: 'chat',
  // Stitch L2 (khớp app): thẻ danh mục có icon; ca làm + lương lên bước Thông tin chính (việc làm không có ô giá).
  categoryIcons: { job_main: Briefcase, job_parttime: Clock3 },
  form: { primaryAttributes: ['shift', 'pay_type', 'salary_min', 'salary_max'] },
};

// Tìm việc — /viec-lam. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES } from '@hp/shared';
import { Briefcase, Clock3, Moon, RefreshCw, Sun } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';
import { miniAppPaths } from '@/features/listing/mini-app-routes';

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
  // Mini-app "Việc Làm Dung Quất" (khớp app mini/job): màu chàm, header + trang chủ kiểu 'directory' như Nhà Trọ nhưng danh sách
  // là thẻ hàng ngang (`latest` — tin việc ít ảnh nên không có thẻ lớn `featured`), ô Ca ngày / Ca đêm / Ca xoay (?shift=). Không có
  // banner placement riêng và không có "Đã bán" (việc làm chỉ Đóng tin → Quản lý tin không có tab "Đã bán": featureListingsTabs).
  miniApp: {
    titleKey: 'listing.mini_app.title.job',
    subtitleKey: 'listing.mini_app.subtitle.job',
    homeTabKey: 'listing.mini_app.tabs.home.job',
    theme: 'job',
    HomeIcon: Briefcase,
    header: { variant: 'directory', badgeKey: 'listing.mini_app.job.badge', nearLabelKey: 'listing.mini_app.job.near_label' },
    home: ['tiles', 'chips', 'trust', 'latest', 'promo'],
    tiles: {
      titleKey: 'listing.mini_app.job.categories_title',
      items: [
        { kind: 'category', category: 'job_main' },
        { kind: 'category', category: 'job_parttime' },
        {
          kind: 'filter',
          key: 'day',
          labelKey: 'listing.mini_app.job.tile_day',
          hintKey: 'listing.mini_app.job.tile_day_hint',
          Icon: Sun,
          filter: { attributes: { shift: 'day' } },
        },
        {
          kind: 'filter',
          key: 'night',
          labelKey: 'listing.mini_app.job.tile_night',
          hintKey: 'listing.mini_app.job.tile_night_hint',
          Icon: Moon,
          filter: { attributes: { shift: 'night' } },
        },
        {
          kind: 'filter',
          key: 'rotating',
          labelKey: 'listing.mini_app.job.tile_rotating',
          hintKey: 'listing.mini_app.job.tile_rotating_hint',
          Icon: RefreshCw,
          filter: { attributes: { shift: 'rotating' } },
        },
      ],
    },
    trust: { titleKey: 'listing.mini_app.job.trust_title', bodyKey: 'listing.mini_app.job.trust_body' },
    list: { titleKey: 'listing.mini_app.job.list_title', subtitleKey: 'listing.mini_app.job.list_subtitle' },
    promo: {
      eyebrowKey: 'listing.mini_app.job.employer_eyebrow',
      titleKey: 'listing.mini_app.job.employer_title',
      bodyKey: 'listing.mini_app.job.employer_body',
      ctaKey: 'listing.mini_app.job.employer_cta',
      category: 'job_main',
    },
    filter: {
      categoryTitleKey: 'listing.mini_app.job.filter.category_title',
      locationHintKey: 'listing.mini_app.job.filter.location_hint',
    },
    savedTip: { titleKey: 'listing.mini_app.job.saved.tip_title', bodyKey: 'listing.mini_app.job.saved.tip_body' },
    paths: miniAppPaths(LISTING_FEATURE_PATHS.job),
  },
  detail: {
    activeStatusKey: 'listing.mini_app.job_detail.open',
    ownerBadge: 'employer',
    updatedLine: { key: 'listing.mini_app.job_detail.updated' },
    primaryLabelKey: 'listing.mini_app.job_detail.contact_cta',
    posterTitleKey: 'listing.mini_app.job_detail.employer_title',
  },
};

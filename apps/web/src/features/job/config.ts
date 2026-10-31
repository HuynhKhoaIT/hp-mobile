// Tìm việc — /viec-lam. Chỉ khác biệt so với tính năng Listing khác; logic chung ở features/listing.
import { LISTING_FEATURE_PATHS } from '@hp/core';
import { LISTING_FEATURES } from '@hp/shared';
import { Briefcase } from 'lucide-react';
import type { ListingFeatureConfig } from '@/features/listing/feature-config';

export const jobConfig: ListingFeatureConfig = {
  feature: 'job',
  path: LISTING_FEATURE_PATHS.job,
  categories: LISTING_FEATURES.job,
  Icon: Briefcase,
  tone: { soft: 'bg-service-job-soft', fg: 'text-service-job' },
  cardLayout: 'row',
  jsonLd: 'job',
};

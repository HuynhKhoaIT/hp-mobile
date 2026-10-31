// Sổ đăng ký 4 tính năng Listing → config. Thứ tự = thứ tự hiện trên /tin (giống Hub của app).
import { featureOfCategory, type ListingCategory, type ListingFeature } from '@hp/shared';
import { jobConfig } from '@/features/job/config';
import { lostFoundConfig } from '@/features/lost-found/config';
import { passConfig } from '@/features/pass/config';
import { roomConfig } from '@/features/room/config';
import type { ListingFeatureConfig } from './feature-config';

export const LISTING_FEATURE_CONFIGS: Record<ListingFeature, ListingFeatureConfig> = {
  pass: passConfig,
  room: roomConfig,
  job: jobConfig,
  lostFound: lostFoundConfig,
};

export const LISTING_FEATURE_ORDER: readonly ListingFeature[] = ['pass', 'room', 'job', 'lostFound'];

export function configOfCategory(category: ListingCategory): ListingFeatureConfig {
  return LISTING_FEATURE_CONFIGS[featureOfCategory(category)];
}

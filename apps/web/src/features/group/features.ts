// Sổ đăng ký 2 tính năng Group → config. Thứ tự = thứ tự trên trang chủ (giống app).
import { GROUP_KINDS, type GroupKind } from '@hp/shared';
import { rideConfig } from '@/features/ride/config';
import { sportConfig } from '@/features/sport/config';
import type { GroupFeatureConfig } from './feature-config';

export const GROUP_FEATURE_CONFIGS: Record<GroupKind, GroupFeatureConfig> = {
  ride: rideConfig,
  sport: sportConfig,
};

export function isGroupKind(value: string): value is GroupKind {
  return (GROUP_KINDS as readonly string[]).includes(value);
}

// Ghép xe về quê — /ghep-xe. Chỉ khác biệt so với tính năng Group khác; logic chung ở features/group.
import { GROUP_SUB_KINDS } from '@hp/shared';
import { Car } from 'lucide-react';
import type { GroupFeatureConfig } from '@/features/group/feature-config';

export const rideConfig: GroupFeatureConfig = {
  kind: 'ride',
  path: '/ghep-xe',
  createPath: '/tao-nhom/ride',
  subKinds: GROUP_SUB_KINDS.ride,
  Icon: Car,
  tone: { soft: 'bg-service-ride-soft', fg: 'text-service-ride', dot: 'bg-service-ride' },
  hasDestination: true,
  hasLineup: false,
  jsonLd: 'event',
};

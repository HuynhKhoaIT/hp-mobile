// Ghép trận — /ghep-tran. Chỉ khác biệt so với tính năng Group khác; logic chung ở features/group.
import { GROUP_SUB_KINDS } from '@hp/shared';
import { Trophy } from 'lucide-react';
import type { GroupFeatureConfig } from '@/features/group/feature-config';

export const sportConfig: GroupFeatureConfig = {
  kind: 'sport',
  path: '/ghep-tran',
  createPath: '/tao-nhom/sport',
  subKinds: GROUP_SUB_KINDS.sport,
  Icon: Trophy,
  tone: { soft: 'bg-service-sport-soft', fg: 'text-service-sport', dot: 'bg-service-sport' },
  hasDestination: false,
  hasLineup: true,
  jsonLd: 'event',
};

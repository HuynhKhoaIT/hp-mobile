// Ảnh đại diện của chat nhóm (hộp thư, header khung chat): ô tròn màu dịch vụ + icon của tính năng (ghép xe / ghép trận,
// lấy từ config — giống ô icon trên GroupCard). Kind lạ / thiếu → icon nhóm chung trên nền primary-light.
import { Users } from 'lucide-react';
import { isGroupKind, GROUP_FEATURE_CONFIGS } from '@/features/group/features';
import { cn } from '@/lib/utils';

const SIZE = { sm: 'size-9', md: 'size-12' } as const;
const ICON = { sm: 'size-5', md: 'size-6' } as const;

export function GroupChatIcon({ kind, size = 'md', className }: { kind: string | null; size?: keyof typeof SIZE; className?: string }) {
  const cfg = kind && isGroupKind(kind) ? GROUP_FEATURE_CONFIGS[kind] : null;
  const Icon = cfg?.Icon ?? Users;
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full', cfg?.tone.soft ?? 'bg-primary-light', SIZE[size], className)}
    >
      <Icon strokeWidth={1.75} className={cn(ICON[size], cfg?.tone.fg ?? 'text-primary')} />
    </span>
  );
}

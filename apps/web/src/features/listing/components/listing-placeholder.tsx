// Ô ảnh khi tin chưa có ảnh: nền màu dịch vụ nhạt + icon tính năng (giống app). Lấp đầy khung cha (khung giữ tỉ lệ).
import type { ListingCategory } from '@hp/shared';
import { cn } from '@/lib/utils';
import { configOfCategory } from '../features';

export function ListingPlaceholder({ category, size = 'md' }: { category: ListingCategory; size?: 'sm' | 'md' | 'lg' }) {
  const { Icon, tone } = configOfCategory(category);
  return (
    <div aria-hidden className={cn('flex size-full items-center justify-center', tone.soft)}>
      <Icon
        strokeWidth={1.75}
        className={cn(tone.fg, size === 'sm' ? 'size-8' : size === 'md' ? 'size-12' : 'size-20')}
      />
    </div>
  );
}

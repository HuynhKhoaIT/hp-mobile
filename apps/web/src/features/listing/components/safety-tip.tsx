// Mẹo an toàn (style Stitch, giống Notice bordered tone warning của app): khung bo lg viền warning/30 nền warning/10, ô icon
// size-10 nền warning/15, tiêu đề đậm + chữ muted (muted trên warning/10 ≈ 4,8:1 sáng, 6,2:1 tối). Chữ riêng theo tính năng
// (config.tipKey) — dùng ở đầu danh sách và trang chi tiết.
import { ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SafetyTip({ title, text, className }: { title: string; text: string; className?: string }) {
  return (
    <aside role="note" className={cn('flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4', className)}>
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning">
        <ShieldAlert strokeWidth={1.75} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-md font-semibold text-fg">{title}</p>
        <p className="text-md text-muted">{text}</p>
      </div>
    </aside>
  );
}

/** Tiêu đề khối có vạch đứng màu (giống SectionHeader `bar` của app) — trang trí, chữ vẫn là heading. */
export function BarHeading({
  as: Tag = 'h2',
  id,
  children,
  tone = 'accent',
  className,
}: {
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
  children: ReactNode;
  tone?: 'accent' | 'primary';
  className?: string;
}) {
  return (
    <Tag id={id} className={cn('flex items-center gap-2 text-lg font-bold text-fg', className)}>
      <span aria-hidden className={cn('h-4 w-1.5 shrink-0 rounded-full', tone === 'accent' ? 'bg-accent' : 'bg-primary')} />
      {children}
    </Tag>
  );
}

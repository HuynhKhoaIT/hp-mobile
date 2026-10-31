'use client';

// Lỗi gọn của một khối trên trang chủ (docs/design/home.md §5): chỉ khối đó hiện lỗi + Thử lại, phần còn lại vẫn dùng được.
import { CloudOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SectionError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const t = useTranslations('common');
  return (
    <div role="alert" className={cn('flex items-center gap-3 rounded-lg bg-surface p-4 shadow-card', className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
        <CloudOff aria-hidden strokeWidth={1.75} className="size-5" />
      </span>
      <p className="min-w-0 flex-1 text-md text-fg">{t('home.section_error')}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t('actions.retry')}
      </Button>
    </div>
  );
}

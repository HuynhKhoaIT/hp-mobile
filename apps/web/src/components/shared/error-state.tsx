'use client';

// ErrorState — khối dữ liệu lỗi: thông báo theo mã lỗi (errors.<code>) + nút thử lại. Không spinner toàn trang.
import { CloudOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function ErrorState({ code = 'unknown', onRetry }: { code?: string; onRetry?: () => void }) {
  const t = useTranslations();
  const message = t.has(`errors.${code}`) ? t(`errors.${code}`) : t('errors.unknown');
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-muted">
        <CloudOff className="size-8" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="text-lg font-semibold text-fg">{t('common.states.error_title')}</p>
      <p className="max-w-sm text-md text-muted">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          {t('common.actions.retry')}
        </Button>
      ) : null}
    </div>
  );
}

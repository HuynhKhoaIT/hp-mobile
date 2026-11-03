'use client';

// ReportDialog — báo cáo tin / nhóm / hồ sơ / tin nhắn: chọn 1 lý do (REPORT_REASONS), mô tả thêm tuỳ chọn, "Gửi báo cáo".
// Giống ReportSheet của app. Chỉ giao diện: gửi do nơi dùng (useReportAction gọi useReport của @hp/core/react).
// Điện thoại: dialog neo đáy như sheet (components/ui/dialog.tsx); từ 640px: hộp thoại giữa màn hình.
import { REPORT_DETAIL_MAX, REPORT_REASONS, type ReportReason, type ReportTarget } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReportTarget;
  pending?: boolean;
  onSubmit: (v: { reason: ReportReason; detail?: string }) => void;
};

export function ReportDialog({ open, onOpenChange, target, pending = false, onSubmit }: ReportDialogProps) {
  const t = useTranslations('common');
  const detailId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');

  // Mở lại dialog → form trống (đặt lại ngay khi render, không qua effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason(null);
      setDetail('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('actions.close')}>
        <DialogHeader>
          <DialogTitle>{t('report.title', { target: t(`report.targets.${target}`) })}</DialogTitle>
          <DialogDescription>{t('report.subtitle')}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason) onSubmit({ reason, detail: detail.trim() || undefined });
          }}
        >
          <fieldset className="overflow-hidden rounded-md border border-border">
            <legend className="sr-only">{t('report.subtitle')}</legend>
            {REPORT_REASONS.map((r, i) => {
              const selected = reason === r;
              return (
                <label
                  key={r}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-focus-visible:ring-inset',
                    i > 0 && 'border-t border-border',
                    selected ? 'bg-primary-light' : 'bg-surface hover:bg-surface-2',
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={selected}
                    onChange={() => setReason(r)}
                    className="size-5 shrink-0 accent-primary"
                  />
                  <span className="flex-1 text-md font-medium text-fg">{t(`report.reasons.${r}`)}</span>
                </label>
              );
            })}
          </fieldset>
          <div className="flex flex-col gap-2">
            <Label htmlFor={detailId}>{t('report.detail_label')}</Label>
            <Textarea
              id={detailId}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={t('report.detail_placeholder')}
              maxLength={REPORT_DETAIL_MAX}
              className="min-h-24"
            />
          </div>
          <Button type="submit" variant="destructive" size="lg" disabled={!reason || pending}>
            {t('report.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

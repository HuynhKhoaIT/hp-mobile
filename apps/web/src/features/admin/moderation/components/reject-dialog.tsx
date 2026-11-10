'use client';

// Xác nhận từ chối (ConfirmDialog có thêm lý do): tiêu đề ghi rõ hành động + đối tượng ("Từ chối tin 'X' của An N.?"),
// bắt buộc chọn một lý do mẫu (admin.reasons.*), ghi chú tự do không bắt buộc (≤ REVIEW_NOTE_MAX). Nút "Từ chối tin".
// Lý do + ghi chú lưu vào moderation_queue.note / audit_log.meta.note dạng "<mã>: <ghi chú>" (composeReviewNote).
import { REJECT_REASONS, type RejectReason, REVIEW_NOTE_MAX } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type RejectTarget = { title: string; owner: string };

export function RejectDialog({
  target,
  onOpenChange,
  onConfirm,
}: {
  /** null = đóng. */
  target: RejectTarget | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: RejectReason, note: string) => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      {/* key: mỗi lần mở cho tin khác thì form trống lại. */}
      {target ? <RejectForm key={`${target.title}-${target.owner}`} target={target} onCancel={() => onOpenChange(false)} onConfirm={onConfirm} /> : null}
    </Dialog>
  );
}

function RejectForm({
  target,
  onCancel,
  onConfirm,
}: {
  target: RejectTarget;
  onCancel: () => void;
  onConfirm: (reason: RejectReason, note: string) => void;
}) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common.actions');
  const id = useId();
  const [reason, setReason] = useState<RejectReason | null>(null);
  const [note, setNote] = useState('');

  return (
    <DialogContent className="sm:max-w-lg" closeLabel={tCommon('close')}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason) onConfirm(reason, note.trim());
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('moderation.reject.title', { title: target.title, owner: target.owner })}</DialogTitle>
          <DialogDescription>{t('moderation.reject.description')}</DialogDescription>
        </DialogHeader>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-md font-medium text-fg">{t('moderation.reject.reason_label')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {REJECT_REASONS.map((r) => {
              const checked = reason === r;
              return (
                <label
                  key={r}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-md transition-colors duration-150 has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                    checked ? 'border-primary bg-primary-light text-primary' : 'border-border bg-surface text-fg hover:bg-surface-2',
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-reason`}
                    value={r}
                    checked={checked}
                    onChange={() => setReason(r)}
                    className="size-4 shrink-0 accent-primary"
                    autoFocus={r === REJECT_REASONS[0]}
                  />
                  {t(`reasons.${r}`)}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-note`}>{t('moderation.reject.note_label')}</Label>
          <Textarea
            id={`${id}-note`}
            value={note}
            maxLength={REVIEW_NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-24"
            aria-describedby={`${id}-note-hint`}
          />
          <p id={`${id}-note-hint`} className="flex justify-between gap-4 text-sm text-muted">
            <span>{t('moderation.reject.note_hint')}</span>
            <span aria-hidden>{t('moderation.reject.note_count', { count: note.length, max: REVIEW_NOTE_MAX })}</span>
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" variant="destructive" disabled={!reason}>
            {t('moderation.reject.confirm')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

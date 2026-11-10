'use client';

// Xin tham gia nhóm cần duyệt: lời nhắn (không bắt buộc, ≤ 200 ký tự) cho chủ nhóm. Lời nhắn có SĐT / từ cấm → Edge
// Function trả message_has_phone / message_profanity → hiện ngay dưới ô (dialog giữ nguyên để sửa).
import { GROUP_RULES } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useErrorText } from '@/features/auth/components/use-error-text';

export function JoinNoteDialog({
  open,
  onOpenChange,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  /** Mã lỗi errors.* của lần gửi trước. */
  error: string | null;
  onSubmit: (note: string) => void;
}) {
  const t = useTranslations();
  const errorText = useErrorText();
  const id = useId();
  const [note, setNote] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('common.actions.close')}>
        <DialogHeader>
          <DialogTitle>{t('group.action.note_title')}</DialogTitle>
          <DialogDescription>{t('group.detail.approval_hint')}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(note.trim());
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={id} className="text-md font-medium text-fg">
              {t('group.action.note_label')}
            </label>
            <Textarea
              id={id}
              value={note}
              rows={3}
              maxLength={GROUP_RULES.noteMax}
              placeholder={t('group.action.note_placeholder')}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(e) => setNote(e.target.value)}
            />
            {error ? (
              <p id={`${id}-error`} className="text-sm text-danger">
                {errorText(error)}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
              {t('group.action.send_request')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

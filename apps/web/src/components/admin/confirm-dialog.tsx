'use client';

// ConfirmDialog (admin) — xác nhận hành động staff: tiêu đề ghi rõ hành động + đối tượng ("Ẩn tin 'X' của An N.?"),
// nút mang tên hành động (không "OK"). Tuỳ chọn: chọn lý do mẫu (radio) và / hoặc ghi chú (bắt buộc hoặc không),
// thêm ô riêng qua `children`. Form trống lại mỗi lần mở (key theo `open`).
import { useTranslations } from 'next-intl';
import { type ReactNode, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type ConfirmValues = { reason: string | null; note: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  /** Lý do mẫu (bắt buộc chọn một). */
  reasons?: { legend: string; options: { value: string; label: string }[] };
  /** Ghi chú tự do. */
  note?: { label: string; hint?: string; required?: boolean; max: number };
  children?: ReactNode;
  /** Chặn nút xác nhận thêm (vd ô riêng trong children chưa hợp lệ). */
  disabled?: boolean;
  onConfirm: (values: ConfirmValues) => void;
};

export function AdminConfirmDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <ConfirmForm {...props} /> : null}
    </Dialog>
  );
}

function ConfirmForm({ title, description, confirmLabel, destructive, pending, reasons, note, children, disabled, onOpenChange, onConfirm }: Props) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common.actions');
  const id = useId();
  const [reason, setReason] = useState<string | null>(null);
  const [text, setText] = useState('');
  const invalid = (reasons && !reason) || (note?.required && !text.trim()) || disabled;

  return (
    <DialogContent className="sm:max-w-lg" closeLabel={tCommon('close')}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!invalid) onConfirm({ reason, note: text.trim() });
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>

        {reasons ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-md font-medium text-fg">{reasons.legend}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {reasons.options.map((o, i) => {
                const checked = reason === o.value;
                return (
                  <label
                    key={o.value}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-md transition-colors duration-150 has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                      checked ? 'border-primary bg-primary-light text-primary' : 'border-border bg-surface text-fg hover:bg-surface-2',
                    )}
                  >
                    <input
                      type="radio"
                      name={`${id}-reason`}
                      value={o.value}
                      checked={checked}
                      onChange={() => setReason(o.value)}
                      className="size-4 shrink-0 accent-primary"
                      autoFocus={i === 0}
                    />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {children}

        {note ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-note`}>{note.label}</Label>
            <Textarea
              id={`${id}-note`}
              value={text}
              maxLength={note.max}
              required={note.required}
              onChange={(e) => setText(e.target.value)}
              className="min-h-24"
              aria-describedby={`${id}-note-hint`}
              autoFocus={!reasons}
            />
            <p id={`${id}-note-hint`} className="flex justify-between gap-4 text-sm text-muted">
              <span>{note.hint ?? ''}</span>
              <span aria-hidden>{t('confirm.count', { count: text.length, max: note.max })}</span>
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={pending || invalid}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

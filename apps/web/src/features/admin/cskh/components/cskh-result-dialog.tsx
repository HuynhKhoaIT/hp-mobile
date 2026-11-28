'use client';

// Hộp thoại "Ghi kết quả" CSKH: trạng thái, kênh đã liên hệ, điểm hài lòng 1–5 (chỉ khi đã liên hệ được) và ghi chú.
// Điểm là ghi chép của staff theo lời khách — không đổi đánh giá thật trong app. Form mount lại mỗi lần mở (state sạch).
import type { CskhItem } from '@hp/core';
import { CSKH_CHANNELS, CSKH_LIMITS, CSKH_SCORE_STATUSES, CSKH_SCORES, CSKH_STATUSES, type CskhChannel, type CskhStatus } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { SELECT_CLASS } from '@/components/admin/field-styles';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAdminAction } from '../../lib/use-admin-action';
import { saveCskhCaseAction } from '../actions';

type Props = { item: CskhItem; open: boolean; onOpenChange: (open: boolean) => void };

export function CskhResultDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open ? <ResultForm {...props} /> : null}
    </Dialog>
  );
}

function ResultForm({ item, onOpenChange }: Props) {
  const t = useTranslations('admin.cskh');
  const tCommon = useTranslations('common.actions');
  const id = useId();
  const { pending, run } = useAdminAction();
  const name = item.user_name ?? t('unknown_user');
  const [status, setStatus] = useState<CskhStatus>(item.status === 'pending' ? 'contacted' : item.status);
  const [channel, setChannel] = useState<CskhChannel | ''>(item.channel ?? '');
  const [score, setScore] = useState<number>(item.score ?? 0);
  const [note, setNote] = useState(item.note ?? '');
  const scoreAllowed = (CSKH_SCORE_STATUSES as readonly string[]).includes(status);

  const submit = () =>
    run(
      () =>
        saveCskhCaseAction({
          requestId: item.request_id,
          party: item.party,
          status,
          channel: channel || undefined,
          note: note.trim() || undefined,
          score: scoreAllowed && score > 0 ? score : undefined,
        }),
      { success: t('toast.saved'), onDone: () => onOpenChange(false) },
    );

  return (
    <DialogContent className="sm:max-w-lg" closeLabel={tCommon('close')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending) submit();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('result.title', { name })}</DialogTitle>
          <DialogDescription>{t('result.hint')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-status`}>{t('result.status_label')}</Label>
            <select id={`${id}-status`} className={SELECT_CLASS} value={status} onChange={(e) => setStatus(e.target.value as CskhStatus)}>
              {CSKH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${id}-channel`}>{t('result.channel_label')}</Label>
            <select id={`${id}-channel`} className={SELECT_CLASS} value={channel} onChange={(e) => setChannel(e.target.value as CskhChannel | '')}>
              <option value="">{t('result.channel_none')}</option>
              {CSKH_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {t(`channel.${c}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {scoreAllowed ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-md font-medium text-fg">{t('result.score_label')}</legend>
            <div className="flex flex-wrap gap-2">
              {[0, ...CSKH_SCORES].map((n) => (
                <label
                  key={n}
                  className={cn(
                    'flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-3 text-md font-medium transition-colors duration-150 has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                    score === n ? 'border-primary bg-primary-light text-primary' : 'border-border bg-surface text-fg hover:bg-surface-2',
                  )}
                >
                  <input type="radio" name={`${id}-score`} value={n} checked={score === n} onChange={() => setScore(n)} className="sr-only" />
                  {n === 0 ? t('result.score_none') : n}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-note`}>{t('result.note_label')}</Label>
          <Textarea id={`${id}-note`} rows={4} maxLength={CSKH_LIMITS.noteMax} value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="text-sm text-muted">{t('result.note_hint')}</p>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={pending}>
            {t('result.save')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

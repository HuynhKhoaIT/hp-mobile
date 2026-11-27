'use client';

// Dialog đánh giá hai chiều sau khi yêu cầu hoàn thành: chủ chấm thợ được chọn, thợ chấm chủ. 5 sao (StarRatingInput, chữ
// mô tả điểm dưới hàng sao dùng chung group.rate.score_*) → nhận xét không bắt buộc (không SĐT) → "Gửi đánh giá" (cần chọn sao).
// Gửi: optimistic (useRateServiceRequest) → toast cảm ơn, đóng dialog; lỗi (already_rated, request_not_completed…) → báo trong
// dialog. Khớp RateRequestSheet của app.
import { SERVICE_REQUEST_RULES } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { StarRatingInput } from '@/components/shared/star-rating-input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { useRequestRating } from '../use-goi-tho';

export function RateRequestDialog({
  open,
  onOpenChange,
  requestId,
  as,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  /** Người đang chấm: chủ yêu cầu → chấm thợ; thợ được chọn → chấm chủ. */
  as: 'customer' | 'pro';
  /** Tên người được chấm ("An N."). */
  name?: string | null;
}) {
  const t = useTranslations();
  const errorText = useErrorText();
  const rating = useRequestRating(requestId, open);
  const labelId = useId();
  const commentId = useId();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const title = t(as === 'customer' ? 'tho.rate.title_customer' : 'tho.rate.title_pro');

  const close = () => {
    setScore(0);
    setComment('');
    setError(null);
    onOpenChange(false);
  };

  const submit = () => {
    if (!score) {
      setError('required');
      return;
    }
    rating.submit(score, comment, { onDone: close, onError: setError });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !rating.pending && (v ? onOpenChange(true) : close())}>
      <DialogContent closeLabel={t('common.actions.close')}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{name ? `${name} — ${t('tho.rate.hint')}` : t('tho.rate.hint')}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <span id={labelId} className="sr-only">
              {title}
            </span>
            <StarRatingInput
              value={score}
              onChange={(n) => {
                setScore(n);
                setError(null);
              }}
              labelledBy={labelId}
              disabled={rating.pending}
              starLabel={(n) => `${t('group.rate.score_label', { count: n })} – ${t(`group.rate.score_${n}`)}`}
            />
            <p aria-live="polite" className="min-h-6 text-md font-medium text-fg">
              {score ? t(`group.rate.score_${score}`) : null}
            </p>
          </div>
          <Textarea
            id={commentId}
            value={comment}
            rows={3}
            maxLength={SERVICE_REQUEST_RULES.ratingCommentMax}
            placeholder={t('tho.rate.comment_placeholder')}
            aria-label={t('tho.rate.comment_placeholder')}
            disabled={rating.pending}
            onChange={(e) => setComment(e.target.value)}
          />
          {error ? (
            <p role="alert" className="rounded-md bg-danger/10 p-3 text-md text-danger">
              {errorText(error)}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={rating.pending} onClick={close}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" disabled={rating.pending} aria-busy={rating.pending || undefined}>
              {t('tho.rate.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

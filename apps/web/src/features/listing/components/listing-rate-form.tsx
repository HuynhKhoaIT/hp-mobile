'use client';

// Nội dung "Đánh giá & lời cảm ơn" sau khi trao trả đồ thất lạc — khớp ListingRateForm của app (style Stitch "Đánh giá & Gửi
// lời cảm ơn người tìm thấy đồ"): chọn người (chủ tin: người đã nhắn tin về tin — avatar + "An N."; người khác: chủ tin,
// chọn sẵn) → câu hỏi + 5 sao (StarRatingInput, chữ mức điểm dưới sao) → chip lời khen nhanh (chỉ chèn chữ vào đầu lời
// cảm ơn, thuần UI — toggleRatingPhrase của @hp/core) → lời cảm ơn ≤ 500 → "Gửi đánh giá". Gửi: useRateListing (@hp/core,
// optimistic) → toast → onDone; lỗi → hộp báo errors.<code> trong form. Đã chấm (một lần / tin) → dòng "Bạn đã đánh giá …".
// Loading skeleton · lỗi + thử lại · rỗng (chưa ai nhắn tin). Dùng trong ReturnedDialog (bước sau khi trả) và
// RateListingDialog (mở riêng). Bỏ khỏi Stitch: tặng cà phê, điểm Karma, bảng vinh danh.
import { RATING_COMPLIMENTS, ratedCounterpart, toggleRatingPhrase } from '@hp/core';
import { useListingCounterparts, useRateListing } from '@hp/core/react';
import { LISTING_RATING_COMMENT_MAX } from '@hp/shared';
import { Check, Send, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Badge } from '@/components/shared/badge';
import { ChoiceChip } from '@/components/shared/choice-chip';
import { ErrorState } from '@/components/shared/error-state';
import { StarRatingInput } from '@/components/shared/star-rating-input';
import { useToast } from '@/components/shared/toast';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { cn } from '@/lib/utils';

export function ListingRateForm({ listingId, onDone }: { listingId: string; onDone: () => void }) {
  const t = useTranslations();
  const errorText = useErrorText();
  const toast = useToast();
  const people = useListingCounterparts(listingId);
  const rate = useRateListing(listingId);
  const pickId = useId();
  const starsId = useId();
  const commentId = useId();
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (people.isPending) {
    return (
      <div aria-hidden className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mx-auto h-12 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (people.isError) return <ErrorState code={people.error.code} onRetry={() => void people.refetch()} />;

  const list = people.data;
  const rated = ratedCounterpart(list);
  const closeButton = (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onDone}>
        {t('common.actions.close')}
      </Button>
    </DialogFooter>
  );
  if (rated) {
    const myScore = rated.myScore ?? 0;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
          <UserAvatar avatar={rated.avatarUrl} name={rated.displayName || '?'} />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-md font-semibold text-fg">
              {t('listing.lost_found.rate.rated', { name: rated.displayName, score: myScore })}
            </p>
            <p className="flex gap-0.5" aria-hidden>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} strokeWidth={1.75} className={cn('size-4', n <= myScore ? 'fill-warning text-warning' : 'text-muted')} />
              ))}
            </p>
          </div>
        </div>
        {closeButton}
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-md bg-surface-2 p-4 text-md text-muted">{t('listing.lost_found.rate.empty')}</p>
        {closeButton}
      </div>
    );
  }

  // Một người (thường gặp; luôn đúng với người không phải chủ tin) → chọn sẵn.
  const rateeId = picked ?? (list.length === 1 ? (list[0]?.userId ?? null) : null);
  const submit = () => {
    if (!rateeId) return setError('pick_required');
    if (!score) return setError('score_required');
    rate.mutate(
      { rateeId, score, comment: comment.trim() || null },
      {
        onSuccess: () => {
          toast.show(t('listing.lost_found.rate.done'));
          onDone();
        },
        onError: (e) => setError(e.code),
      },
    );
  };
  const errorMessage =
    error === 'pick_required' || error === 'score_required' ? t(`listing.lost_found.rate.${error}`) : error ? errorText(error) : null;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend id={pickId} className="flex flex-col gap-0.5 pb-2">
          <span className="text-md font-semibold text-fg">{t('listing.lost_found.rate.pick_label')}</span>
          <span className="text-sm text-muted">{t('listing.lost_found.rate.pick_hint')}</span>
        </legend>
        {list.map((c) => {
          const name = c.displayName || '?';
          const selected = c.userId === rateeId;
          return (
            <label
              key={c.userId}
              className={cn(
                'flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                selected ? 'border-primary bg-primary-light' : 'border-border bg-surface hover:bg-surface-2',
              )}
            >
              <input
                type="radio"
                name={pickId}
                value={c.userId}
                checked={selected}
                disabled={rate.isPending}
                onChange={() => {
                  setPicked(c.userId);
                  setError(null);
                }}
                className="sr-only"
              />
              <UserAvatar avatar={c.avatarUrl} name={name} size="sm" />
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="truncate text-md font-semibold text-fg">{name}</span>
                {c.isOwner ? <Badge tone="primary">{t('listing.lost_found.rate.owner_tag')}</Badge> : null}
              </span>
              <span
                aria-hidden
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border',
                  selected ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface',
                )}
              >
                {selected ? <Check strokeWidth={1.75} className="size-4" /> : null}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-4 text-center">
        <p id={starsId} className="text-md font-semibold text-fg">
          {t('listing.lost_found.rate.question')}
        </p>
        <p className="text-sm text-muted">{t('listing.lost_found.rate.hint')}</p>
        <StarRatingInput
          value={score}
          onChange={(n) => {
            setScore(n);
            setError(null);
          }}
          labelledBy={starsId}
          disabled={rate.isPending}
          starLabel={(n) => `${t('group.rate.score_label', { count: n })} – ${t(`group.rate.score_${n}`)}`}
        />
        <p aria-live="polite" className="min-h-6 text-md font-medium text-fg">
          {score ? t(`group.rate.score_${score}`) : null}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-md font-semibold text-fg">{t('listing.lost_found.rate.compliments_label')}</p>
        <div className="flex flex-wrap gap-2">
          {RATING_COMPLIMENTS.map((k) => {
            const phrase = t(`listing.lost_found.rate.compliment_${k}`);
            return (
              <ChoiceChip
                key={k}
                selected={comment.includes(phrase)}
                disabled={rate.isPending}
                onClick={() => setComment((c) => toggleRatingPhrase(c, phrase))}
              >
                {phrase}
              </ChoiceChip>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={commentId} className="text-md font-medium text-fg">
          {t('listing.lost_found.rate.comment_label')}
        </label>
        <Textarea
          id={commentId}
          value={comment}
          rows={3}
          maxLength={LISTING_RATING_COMMENT_MAX}
          placeholder={t('listing.lost_found.rate.comment_placeholder')}
          disabled={rate.isPending}
          onChange={(e) => setComment(e.target.value)}
        />
        <p className="self-end text-sm text-muted">
          {comment.length}/{LISTING_RATING_COMMENT_MAX}
        </p>
      </div>

      {errorMessage ? (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-md text-danger">
          {errorMessage}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={rate.isPending} onClick={onDone}>
          {t('common.actions.cancel')}
        </Button>
        <Button type="submit" disabled={rate.isPending} aria-busy={rate.isPending || undefined}>
          <Send aria-hidden strokeWidth={1.75} />
          {t('listing.lost_found.rate.submit')}
        </Button>
      </DialogFooter>
    </form>
  );
}

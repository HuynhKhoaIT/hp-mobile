'use client';

// Đánh giá chủ nhóm sau buổi đi / buổi chơi (ns group.rate, giống app): 1–5 sao + nhận xét (không bắt buộc, ≤ 500 ký tự).
// Sao: StarRatingInput (components/shared — radiogroup ARIA, phím mũi tên / Home / End); mỗi sao có nhãn "N sao – Tốt" và
// dòng chữ dưới hàng sao nói mức đang chọn (không chỉ dựa vào màu).
// Gửi bằng useRateGroup (@hp/core/react, optimistic: "Bạn đã chấm N/5" hiện ngay; lỗi → trả lại + báo trong dialog).
// Chỉ là UI: RPC rate_group mới quyết định (thành viên đã được nhận, nhóm đã diễn ra, chưa chấm — group_not_finished,
// already_rated, forbidden).
import { useRateGroup } from '@hp/core/react';
import { GROUP_RULES } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { StarRatingInput } from '@/components/shared/star-rating-input';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useErrorText } from '@/features/auth/components/use-error-text';

export function RateGroupDialog({
  open,
  onOpenChange,
  groupId,
  groupTitle,
  hostName,
  onRated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupTitle: string;
  hostName: string;
  /** Sau khi gửi thành công (dialog tự hiện toast group.rate.done): làm mới trang (điểm trung bình của chủ nhóm). */
  onRated: () => void;
}) {
  const t = useTranslations();
  const errorText = useErrorText();
  const toast = useToast();
  const rate = useRateGroup(groupId);
  const labelId = useId();
  const commentId = useId();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pick = (n: number) => {
    setScore(n);
    setError(null);
  };

  const submit = () => {
    if (!score) {
      setError('required');
      return;
    }
    rate.mutate(
      { score, comment: comment.trim() || null },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.show(t('group.rate.done'));
          onRated();
        },
        onError: (e) => setError(e.code),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !rate.isPending && onOpenChange(v)}>
      <DialogContent closeLabel={t('common.actions.close')}>
        <DialogHeader>
          <DialogTitle>{t('group.rate.title')}</DialogTitle>
          <DialogDescription>{t('group.rate.body', { title: groupTitle, name: hostName })}</DialogDescription>
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
              {t('group.rate.title')}
            </span>
            <StarRatingInput
              value={score}
              onChange={pick}
              labelledBy={labelId}
              disabled={rate.isPending}
              starLabel={(n) => `${t('group.rate.score_label', { count: n })} – ${t(`group.rate.score_${n}`)}`}
            />
            <p aria-live="polite" className="min-h-6 text-md font-medium text-fg">
              {score ? t(`group.rate.score_${score}`) : null}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={commentId} className="text-md font-medium text-fg">
              {t('group.rate.comment_label')}
            </label>
            <Textarea
              id={commentId}
              value={comment}
              rows={3}
              maxLength={GROUP_RULES.ratingCommentMax}
              placeholder={t('group.rate.comment_placeholder')}
              disabled={rate.isPending}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="rounded-md bg-danger/10 p-3 text-md text-danger">
              {errorText(error)}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={rate.isPending} onClick={() => onOpenChange(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" disabled={rate.isPending} aria-busy={rate.isPending || undefined}>
              {t('group.rate.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

// Màn kết quả sau khi Đăng / Lưu — theo status THẬT DB trả về (hợp đồng chung với app):
//   active → form.success_* (sửa tin: form.saved) · pending_review → form.pending_* + lý do (manage.reason.*)
//   rejected → form.rejected_* + lý do · draft → form.draft_saved.
// Liên kết: Xem tin / Đăng tin khác / Tin của tôi (+ Sửa tin khi bị từ chối). Trong mini-app (`manageHref`): "Tin của tôi"
// mở "Quản lý tin" của mini-app (tab active | pending | hidden — nháp nằm ở Đã ẩn) thay vì /toi/tin-cua-toi; "Sửa tin" mở
// trang sửa của mini-app (`editHref`).
// Đăng / lưu thành công (active): MỘT vòng lan quanh dấu tích (animate-success-ripple: sau 200ms, viền success phóng
// 1 → 1.6 và mờ dần 900ms, không lặp — motion.ripple của @hp/tokens, giống app SuccessScreen); giảm chuyển động → không vòng.
import type { SavedListingResult } from '@hp/core';
import { CircleCheck, Clock, FileText, OctagonAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const VIEW = {
  active: { tone: 'bg-success/15 text-success', Icon: CircleCheck },
  pending_review: { tone: 'bg-warning/15 text-fg', Icon: Clock },
  rejected: { tone: 'bg-danger/15 text-danger', Icon: OctagonAlert },
  draft: { tone: 'bg-primary-light text-primary', Icon: FileText },
} as const;

export function FormResult({
  result,
  mode,
  onPostAnother,
  manageHref,
  editHref,
}: {
  result: SavedListingResult;
  mode: 'create' | 'edit';
  onPostAnother: () => void;
  manageHref?: string;
  /** "Sửa tin" (bị từ chối) trong mini-app; thiếu → /toi/tin-cua-toi/[id]/sua. */
  editHref?: string;
}) {
  const t = useTranslations('listing');
  const reasons = result.moderation_reasons.filter((r) => t.has(`manage.reason.${r}`));
  const view = VIEW[result.status === 'pending_review' || result.status === 'rejected' || result.status === 'draft' ? result.status : 'active'];
  const tab = result.status === 'draft' ? 'draft' : result.status === 'active' ? 'active' : 'pending';
  const myListings = manageHref
    ? { pathname: manageHref, query: { tab: tab === 'draft' ? 'hidden' : tab } }
    : { pathname: '/toi/tin-cua-toi', query: { tab } };
  const { title, body } =
    result.status === 'pending_review'
      ? { title: t('form.pending_title'), body: t('form.pending_body') }
      : result.status === 'rejected'
        ? { title: t('form.rejected_title'), body: t('form.rejected_body') }
        : result.status === 'draft'
          ? { title: t('form.draft_saved'), body: null }
          : mode === 'edit'
            ? { title: t('form.saved'), body: null }
            : { title: t('form.success_title'), body: t('form.success_body') };

  return (
    <section aria-live="polite" className="flex flex-col items-center gap-4 rounded-lg bg-surface p-6 text-center shadow-card">
      <span className={cn('relative flex size-16 items-center justify-center rounded-full', view.tone)}>
        {result.status === 'active' ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-success opacity-0 motion-safe:animate-success-ripple"
          />
        ) : null}
        <view.Icon aria-hidden strokeWidth={1.75} className="size-8" />
      </span>
      <h2 className="text-xl font-semibold text-fg">{title}</h2>
      {body ? <p className="max-w-md text-md text-muted">{body}</p> : null}
      {reasons.length > 0 ? (
        <ul className="list-inside list-disc text-md text-fg">
          {reasons.map((r) => (
            <li key={r}>{t(`manage.reason.${r}`)}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex w-full flex-col justify-center gap-2 sm:flex-row">
        {result.status === 'active' ? (
          <Button asChild>
            <Link href={`/tin/${result.slug}`}>{t('form.view_listing')}</Link>
          </Button>
        ) : null}
        {result.status === 'rejected' ? (
          <Button asChild>
            <Link href={editHref ?? `/toi/tin-cua-toi/${result.id}/sua`}>{t('manage.edit')}</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href={myListings}>{t('form.my_listings')}</Link>
        </Button>
        <Button type="button" variant="outline" onClick={onPostAnother}>
          {t('form.post_another')}
        </Button>
      </div>
    </section>
  );
}

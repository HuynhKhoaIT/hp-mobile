'use client';

// /toi/huy-hieu — thân trang huy hiệu xác minh (style Stitch "Huy hiệu & Xác minh (BadgeRequestCard)", khớp BadgeCenter của
// app). Dữ liệu riêng → đọc ở trình duyệt bằng hook @hp/core/react (useMyProfile: huy hiệu đã có; useMyBadgeRequests: yêu
// cầu mới nhất của từng huy hiệu — badgeStates).
// - Khối lợi ích (viền warning/30 nền warning/10, như SafetyTip) → form: tiêu đề vạch cam "Chọn huy hiệu" + lưới 4 thẻ
//   (BadgeOption: ô icon, tên, dành cho ai, giấy tờ cần có, lý do bị từ chối, nhãn trạng thái + ngày gửi). Chưa xin / bị
//   từ chối → thẻ là radio (viền 2 primary khi chọn, viên "Đang chọn" / "Chọn huy hiệu này"); đã có / chờ duyệt → thẻ tĩnh.
// - Thẻ gửi giấy tờ cho huy hiệu đang chọn: ô nét đứt (label của input file — bàn phím / trình đọc màn hình dùng được) →
//   tệp đã chọn (tên + Xoá) → mẹo chụp → hộp riêng tư (chỉ kiểm duyệt viên xem, xoá PURGE_AFTER_DAYS ngày sau khi có kết
//   quả, thời gian duyệt) → nút cam "Gửi xác minh" (khoá đến khi có tệp, kèm dòng nhắc).
//   Ảnh → nén ở trình duyệt (prepareImage: cạnh dài 1600 px, WebP / JPEG, ≤ 5 MB — VERIFICATION_FILE, cùng cách với ảnh
//   tin); PDF giữ nguyên, ≤ 5 MB. Gửi → useRequestBadge (upload bucket riêng tư verification rồi Edge Function
//   request-badge) → toast "Đã gửi" + làm mới danh sách (thẻ chuyển "Đang chờ duyệt", chọn sang huy hiệu kế tiếp). Lỗi
//   (file_too_large, already_requested, badge_owned, rate_limited, banned…) → toast. Không còn huy hiệu xin được → ghi chú.
// Chỉ là UI: Storage RLS + request-badge mới quyết định quyền. Loading skeleton đúng hình thẻ / lỗi + thử lại.
// Khác Stitch (cố ý): không % độ tin cậy / hạng thành viên (không có điểm xác minh — header hiện số huy hiệu thật); không
// nút "Hỗ trợ"; lợi ích "tăng 3x", "ưu tiên ghép xe", "kèo không cọc" không có thật → 3 lợi ích đúng; không ruy băng
// "Phổ biến nhất"; không ô đơn vị / chip #HòaPhát / phân xưởng / SĐT-Zalo / ghi chú cho BQT (request-badge chỉ nhận badge +
// documentPath, kết quả báo qua thông báo; không hiện SĐT); không ảnh mẫu và "tự động che số CCCD" (không có ảnh mẫu / xử
// lý che — mẹo che bằng tay); "xoá sau 7 ngày", "2–4 giờ" → số thật; nút gửi nằm cuối form, không dính đáy (bottom nav
// điện thoại đã dính đáy); không footer riêng (footer chung của layout có dòng miễn trừ).
import { useMyBadgeRequests, useMyProfile, useRequestBadge } from '@hp/core/react';
import { PURGE_AFTER_DAYS, type RequestableBadge, VERIFICATION_FILE, formatDate } from '@hp/shared';
import {
  BadgeCheck,
  Briefcase,
  Camera,
  Check,
  Clock,
  EyeOff,
  FileText,
  FileUp,
  Handshake,
  HardHat,
  House,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useId, useRef, useState } from 'react';
import { Badge, type BadgeTone } from '@/components/shared/badge';
import { ErrorState } from '@/components/shared/error-state';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { BarHeading } from '@/features/listing/components/safety-tip';
import { asLocale } from '@/features/listing/display';
import { prepareImage } from '@/features/listing/listing-image';
import { cn } from '@/lib/utils';
import { type BadgeState, type BadgeStatus, badgeStates, canRequestBadge } from './badge-state';

/** Icon theo huy hiệu — giống BADGE_ICON của app (trọ / sân / việc dùng icon dịch vụ). */
const BADGE_ICON: Record<RequestableBadge, LucideIcon> = { worker: HardHat, landlord: House, venue: Trophy, employer: Briefcase };

const STATUS: Record<BadgeStatus, { key: string; tone: BadgeTone }> = {
  owned: { key: 'owned', tone: 'success' },
  pending: { key: 'status_pending', tone: 'warning' },
  rejected: { key: 'status_rejected', tone: 'danger' },
  none: { key: 'status_none', tone: 'neutral' },
};

const MAX_MB = Math.round(VERIFICATION_FILE.maxBytes / (1024 * 1024));

export function BadgeRequestView() {
  const profile = useMyProfile();
  const requests = useMyBadgeRequests();

  // Phiên hết hạn giữa chừng (proxy đã chặn khách khi vào trang) → báo cần đăng nhập thay vì skeleton mãi.
  if (!profile.isLoading && !profile.userId) return <ErrorState code="auth_required" />;
  if (profile.isLoading || requests.isPending) return <BadgeRequestSkeleton />;
  if (profile.isError || requests.isError) {
    const code = profile.error?.code ?? requests.error?.code;
    return (
      <ErrorState
        code={code}
        onRetry={() => {
          void profile.refetch();
          void requests.refetch();
        }}
      />
    );
  }

  return <BadgeRequestBody states={badgeStates(profile.data?.badges ?? [], requests.data)} />;
}

function BadgeRequestBody({ states }: { states: BadgeState[] }) {
  const t = useTranslations();
  const toast = useToast();
  const errorText = useErrorText();
  const request = useRequestBadge();
  const fileId = useId();
  const hintId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [choice, setChoice] = useState<RequestableBadge | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const busy = preparing || request.isPending;
  const requestable = states.filter((s) => canRequestBadge(s.status)).map((s) => s.badge);
  // Huy hiệu đang chọn vừa được gửi / có rồi (danh sách đổi) → về huy hiệu xin được đầu tiên.
  const selected = choice && requestable.includes(choice) ? choice : (requestable[0] ?? null);

  const clearFile = () => {
    setFile(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !selected || busy) return;
    setPreparing(true);
    let vars: Parameters<typeof request.mutate>[0] | null = null;
    if (file.type === 'application/pdf') {
      if (file.size > VERIFICATION_FILE.maxBytes) toast.show(errorText('file_too_large'), 'error');
      else vars = { badge: selected, body: file, contentType: 'application/pdf', size: file.size };
    } else {
      const prepared = await prepareImage(file, { longEdgePx: VERIFICATION_FILE.longEdgePx, maxBytes: VERIFICATION_FILE.maxBytes });
      if (prepared.error) toast.show(prepared.error === 'file_type' ? t('web.badge.file_type') : errorText(prepared.error), 'error');
      else vars = { badge: selected, body: prepared.data.blob, contentType: prepared.data.contentType, size: prepared.data.blob.size };
    }
    setPreparing(false);
    if (!vars) return;
    request.mutate(vars, {
      onSuccess: () => {
        toast.show(t('common.badge_request.submitted'));
        clearFile();
      },
      onError: (error) => toast.show(errorText(error.code), 'error'),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <BadgeBenefits />
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-5">
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="contents">
            <BarHeading as="h2">{t('common.badge_request.choose_badge')}</BarHeading>
          </legend>
          <p className="-mt-2 text-sm text-muted">{t('common.badge_request.choose_hint')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {states.map((s) => (
              <BadgeOption
                key={s.badge}
                state={s}
                selected={s.badge === selected}
                onSelect={() => setChoice(s.badge)}
                disabled={busy}
              />
            ))}
          </div>
        </fieldset>

        {selected ? (
          <section
            aria-labelledby={`${fileId}-title`}
            className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card sm:p-5"
          >
            <div className="flex items-start gap-3">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
                <FileUp strokeWidth={1.75} className="size-4.5" />
              </span>
              <div className="flex min-w-0 flex-col">
                <h2 id={`${fileId}-title`} className="text-md font-bold text-fg">
                  {t('common.badge_request.form_title', { badge: t(`listing.owner_badge.${selected}`) })}
                </h2>
                <p id={hintId} className="text-sm text-muted">
                  {t('web.badge.file_hint')}
                </p>
              </div>
            </div>

            <label
              htmlFor={fileId}
              className={cn(
                'flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-surface-2 p-4 text-center transition-colors hover:bg-primary-light has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                busy && 'pointer-events-none opacity-60',
              )}
            >
              <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-primary-light text-primary">
                <Camera strokeWidth={1.75} className="size-6" />
              </span>
              <span className="text-md font-bold text-primary">
                {file ? t('common.badge_request.change_photo') : t('common.badge_request.pick_photo')}
              </span>
              <span className="text-sm text-muted">{t('common.badge_request.upload_hint', { mb: MAX_MB })}</span>
              <input
                ref={fileInput}
                id={fileId}
                type="file"
                accept="image/*,application/pdf"
                aria-describedby={hintId}
                disabled={busy}
                onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>

            {file ? (
              <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 py-1 pr-1 pl-3">
                <FileText aria-hidden strokeWidth={1.75} className="size-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-md text-fg">{file.name}</span>
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={clearFile}>
                  <X aria-hidden strokeWidth={1.75} />
                  {t('listing.form.remove_photo')}
                </Button>
              </div>
            ) : null}

            <PhotoTips />
          </section>
        ) : (
          <p role="note" className="rounded-lg bg-primary-light p-4 text-md text-fg">
            {t('common.badge_request.nothing_to_request')}
          </p>
        )}

        <BadgePrivacyNote />

        {selected ? (
          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center sm:justify-start sm:gap-4">
            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={!file || busy}
              aria-busy={busy || undefined}
              className="w-full font-semibold sm:w-auto"
            >
              <FileUp aria-hidden strokeWidth={1.75} />
              {busy ? t('web.badge.submitting') : t('common.badge_request.submit')}
            </Button>
            {!file ? <p className="text-center text-sm text-muted sm:text-left">{t('common.badge_request.need_photo')}</p> : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}

/** Thẻ một huy hiệu — radio khi xin được (cả thẻ là label), thẻ tĩnh khi đã có / đang chờ duyệt. */
function BadgeOption({
  state,
  selected,
  onSelect,
  disabled,
}: {
  state: BadgeState;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const requestable = canRequestBadge(state.status);
  const owned = state.status === 'owned';
  const active = requestable && selected;
  const status = STATUS[state.status];
  const Glyph = BADGE_ICON[state.badge];

  const body = (
    <>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-md',
            active ? 'bg-primary-light text-primary' : owned ? 'bg-success/15 text-success' : 'bg-surface-2 text-muted',
          )}
        >
          <Glyph strokeWidth={1.75} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn('flex items-center gap-1 text-md font-bold', active ? 'text-primary' : 'text-fg')}>
            {t(`listing.owner_badge.${state.badge}`)}
            {owned ? <BadgeCheck aria-hidden strokeWidth={1.75} className="size-4.5 shrink-0 text-success" /> : null}
          </span>
          <span className="text-sm text-muted">{t(`common.badge_request.for_${state.badge}`)}</span>
        </div>
      </div>
      <p className="flex items-start gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm text-fg">
        <FileText aria-hidden strokeWidth={1.75} className={cn('mt-0.5 size-4 shrink-0', active ? 'text-primary' : 'text-muted')} />
        {t(`common.badge_request.doc_hint_${state.badge}`)}
      </p>
      {state.status === 'rejected' && state.reason ? (
        <p className="text-sm text-danger">{t('common.badge_request.reason', { reason: state.reason })}</p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex flex-col items-start gap-1">
          <Badge tone={status.tone}>{t(`common.badge_request.${status.key}`)}</Badge>
          {state.requestedAt ? (
            <span className="text-sm text-muted">
              {t('common.badge_request.requested_on', { date: formatDate(state.requestedAt, locale) })}
            </span>
          ) : null}
        </div>
        {requestable ? (
          <span
            aria-hidden
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold',
              selected ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface text-primary',
            )}
          >
            {t(selected ? 'common.badge_request.selected' : 'common.badge_request.select')}
            {selected ? <Check strokeWidth={1.75} className="size-4" /> : null}
          </span>
        ) : null}
      </div>
    </>
  );

  const box = 'flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card';
  if (!requestable) return <div className={cn(box, 'border border-border')}>{body}</div>;
  return (
    <label
      className={cn(
        box,
        'cursor-pointer border-2 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
        selected ? 'border-primary' : 'border-border hover:border-primary/40',
        disabled && 'cursor-default opacity-60',
      )}
    >
      <input
        type="radio"
        name="badge"
        value={state.badge}
        checked={selected}
        onChange={onSelect}
        disabled={disabled}
        className="sr-only"
      />
      {body}
    </label>
  );
}

function BadgeBenefits() {
  const t = useTranslations('common.badge_request');
  const items = [
    { key: 'benefit_visible', Icon: BadgeCheck },
    { key: 'benefit_trust', Icon: Handshake },
    { key: 'benefit_free', Icon: ShieldCheck },
  ] as const;
  return (
    <section aria-labelledby="badge-benefits" className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
      <h2 id="badge-benefits" className="flex items-center gap-2 text-md font-bold text-fg">
        <Sparkles aria-hidden strokeWidth={1.75} className="size-5 shrink-0 text-warning" />
        {t('benefits_title')}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {items.map(({ key, Icon }) => (
          <li key={key} className="flex items-start gap-2 text-sm text-fg">
            <Icon aria-hidden strokeWidth={1.75} className="mt-0.5 size-4.5 shrink-0 text-warning" />
            {t(key)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PhotoTips() {
  const t = useTranslations('common.badge_request');
  const tips = [
    { key: 'tip_clear', Icon: Check, tone: 'text-success' },
    { key: 'tip_name', Icon: Check, tone: 'text-success' },
    { key: 'tip_cover', Icon: EyeOff, tone: 'text-muted' },
  ] as const;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-fg">{t('tips_title')}</p>
      <ul className="flex flex-col gap-1.5">
        {tips.map(({ key, Icon, tone }) => (
          <li key={key} className="flex items-start gap-2 text-sm text-muted">
            <Icon aria-hidden strokeWidth={1.75} className={cn('mt-0.5 size-4 shrink-0', tone)} />
            {t(key)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BadgePrivacyNote() {
  const t = useTranslations('common.badge_request');
  return (
    <aside className="flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-4">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
        <ShieldCheck strokeWidth={1.75} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-md font-bold text-fg">{t('privacy_title')}</p>
        <p className="text-sm text-muted">{t('privacy_body', { days: PURGE_AFTER_DAYS })}</p>
        <p className="mt-1 flex items-start gap-1 text-sm font-semibold text-primary">
          <Clock aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          {t('review_time')}
        </p>
      </div>
    </aside>
  );
}

/** Skeleton đúng hình: khối lợi ích + tiêu đề + lưới 4 thẻ huy hiệu. */
export function BadgeRequestSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy>
      <Skeleton className="h-36 w-full rounded-lg" />
      <Skeleton className="h-6 w-40 rounded-sm" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
            <div className="flex items-start gap-3">
              <Skeleton className="size-11 rounded-md" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-1/2 rounded-sm" />
                <Skeleton className="h-4 w-4/5 rounded-sm" />
              </div>
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
            <div className="flex justify-between border-t border-border pt-3">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-8 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

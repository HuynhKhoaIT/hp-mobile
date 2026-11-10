'use client';

// /toi/huy-hieu — huy hiệu xác minh (giống màn huy hiệu của app). Dữ liệu riêng của người dùng → đọc ở trình duyệt bằng hook
// @hp/core/react (useMyProfile: huy hiệu đã có; useMyBadgeRequests: yêu cầu mới nhất của từng huy hiệu).
// - Danh sách 4 huy hiệu (REQUESTABLE_BADGES) với trạng thái: đã có / đang chờ duyệt / bị từ chối (+ lý do) / chưa xác minh.
// - Form: chọn huy hiệu (radio — chỉ huy hiệu chưa có và không đang chờ), gợi ý giấy tờ theo huy hiệu, chọn tệp:
//   ảnh → nén ở trình duyệt (prepareImage: cạnh dài 1600 px, WebP / JPEG, ≤ 5 MB — VERIFICATION_FILE, cùng cách với ảnh tin);
//   PDF giữ nguyên, ≤ 5 MB. Gửi → useRequestBadge (upload bucket riêng tư verification rồi Edge Function request-badge)
//   → toast "Đã gửi" + làm mới danh sách. Lỗi (file_too_large, already_requested, badge_owned, rate_limited, banned…) → toast.
// Chỉ là UI: Storage RLS + request-badge mới quyết định quyền. Loading skeleton / lỗi + thử lại.
import type { BadgeRequest } from '@hp/core';
import { useMyBadgeRequests, useMyProfile, useRequestBadge } from '@hp/core/react';
import { type RequestableBadge, REQUESTABLE_BADGES, VERIFICATION_FILE } from '@hp/shared';
import { BadgeCheck, Clock, FileUp, ShieldCheck, ShieldX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useId, useRef, useState } from 'react';
import { Badge, type BadgeTone } from '@/components/shared/badge';
import { ErrorState } from '@/components/shared/error-state';
import { TextLinesSkeleton } from '@/components/shared/skeletons';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { prepareImage } from '@/features/listing/listing-image';
import { cn } from '@/lib/utils';

type BadgeState = { kind: 'owned' } | { kind: 'pending' } | { kind: 'rejected'; reason: string | null } | { kind: 'none' };

const STATE_VIEW: Record<BadgeState['kind'], { tone: BadgeTone; Icon: LucideIcon; key: string | null }> = {
  owned: { tone: 'success', Icon: BadgeCheck, key: 'owned' },
  pending: { tone: 'warning', Icon: Clock, key: 'status_pending' },
  rejected: { tone: 'danger', Icon: ShieldX, key: 'status_rejected' },
  none: { tone: 'neutral', Icon: ShieldCheck, key: null },
};

/** Trạng thái của một huy hiệu: đã có (hồ sơ) > yêu cầu mới nhất (danh sách đã sắp mới nhất trước). */
function badgeState(badge: RequestableBadge, owned: readonly string[], requests: readonly BadgeRequest[]): BadgeState {
  if (owned.includes(badge)) return { kind: 'owned' };
  const latest = requests.find((r) => r.badge === badge);
  if (latest?.status === 'pending') return { kind: 'pending' };
  if (latest?.status === 'rejected') return { kind: 'rejected', reason: latest.reject_reason };
  return { kind: 'none' };
}

export function BadgeRequestView() {
  const t = useTranslations();
  const profile = useMyProfile();
  const requests = useMyBadgeRequests();

  // Phiên hết hạn giữa chừng (proxy đã chặn khách khi vào trang) → báo cần đăng nhập thay vì skeleton mãi.
  if (!profile.isLoading && !profile.userId) return <ErrorState code="auth_required" />;
  if (profile.isLoading || requests.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <TextLinesSkeleton lines={4} />
        <TextLinesSkeleton lines={6} />
      </div>
    );
  }
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

  const owned = profile.data?.badges ?? [];
  const states = REQUESTABLE_BADGES.map((badge) => ({ badge, state: badgeState(badge, owned, requests.data) }));
  const requestable = states.filter((s) => s.state.kind === 'none' || s.state.kind === 'rejected').map((s) => s.badge);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-md text-muted">{t('common.badge_request.intro')}</p>
      <ul className="flex flex-col divide-y divide-border rounded-lg bg-surface shadow-card">
        {states.map(({ badge, state }) => {
          const view = STATE_VIEW[state.kind];
          return (
            <li key={badge} className="flex items-start gap-3 p-4">
              <view.Icon
                aria-hidden
                strokeWidth={1.75}
                className={cn('mt-0.5 size-6 shrink-0', state.kind === 'owned' ? 'text-success' : 'text-muted')}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-md font-medium text-fg">{t(`listing.owner_badge.${badge}`)}</span>
                {state.kind === 'rejected' && state.reason ? (
                  <span className="text-sm text-muted">{t('common.badge_request.reason', { reason: state.reason })}</span>
                ) : null}
              </div>
              <Badge tone={view.tone}>{view.key ? t(`common.badge_request.${view.key}`) : t('web.badge.status_none')}</Badge>
            </li>
          );
        })}
      </ul>
      {requestable.length > 0 ? <BadgeRequestForm badges={requestable} /> : null}
    </div>
  );
}

function BadgeRequestForm({ badges }: { badges: RequestableBadge[] }) {
  const t = useTranslations();
  const toast = useToast();
  const errorText = useErrorText();
  const request = useRequestBadge();
  const fileId = useId();
  const hintId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [badge, setBadge] = useState<RequestableBadge>(badges[0] ?? 'worker');
  const [file, setFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const busy = preparing || request.isPending;
  // Huy hiệu đang chọn vừa được gửi / có rồi (danh sách đổi) → về lựa chọn đầu còn hợp lệ.
  const selected = badges.includes(badge) ? badge : (badges[0] ?? badge);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || busy) return;
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
        setFile(null);
        if (fileInput.current) fileInput.current.value = '';
      },
      onError: (error) => toast.show(errorText(error.code), 'error'),
    });
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4 rounded-lg bg-surface p-4 shadow-card">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-semibold text-fg">{t('common.badge_request.choose_badge')}</legend>
        {badges.map((b) => (
          <label
            key={b}
            className={cn(
              'flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-4 text-md text-fg transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
              selected === b ? 'border-primary bg-primary-light' : 'border-border hover:bg-surface-2',
            )}
          >
            <input
              type="radio"
              name="badge"
              value={b}
              checked={selected === b}
              onChange={() => setBadge(b)}
              className="size-5 accent-primary"
            />
            {t(`listing.owner_badge.${b}`)}
          </label>
        ))}
      </fieldset>

      <p className="rounded-md bg-surface-2 p-3 text-md text-fg">{t(`common.badge_request.doc_hint_${selected}`)}</p>

      <div className="flex flex-col gap-2">
        <label htmlFor={fileId} className="text-md font-medium text-fg">
          {t('common.badge_request.pick_photo')}
        </label>
        <input
          ref={fileInput}
          id={fileId}
          type="file"
          accept="image/*,application/pdf"
          aria-describedby={hintId}
          onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
          className="min-h-12 rounded-sm border border-border bg-surface p-2 text-md text-fg file:mr-3 file:min-h-10 file:rounded-sm file:border-0 file:bg-primary-light file:px-3 file:font-medium file:text-primary"
        />
        <p id={hintId} className="text-sm text-muted">
          {t('web.badge.file_hint')}
        </p>
      </div>

      <Button type="submit" size="lg" disabled={!file || busy} aria-busy={busy || undefined} className="self-start">
        <FileUp aria-hidden strokeWidth={1.75} />
        {busy ? t('web.badge.submitting') : t('common.badge_request.submit')}
      </Button>
    </form>
  );
}

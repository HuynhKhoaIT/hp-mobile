'use client';

// Hành động trang chi tiết nhóm (cột phải, dính khi cuộn) theo vai trò người xem (groupViewerRole của @hp/shared, giống app):
//   khách     → "Tham gia" / "Xin tham gia" mở LoginDialog (intent "join": sau đăng nhập tự tham gia / mở lời nhắn)
//   chưa vào  → nhóm không cần duyệt: tham gia ngay; cần duyệt: dialog lời nhắn → "Gửi yêu cầu"
//   đã xin    → "Đã gửi yêu cầu" + "Rút yêu cầu" (xác nhận)
//   thành viên→ "Bạn đã tham gia" + "Rời nhóm" (xác nhận) + thẻ mời tải app để được nhắc giờ (reminders chỉ có trên app)
//   chủ nhóm  → yêu cầu chờ duyệt (Nhận / Từ chối) + "Huỷ nhóm" (xác nhận, đỏ)
// Dữ liệu: hook @hp/core/react (optimistic + rollback; lỗi → toast errors.<code>); Realtime khi là chủ nhóm / đã xin / thành
// viên. Sau mỗi lần ghi: refreshGroupAction (updateTag group:{id}) + router.refresh() để phần server render (nhãn trạng
// thái, danh sách) đọc lại. Chỉ là UI: Edge Function / RLS mới quyết định quyền.
// Chia sẻ (Web Share API → sao chép link web) + "Báo cáo nhóm" (người xem không phải chủ nhóm).
// Tuần 8: chủ nhóm / thành viên → "Chat nhóm" (/tin-nhan/{id} qua useGroupConversationId; null = chưa có quyền → ẩn).
// Thành viên sau giờ bắt đầu → "Đánh giá" (RateGroupDialog) hoặc "Bạn đã chấm N/5". Link có #danh-gia (thông báo
// group_completed, Nhóm của tôi) → tự mở dialog khi còn chấm được.
import { type PublicGroup, shareUrl } from '@hp/core';
import {
  useCancelGroup,
  useGroupConversationId,
  useGroupRealtime,
  useJoinGroup,
  useLeaveGroup,
  useMyGroupRating,
  useMyMembership,
  useMyProfile,
  useSession,
} from '@hp/core/react';
import { APP_NAME, groupDisplayStatus, groupViewerRole, shortName } from '@hp/shared';
import { CircleCheck, Clock, MessageCircle, Share2, Star, UserPlus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppPromoCard } from '@/components/shared/app-promo-card';
import { ClientOnly } from '@/components/shared/client-only';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { LoginDialog } from '@/components/shared/login-dialog';
import { takeLoginIntent } from '@/components/shared/login-intent';
import { useToast } from '@/components/shared/toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useErrorText } from '@/features/auth/components/use-error-text';
import { asLocale } from '@/features/listing/display';
import { ReportButton } from '@/features/report/components/report-button';
import { Link, useRouter } from '@/i18n/navigation';
import { publicEnv } from '@/lib/env';
import { refreshGroupAction } from '../actions';
import { groupTimeText } from '../display';
import { RATE_HASH } from '../rate-link';
import { useLiveGroup } from '../use-live-group';
import { JoinNoteDialog } from './join-note-dialog';
import { JoinRequests } from './join-requests';
import { RateGroupDialog } from './rate-group-dialog';

export function GroupActionsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export function GroupActions({ group }: { group: PublicGroup }) {
  return (
    <ClientOnly fallback={<GroupActionsSkeleton />}>
      <GroupActionsInner initial={group} />
    </ClientOnly>
  );
}

type Confirm = 'leave' | 'cancel_request' | 'cancel_group' | null;

function GroupActionsInner({ initial }: { initial: PublicGroup }) {
  const t = useTranslations();
  const locale = asLocale(useLocale());
  const errorText = useErrorText();
  const toast = useToast();
  const router = useRouter();
  const g = useLiveGroup(initial);
  const session = useSession();
  const userId = session.isLoading ? undefined : session.userId;
  const membership = useMyMembership(g.id);
  const profile = useMyProfile();
  const role = groupViewerRole(g, userId, membership.data);
  // Mốc giờ đọc một lần khi mở trang (component phải thuần): "đã tới giờ" → khoá tham gia.
  const [openedAt] = useState(() => Date.now());
  const status = groupDisplayStatus(g, new Date(openedAt));
  const joinable = status === 'open';

  const join = useJoinGroup(g.id);
  const leave = useLeaveGroup(g.id);
  const cancel = useCancelGroup(g.id);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  useGroupRealtime(g.id, role === 'host' || role === 'member' || role === 'requested');

  // Chat nhóm: chỉ chủ nhóm / thành viên (RLS conversations); khác → không gọi.
  const inGroup = role === 'host' || role === 'member';
  const chat = useGroupConversationId(g.id, { enabled: inGroup });
  // Đánh giá chủ nhóm: thành viên đã được nhận, nhóm đã tới giờ / đã xong (RPC rate_group kiểm lại).
  const canRate = role === 'member' && (status === 'started' || status === 'completed');
  const myRating = useMyGroupRating(canRate ? g.id : undefined);
  const [rateOpen, setRateOpen] = useState(false);
  const rateReady = canRate && myRating.isSuccess && myRating.data === null;
  useEffect(() => {
    if (!rateReady || window.location.hash !== `#${RATE_HASH}`) return;
    const id = setTimeout(() => setRateOpen(true), 0);
    return () => clearTimeout(id);
  }, [rateReady]);

  /** Sau khi ghi: trang công khai (cache) đọc lại + phần server render làm mới. Lỗi bỏ qua (webhook DB cũng làm mới). */
  const afterWrite = useCallback(() => {
    void refreshGroupAction(g.id).then(() => router.refresh());
  }, [g.id, router]);

  const runJoin = useCallback(
    (note?: string) => {
      const me = profile.data
        ? { id: profile.data.id, name: shortName(profile.data.full_name), avatar_url: profile.data.avatar_url }
        : undefined;
      setNoteError(null);
      join.mutate(
        { note, requiresApproval: g.requires_approval, me },
        {
          onSuccess: (res) => {
            setNoteOpen(false);
            toast.show(res === 'accepted' ? t('group.action.joined_toast') : t('group.action.requested_toast'));
            afterWrite();
          },
          onError: (e) => {
            if (e.code === 'message_has_phone' || e.code === 'message_profanity' || e.code === 'too_long') {
              setNoteError(e.code);
              return;
            }
            setNoteOpen(false);
            toast.show(errorText(e.code), 'error');
          },
        },
      );
    },
    [profile.data, join, g.requires_approval, toast, t, afterWrite, errorText],
  );

  const startJoin = useCallback(() => {
    if (g.requires_approval) {
      setNoteError(null);
      setNoteOpen(true);
    } else {
      runJoin();
    }
  }, [g.requires_approval, runJoin]);

  // Vừa đăng nhập từ nút Tham gia (intent "join") → làm tiếp khi đã biết mình chưa ở trong nhóm (chạy sau commit).
  const startJoinRef = useRef(startJoin);
  useEffect(() => {
    startJoinRef.current = startJoin;
  }, [startJoin]);
  const canStart = !!userId && !membership.isPending && (role === 'none' || role === 'left') && joinable;
  useEffect(() => {
    if (!canStart || !takeLoginIntent('join', g.id)) return;
    const id = setTimeout(() => startJoinRef.current(), 0);
    return () => clearTimeout(id);
  }, [canStart, g.id]);

  const runLeave = (wasRequest: boolean) =>
    leave.mutate(undefined, {
      onSuccess: () => {
        setConfirm(null);
        toast.show(wasRequest ? t('group.action.request_cancelled_toast') : t('group.action.left_toast'));
        afterWrite();
      },
      onError: (e) => {
        setConfirm(null);
        toast.show(errorText(e.code), 'error');
      },
    });

  const runCancel = () =>
    cancel.mutate(undefined, {
      onSuccess: () => {
        setConfirm(null);
        toast.show(t('group.action.cancelled_toast'));
        afterWrite();
      },
      onError: (e) => {
        setConfirm(null);
        toast.show(errorText(e.code), 'error');
      },
    });

  const share = async () => {
    const url = shareUrl({ type: 'group', slug: g.slug ?? '' }, publicEnv.siteUrl);
    const text = t('group.detail.share_text', { title: g.title, time: groupTimeText(g, locale), app: APP_NAME });
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: g.title, text, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.show(t('listing.detail.link_copied'));
    } catch {
      toast.show(t('errors.unknown'), 'error');
    }
  };

  if (userId === undefined || (userId && membership.isPending)) return <GroupActionsSkeleton />;
  if (userId && membership.isError) {
    return <ErrorState code={membership.error.code} onRetry={() => void membership.refetch()} />;
  }

  const shareButton = (
    <Button type="button" variant="outline" size="lg" onClick={() => void share()}>
      <Share2 strokeWidth={1.75} aria-hidden />
      {t('listing.detail.share')}
    </Button>
  );
  const reportButton =
    role === 'host' ? null : <ReportButton target="group" targetId={g.id} label={t('group.detail.report')} userId={userId} />;
  const active = status !== 'cancelled' && status !== 'completed';
  const chatLink = chat.data ? (
    <Button asChild variant="outline" size="lg">
      <Link href={`/tin-nhan/${chat.data}`}>
        <MessageCircle strokeWidth={1.75} aria-hidden />
        {t('group.chat.open')}
      </Link>
    </Button>
  ) : null;
  let rating = null;
  if (canRate) {
    if (myRating.isPending) rating = <Skeleton className="h-12 w-full" />;
    else if (typeof myRating.data === 'number') {
      rating = (
        <p role="status" className="flex items-center gap-2 rounded-md bg-surface-2 p-3 text-md font-medium text-fg">
          <Star strokeWidth={1.75} aria-hidden className="size-5 shrink-0 fill-warning text-warning" />
          {t('group.rate.your_score', { score: myRating.data })}
        </p>
      );
    } else if (myRating.isSuccess) {
      rating = (
        <Button type="button" variant="accent" size="lg" onClick={() => setRateOpen(true)}>
          <Star strokeWidth={1.75} aria-hidden />
          {t('group.rate.cta')}
        </Button>
      );
    }
  }
  const promo =
    active && (role === 'host' || role === 'member' || role === 'requested') ? (
      <AppPromoCard feature="reminders" title={t('group.promo.reminders_title')} body={t('group.promo.reminders_body')} />
    ) : null;

  let main;
  if (role === 'host') {
    const cancellable = status === 'open' || status === 'full';
    main = (
      <>
        <p className="rounded-md bg-primary-light p-3 text-md font-medium text-primary">{t('group.action.host_badge')}</p>
        {g.requires_approval && active ? <JoinRequests groupId={g.id} onChanged={afterWrite} /> : null}
        {cancellable ? (
          <Button type="button" variant="destructive" size="lg" disabled={cancel.isPending} onClick={() => setConfirm('cancel_group')}>
            {t('group.action.cancel_group')}
          </Button>
        ) : null}
      </>
    );
  } else if (role === 'member') {
    main = (
      <>
        <p role="status" className="flex items-center gap-2 rounded-md bg-success/15 p-3 text-md font-medium text-fg">
          <CircleCheck strokeWidth={1.75} aria-hidden className="size-5 shrink-0 text-success" />
          {t('group.action.joined')}
        </p>
        {active && status !== 'started' ? (
          <Button type="button" variant="outline" size="lg" disabled={leave.isPending} onClick={() => setConfirm('leave')}>
            {t('group.action.leave')}
          </Button>
        ) : null}
      </>
    );
  } else if (role === 'requested') {
    main = (
      <>
        <p role="status" className="flex items-center gap-2 rounded-md bg-warning/15 p-3 text-md font-medium text-fg">
          <Clock strokeWidth={1.75} aria-hidden className="size-5 shrink-0" />
          {t('group.action.requested')}
        </p>
        <Button type="button" variant="outline" size="lg" disabled={leave.isPending} onClick={() => setConfirm('cancel_request')}>
          {t('group.action.cancel_request')}
        </Button>
      </>
    );
  } else if (role === 'declined') {
    main = <p className="rounded-md bg-surface-2 p-3 text-md text-fg">{t('group.action.declined')}</p>;
  } else if (!joinable) {
    main = (
      <Button type="button" size="lg" disabled>
        {status === 'full' ? t('group.action.full') : t('group.action.closed')}
      </Button>
    );
  } else {
    const label = g.requires_approval ? t('group.action.request') : t('group.action.join');
    const button = (
      <Button
        type="button"
        size="lg"
        variant="accent"
        disabled={join.isPending}
        aria-busy={join.isPending || undefined}
        onClick={userId ? startJoin : undefined}
      >
        <UserPlus strokeWidth={1.75} aria-hidden />
        {label}
      </Button>
    );
    main = (
      <>
        {userId === null ? <LoginDialog trigger={button} intent={{ action: 'join', target: g.id }} /> : button}
        <p className="text-sm text-muted">{g.requires_approval ? t('group.detail.approval_hint') : t('group.detail.instant_hint')}</p>
      </>
    );
  }

  const confirmProps =
    confirm === 'cancel_group'
      ? {
          title: t('group.action.cancel_confirm_title'),
          description: t('group.action.cancel_confirm_body'),
          confirmLabel: t('group.action.cancel_confirm'),
          destructive: true,
          pending: cancel.isPending,
          onConfirm: runCancel,
        }
      : confirm === 'cancel_request'
        ? {
            title: t('group.action.cancel_request_confirm_title'),
            description: t('web.group.cancel_request_body'),
            confirmLabel: t('group.action.cancel_request_confirm'),
            destructive: false,
            pending: leave.isPending,
            onConfirm: () => runLeave(true),
          }
        : {
            title: t('group.action.leave_confirm_title'),
            description: t('group.action.leave_confirm_body'),
            confirmLabel: t('group.action.leave_confirm'),
            destructive: true,
            pending: leave.isPending,
            onConfirm: () => runLeave(false),
          };

  return (
    <div className="flex flex-col gap-3">
      {main}
      {rating}
      {chatLink}
      {promo}
      <div className="flex flex-col gap-2">
        {shareButton}
        {reportButton}
      </div>
      <JoinNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        pending={join.isPending}
        error={noteError}
        onSubmit={(note) => runJoin(note || undefined)}
      />
      <ConfirmDialog open={confirm !== null} onOpenChange={(v) => !v && setConfirm(null)} {...confirmProps} />
      {canRate ? (
        <RateGroupDialog
          open={rateOpen}
          onOpenChange={setRateOpen}
          groupId={g.id}
          groupTitle={g.title}
          hostName={g.host_name ?? ''}
          onRated={afterWrite}
        />
      ) : null}
    </div>
  );
}

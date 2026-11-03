'use client';

// /thong-bao — danh sách thông báo (bảng notifications, RLS: của mình), mới nhất trước, tải thêm khi cuộn tới cuối
// (cursor). Realtime ở DataProvider làm mới khi có thông báo mới. Bấm một dòng → đánh dấu đã đọc (optimistic, chuông giảm
// ngay) rồi mở đích theo notificationTarget (@hp/shared, giống app):
//   chat → /tin-nhan/[id] (cả chat nhóm) · listing → /tin/[slug] (đọc slug qua getListing; tin bị từ chối → trang sửa
//   tin; tin sắp hết hạn → Tin của tôi để gia hạn; không còn công khai → Tin của tôi) · group → /nhom/id/[id] (route
//   chuyển tới /nhom/[slug]); nhóm đã xong (group_completed) → /nhom/{slug}#danh-gia (đọc slug qua getGroup, mở sẵn
//   dialog đánh giá chủ nhóm) · khớp đồ thất lạc (lost_found_match) → tin của người kia /tin/[slug] · kết quả xin huy hiệu
//   (system, title_key badge_approved / badge_rejected, data {}) → /toi/huy-hieu · không rõ → ở lại trang.
// "Đánh dấu đã đọc" → tất cả. Loading skeleton / lỗi + thử lại / trống. Web không có push (capabilities.appOnly).
import { getGroup, getListing, type Notification } from '@hp/core';
import { useMarkNotificationsRead, useNotifications, useSession, useSupabase, useUnreadNotificationCount } from '@hp/core/react';
import { notificationTarget } from '@hp/shared';
import { Bell, CheckCheck, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { ClientOnly } from '@/components/shared/client-only';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoginDialog } from '@/components/shared/login-dialog';
import { Button } from '@/components/ui/button';
import { conversationHref } from '@/features/chat/use-chat';
import { groupRateHref } from '@/features/group/rate-link';
import { useRouter } from '@/i18n/navigation';
import { isBadgeNotification, NotificationRow, NotificationRowSkeleton } from './notification-row';

/** Dữ liệu chỉ có ở trình duyệt → server render tiêu đề + skeleton (ClientOnly). */
export function NotificationsView() {
  const t = useTranslations('common.notifications');
  return (
    <ClientOnly
      fallback={
        <div className="flex flex-col gap-4">
          <h1 className="px-4 text-2xl font-semibold text-fg">{t('title')}</h1>
          <div className="sm:px-4">
            <NotificationsSkeleton />
          </div>
        </div>
      }
    >
      <NotificationsContent />
    </ClientOnly>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-border">
      {Array.from({ length: 6 }, (_, i) => (
        <NotificationRowSkeleton key={i} />
      ))}
    </div>
  );
}

function NotificationsContent() {
  const t = useTranslations();
  const session = useSession();
  const client = useSupabase();
  const router = useRouter();
  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount().data ?? 0;
  const markRead = useMarkNotificationsRead();
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = notifications;
  const hasUnread = unreadCount > 0 || notifications.items.some((n) => !n.read_at);

  // Tải thêm khi mốc cuối danh sách vào màn hình (nút "Xem thêm" vẫn có cho bàn phím / trình đọc màn hình).
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const open = async (n: Notification) => {
    if (!n.read_at) markRead.mutate({ ids: [n.id] });
    if (isBadgeNotification(n)) {
      router.push('/toi/huy-hieu');
      return;
    }
    const target = notificationTarget(n.data);
    if (!target.id) return;
    if (target.screen === 'chat') {
      router.push(conversationHref(target.id));
    } else if (target.screen === 'listing') {
      if (n.type === 'listing_rejected') {
        router.push(`/toi/tin-cua-toi/${target.id}/sua`);
        return;
      }
      if (n.type === 'listing_expiring') {
        router.push({ pathname: '/toi/tin-cua-toi', query: { tab: 'active' } });
        return;
      }
      const res = await getListing(client, target.id);
      // Tin khớp đồ thất lạc là tin của NGƯỜI KHÁC: không còn công khai → về danh sách thất lạc (không phải Tin của tôi).
      router.push(res.data ? `/tin/${res.data.slug}` : n.type === 'lost_found_match' ? '/that-lac' : '/toi/tin-cua-toi');
    } else if (target.screen === 'group') {
      if (n.type === 'group_completed') {
        const res = await getGroup(client, target.id);
        if (res.data?.slug) {
          router.push(groupRateHref(res.data.slug));
          return;
        }
      }
      router.push(`/nhom/id/${target.id}`);
    }
  };

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4">
      <h1 className="text-2xl font-semibold text-fg">{t('common.notifications.title')}</h1>
      {session.userId && hasUnread ? (
        <Button type="button" variant="ghost" disabled={markRead.isPending} onClick={() => markRead.mutate({})}>
          <CheckCheck strokeWidth={1.75} aria-hidden />
          {t('common.notifications.mark_all_read')}
        </Button>
      ) : null}
    </div>
  );

  let body;
  if (session.isLoading || (session.userId && notifications.isPending)) {
    body = <NotificationsSkeleton />;
  } else if (!session.userId) {
    body = (
      <EmptyState
        icon={Bell}
        title={t('common.notifications.title')}
        description={t('common.notifications.login_body')}
        action={
          <LoginDialog
            trigger={
              <Button>
                <LogIn strokeWidth={1.75} aria-hidden />
                {t('auth.sign_in')}
              </Button>
            }
          />
        }
      />
    );
  } else if (notifications.isError && notifications.items.length === 0) {
    body = <ErrorState code={notifications.error.code} onRetry={() => void notifications.refetch()} />;
  } else if (notifications.items.length === 0) {
    body = (
      <EmptyState icon={Bell} title={t('common.notifications.empty_title')} description={t('common.notifications.empty_body')} />
    );
  } else {
    body = (
      <>
        <ul className="flex flex-col divide-y divide-border overflow-hidden bg-surface sm:rounded-lg sm:border sm:border-border">
          {notifications.items.map((n) => (
            <li key={n.id}>
              <NotificationRow notification={n} onOpen={() => void open(n)} />
            </li>
          ))}
        </ul>
        {hasNextPage ? (
          <div ref={sentinel} className="flex justify-center p-4">
            <Button type="button" variant="outline" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
              {t('listing.list.load_more')}
            </Button>
          </div>
        ) : null}
        {notifications.isError ? (
          <ErrorState code={notifications.error.code} onRetry={() => void notifications.refetch()} />
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      <div className="sm:px-4">{body}</div>
    </div>
  );
}

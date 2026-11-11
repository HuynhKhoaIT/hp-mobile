'use client';

// Chủ nhóm: danh sách người xin tham gia (list_group_members — RLS: chủ nhóm thấy mọi trạng thái + lời nhắn) với Nhận /
// Từ chối (Edge Function respond-join qua useRespondJoin: dòng đổi trạng thái ngay, nhận → tăng chỗ + thêm avatar; lỗi →
// trả lại + toast errors.*). Realtime (useGroupRealtime ở GroupActions) làm mới khi có người xin mới.
// Style Stitch "Thông báo có người đặt chuyến" (khớp RequestsList của app): tiêu đề có vạch cam + số yêu cầu (nhãn nền cam),
// mỗi yêu cầu một thẻ viền cam nhạt — ảnh + tên, lời nhắn trong khung trích dẫn vạch cam → Từ chối (viền) | Nhận (primary).
// Không "Liên hệ" / SĐT / ghế / thanh toán (không có tính năng đó; chat nhóm mở sau khi nhận).
import type { GroupMember } from '@hp/core';
import { useGroupMembers, useRespondJoin } from '@hp/core/react';
import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ErrorState } from '@/components/shared/error-state';
import { useToast } from '@/components/shared/toast';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarHeading } from '@/features/listing/components/safety-tip';
import { useErrorText } from '@/features/auth/components/use-error-text';

export function JoinRequests({ groupId, onChanged }: { groupId: string; onChanged: () => void }) {
  const t = useTranslations('group.requests');
  const errorText = useErrorText();
  const toast = useToast();
  const members = useGroupMembers(groupId);
  const respond = useRespondJoin(groupId);
  const requests = members.data?.filter((m) => m.status === 'requested') ?? [];

  const answer = (m: GroupMember, accept: boolean) => {
    const name = m.display_name ?? '';
    respond.mutate(
      { userId: m.user_id, accept, member: { id: m.user_id, name: m.display_name, avatar_url: m.avatar_url } },
      {
        onSuccess: () => {
          toast.show(accept ? t('accepted_toast', { name }) : t('declined_toast', { name }));
          onChanged();
        },
        onError: (e) => toast.show(errorText(e.code), 'error'),
      },
    );
  };

  let body;
  if (members.isPending) {
    body = (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-5 flex-1" />
        </div>
        <Skeleton className="h-11 w-full" />
      </div>
    );
  } else if (members.isError) {
    body = <ErrorState code={members.error.code} onRetry={() => void members.refetch()} />;
  } else if (requests.length === 0) {
    body = <p className="rounded-lg border border-border bg-surface p-4 text-md text-muted shadow-card">{t('empty')}</p>;
  } else {
    body = (
      <ul className="flex flex-col gap-3">
        {requests.map((m) => (
          <li key={m.user_id} className="flex flex-col gap-3 rounded-lg border-2 border-accent/40 bg-surface p-4 shadow-card">
            <div className="flex items-center gap-3">
              <UserAvatar avatar={m.avatar_url} name={m.display_name ?? ''} size="sm" />
              <p className="min-w-0 flex-1 truncate text-md font-semibold text-fg">{m.display_name}</p>
            </div>
            {m.note ? (
              <blockquote className="rounded-sm border-l-2 border-accent bg-surface-2 px-3 py-2 text-md text-muted italic">
                {m.note}
              </blockquote>
            ) : null}
            <div className="flex gap-2 *:flex-1">
              <Button type="button" size="sm" variant="outline" disabled={respond.isPending} onClick={() => answer(m, false)}>
                <X strokeWidth={1.75} aria-hidden />
                {t('decline')}
              </Button>
              <Button type="button" size="sm" disabled={respond.isPending} onClick={() => answer(m, true)}>
                <Check strokeWidth={1.75} aria-hidden />
                {t('accept')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby="requests-heading" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <BarHeading id="requests-heading">{t('title')}</BarHeading>
        {requests.length > 0 ? (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-semibold text-on-accent">
            {t('pending', { count: requests.length })}
          </span>
        ) : null}
      </div>
      {body}
    </section>
  );
}

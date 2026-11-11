'use client';

// Khối "Thành viên (N)" ở chi tiết nhóm (tiêu đề có vạch + thẻ, style Stitch, khớp MembersRow của app): hàng avatar (≤ 8,
// tên rút gọn) + số chỗ đã có người. Server render bản cache
// (fallback của ClientOnly — tắt JS vẫn đọc được); ở trình duyệt đọc nhóm "sống" (useLiveGroup) để hàng avatar và số chỗ
// đổi ngay khi tham gia / rời / duyệt (optimistic của @hp/core/react) và khi có Realtime.
import type { PublicGroup } from '@hp/core';
import { groupMembersPreview } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { ClientOnly } from '@/components/shared/client-only';
import { BarHeading } from '@/features/listing/components/safety-tip';
import { useLiveGroup } from '../use-live-group';
import { MemberAvatars } from './member-avatars';

export function GroupMembersBlock({ group }: { group: PublicGroup }) {
  const t = useTranslations('group');
  const members = groupMembersPreview(group.members);
  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-2">
      <BarHeading id="members-heading" tone="primary">
        {t('detail.members', { count: group.seats_taken })}
      </BarHeading>
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-card">
        <p className="text-md font-medium text-fg">{t('detail.seats_value', { taken: group.seats_taken, total: group.seats_total })}</p>
        {members.length > 0 ? (
          <div className="flex flex-col gap-2">
            <MemberAvatars
              members={members}
              total={group.seats_taken}
              max={8}
              size="md"
              moreLabel={(count) => t('card.members_more', { count })}
            />
            <p className="text-sm text-muted">
              {members
                .map((m) => m.name)
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        ) : (
          <p className="text-md text-muted">{t('detail.members_empty')}</p>
        )}
      </div>
    </section>
  );
}

function LiveMembers({ group }: { group: PublicGroup }) {
  return <GroupMembersBlock group={useLiveGroup(group)} />;
}

export function GroupMembers({ group }: { group: PublicGroup }) {
  return (
    <ClientOnly fallback={<GroupMembersBlock group={group} />}>
      <LiveMembers group={group} />
    </ClientOnly>
  );
}

'use client';

// Khối "Thành viên (N)" ở chi tiết nhóm: số chỗ đã có người + hàng avatar (≤ 8, tên rút gọn). Server render bản cache
// (fallback của ClientOnly — tắt JS vẫn đọc được); ở trình duyệt đọc nhóm "sống" (useLiveGroup) để hàng avatar và số chỗ
// đổi ngay khi tham gia / rời / duyệt (optimistic của @hp/core/react) và khi có Realtime.
import type { PublicGroup } from '@hp/core';
import { groupMembersPreview } from '@hp/shared';
import { useTranslations } from 'next-intl';
import { ClientOnly } from '@/components/shared/client-only';
import { useLiveGroup } from '../use-live-group';
import { MemberAvatars } from './member-avatars';

export function GroupMembersBlock({ group }: { group: PublicGroup }) {
  const t = useTranslations('group');
  const members = groupMembersPreview(group.members);
  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="members-heading" className="text-lg font-semibold text-fg">
          {t('detail.members', { count: group.seats_taken })}
        </h2>
        <p className="text-md text-muted">{t('detail.seats_value', { taken: group.seats_taken, total: group.seats_total })}</p>
      </div>
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

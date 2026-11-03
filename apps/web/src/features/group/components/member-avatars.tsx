// Hàng avatar thành viên chồng lên nhau (+N) — thẻ nhóm và trang chi tiết. Dữ liệu: public_groups.members (≤ 8 thành viên
// accepted, tên đã rút gọn "An N.") qua groupMembersPreview. Không hook, không 'use client': render được ở server lẫn client.
import type { GroupMemberPreview } from '@hp/shared';
import Image from 'next/image';
import { profileAvatarUrl } from '@/lib/images';
import { cn } from '@/lib/utils';

const SIZE = {
  sm: { box: 'size-7 text-xs', px: '28px', more: 'h-7 min-w-7 px-1.5 text-xs' },
  md: { box: 'size-10 text-md', px: '40px', more: 'h-10 min-w-10 px-2 text-sm' },
} as const;

export function MemberAvatars({
  members,
  total,
  max = 4,
  size = 'sm',
  moreLabel,
}: {
  members: GroupMemberPreview[];
  /** Tổng số thành viên (seats_taken) — có thể lớn hơn số avatar view trả về (≤ 8). */
  total: number;
  /** Số avatar hiện tối đa; phần còn lại thành "+N". */
  max?: number;
  size?: keyof typeof SIZE;
  /** Chữ "+N" đã dịch (group.card.members_more). */
  moreLabel: (count: number) => string;
}) {
  const shown = members.slice(0, max);
  const more = Math.max(0, total - shown.length);
  if (shown.length === 0 && more === 0) return null;
  const s = SIZE[size];

  return (
    <ul className="flex items-center -space-x-2">
      {shown.map((m) => {
        const src = profileAvatarUrl(m.avatar_url);
        const name = m.name ?? '';
        return (
          <li
            key={m.id}
            title={name || undefined}
            className={cn('relative inline-flex shrink-0 overflow-hidden rounded-full bg-primary-light ring-2 ring-surface', s.box)}
          >
            {src ? (
              <Image src={src} alt={name} fill unoptimized sizes={s.px} className="object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center font-semibold text-primary">
                <span aria-hidden>{name.trim().charAt(0).toUpperCase()}</span>
                <span className="sr-only">{name}</span>
              </span>
            )}
          </li>
        );
      })}
      {more > 0 ? (
        <li
          className={cn(
            'relative inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-semibold text-fg ring-2 ring-surface',
            s.more,
          )}
        >
          {moreLabel(more)}
        </li>
      ) : null}
    </ul>
  );
}

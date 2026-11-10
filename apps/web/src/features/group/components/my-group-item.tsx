// Một nhóm trong "Nhóm của tôi": GroupCard (thêm badge vai trò: Bạn tạo / Đã tham gia / Chờ duyệt) + dòng dưới thẻ:
//   đã chấm chủ nhóm → "Bạn đã chấm N/5"; thành viên, nhóm đã tới giờ / đã xong, chưa chấm → nút "Đánh giá"
//   (link /nhom/{slug}#danh-gia — trang nhóm tự mở dialog đánh giá).
// Không 'use client', không async: render được ở Server Component (trang đầu) lẫn Client Component ("Xem thêm").
import type { MyGroup } from '@hp/core';
import { groupDisplayStatus } from '@hp/shared';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, type BadgeTone } from '@/components/shared/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { groupRateHref } from '../rate-link';
import { GroupCard } from './group-card';

const ROLE_TONE: Record<string, BadgeTone> = { host: 'primary', accepted: 'success', requested: 'warning' };

/** Còn chấm được chủ nhóm: thành viên đã được nhận, chưa chấm, nhóm đã tới giờ / đã xong (không huỷ). */
export function canRateMyGroup(group: MyGroup, now: number): boolean {
  const status = groupDisplayStatus(group, new Date(now));
  return group.my_role === 'accepted' && group.my_rating == null && (status === 'started' || status === 'completed');
}

export function MyGroupItem({ group, now }: { group: MyGroup; now: number }) {
  const t = useTranslations();
  const role = group.my_role && ROLE_TONE[group.my_role] ? group.my_role : null;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-1 flex-col *:flex-1">
        <GroupCard
          group={group}
          now={now}
          extraBadge={role ? <Badge tone={ROLE_TONE[role]}>{t(`group.mine.role_${role}`)}</Badge> : null}
        />
      </div>
      {group.my_rating != null ? (
        <p className="flex min-h-11 items-center gap-2 px-1 text-md text-fg">
          <Star strokeWidth={1.75} aria-hidden className="size-5 shrink-0 fill-warning text-warning" />
          {t('group.rate.your_score', { score: group.my_rating })}
        </p>
      ) : canRateMyGroup(group, now) && group.slug ? (
        <Button asChild variant="outline">
          <Link href={groupRateHref(group.slug)} aria-label={`${t('group.rate.cta')}: ${group.title}`}>
            <Star strokeWidth={1.75} aria-hidden />
            {t('group.rate.cta')}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

/** Lưới "Nhóm của tôi": 1 cột điện thoại, 2 cột từ tablet. */
export const MY_GROUP_GRID_CLASS = 'grid grid-cols-1 gap-4 md:grid-cols-2';

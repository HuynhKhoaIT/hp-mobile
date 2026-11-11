// Các khối nội dung của hồ sơ công khai (/u/[id]), cùng thứ tự với app (apps/mobile/app/profile/[id].tsx):
//   "Nhóm đang mở" (chuyến xe / kèo người này tạo, chưa tới giờ — GroupGrid; rỗng → ẩn khối) → "Tin đang đăng" (ListingGrid
//   trang đầu render ở server — tắt JS vẫn đọc được; trang sau: PublicProfileMore; rỗng → EmptyState + CTA "Xem tin mới
//   đăng") → mẹo an toàn khi hẹn gặp.
// Khác Stitch (cố ý): các khối nối tiếp thay vì tab Tin / Kèo / Chuyến / Đánh giá có số đếm (core không trả tổng; không cần JS);
// không "Đánh giá từ anh em" (chưa có view công khai cho nội dung đánh giá); không "Xác minh danh tính & Khu vực" / "Tuyến hoạt
// động thường xuyên" (SĐT che, giấy tờ, tuyến đi lại — không có dữ liệu và là PII).
import type { GroupPage, Page, PublicListing } from '@hp/core';
import { Package } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { GroupGrid } from '@/features/group/components/group-card';
import { ListingGrid } from '@/features/listing/components/listing-grid';
import { BarHeading, SafetyTip } from '@/features/listing/components/safety-tip';
import { Link } from '@/i18n/navigation';
import { PublicProfileMore } from './public-profile-more';

export async function PublicProfileSections({
  userId,
  listings,
  groups,
  now,
  pageSize,
}: {
  userId: string;
  listings: Page<PublicListing>;
  groups: GroupPage;
  now: number;
  pageSize: number;
}) {
  const t = await getTranslations();
  return (
    <div className="flex flex-col gap-8 px-4 sm:px-0">
      {groups.items.length > 0 ? (
        <section aria-labelledby="profile-groups" className="flex flex-col gap-3">
          <BarHeading id="profile-groups">{t('common.profile.groups')}</BarHeading>
          <GroupGrid items={groups.items} now={now} />
        </section>
      ) : null}

      <section aria-labelledby="profile-listings" className="flex flex-col gap-3">
        <BarHeading id="profile-listings" tone="primary">
          {t('common.profile.listings')}
        </BarHeading>
        {listings.items.length > 0 ? (
          <>
            <ListingGrid items={listings.items} now={now} prioritizeFirst />
            {listings.nextCursor ? (
              <PublicProfileMore ownerId={userId} pageSize={pageSize} initialCursor={listings.nextCursor} />
            ) : null}
          </>
        ) : (
          <EmptyState
            icon={Package}
            title={t('common.profile.no_listings')}
            action={
              <Button asChild variant="outline">
                <Link href="/tin">{t('common.profile.browse_cta')}</Link>
              </Button>
            }
          />
        )}
      </section>

      <SafetyTip title={t('listing.tip.title')} text={t('common.profile.safety_tip')} />
    </div>
  );
}

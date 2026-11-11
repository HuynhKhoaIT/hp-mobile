// "Nhóm đang mở" của hồ sơ công khai (thay các tab "Kèo thể thao" / "Chuyến xe" của Stitch): chuyến xe / kèo người này tạo,
// còn mở hoặc đủ người, chưa tới giờ, sớm nhất trước (useHostGroups — view public_groups, ẩn khi chặn hai chiều).
// Khối phụ: đang tải → 1 thẻ chờ; lỗi → thẻ lỗi gọn có Thử lại; rỗng → ẩn cả khối (tin đang đăng vẫn là phần chính).
// Thẻ là GroupCard dùng chung; trang sau qua nút "Xem thêm". Giống bản web (public-profile-groups.tsx).
import { useHostGroups } from '@hp/core/react';
import { useTranslation } from 'react-i18next';
import { openGroup } from '@/features/group/navigation';
import { Button, Col, ErrorState, GroupCard, SectionHeader, SkeletonGroupCard } from '@/ui';

export function PublicProfileGroups({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const groups = useHostGroups(userId);
  if (!groups.isLoading && !groups.isError && groups.items.length === 0) return null;

  return (
    <Col gap={3}>
      <SectionHeader title={t('profile.groups')} bar="accent" size="md" />
      {groups.isLoading ? (
        <SkeletonGroupCard />
      ) : groups.isError ? (
        <ErrorState compact code={groups.error.code} onRetry={() => void groups.refetch()} />
      ) : (
        <>
          {groups.items.map((g) => (
            <GroupCard key={g.id} group={g} onPress={() => openGroup(g.id)} />
          ))}
          {groups.hasNextPage ? (
            <Button
              variant="outline"
              label={t('listing:list.load_more')}
              loading={groups.isFetchingNextPage}
              onPress={() => void groups.fetchNextPage()}
            />
          ) : null}
        </>
      )}
    </Col>
  );
}

// Screen type: Form
// Huy hiệu xác minh (tab Tôi → Huy hiệu; thông báo kết quả duyệt): giới thiệu (giấy tờ chỉ kiểm duyệt viên xem, xoá
// sau 30 ngày) → 4 huy hiệu REQUESTABLE_BADGES với trạng thái (đã có / chờ duyệt / bị từ chối + lý do / chưa xin).
// Xin: chọn huy hiệu → chụp / chọn ảnh giấy tờ → nén ≤ 1600 px WebP → useRequestBadge → toast "Đã gửi".
// Khách → mời đăng nhập; skeleton; lỗi thử lại; kéo làm mới. Chưa nhận PDF (cần thư viện chọn tệp).
import type { RequestableBadge } from '@hp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeRequestCard, BadgeRequestCardSkeleton } from '@/features/profile/components/BadgeRequestCard';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { useBadgeStates } from '@/features/profile/hooks';
import { backOrHome } from '@/features/listing/navigation';
import { Col, ErrorState, Header, Notice, Screen } from '@/ui';

export default function BadgesScreen() {
  const { t } = useTranslation();
  const badges = useBadgeStates();
  const [open, setOpen] = useState<RequestableBadge | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const signedOut = !badges.me.isLoading && !badges.me.userId;

  const onRefresh = () => {
    setRefreshing(true);
    void badges.refetch().finally(() => setRefreshing(false));
  };

  return (
    <Screen scroll refreshing={refreshing} onRefresh={signedOut ? undefined : onRefresh}>
      <Header title={t('badge_request.title')} back onBack={backOrHome} />
      {signedOut ? (
        <SignInPrompt />
      ) : badges.isLoading ? (
        <Col gap={3} className="pb-6">
          {Array.from({ length: 4 }, (_, i) => (
            <BadgeRequestCardSkeleton key={i} />
          ))}
        </Col>
      ) : badges.isError ? (
        <ErrorState code={badges.errorCode} onRetry={() => void badges.refetch()} />
      ) : (
        <Col gap={3} className="pb-6">
          <Notice text={t('badge_request.intro')} />
          {badges.states.map((s) => (
            <BadgeRequestCard
              key={s.badge}
              state={s}
              open={open === s.badge}
              onOpen={() => setOpen(s.badge)}
              onClose={() => setOpen(null)}
            />
          ))}
        </Col>
      )}
    </Screen>
  );
}

// Screen type: Form
// Huy hiệu xác minh (tab Tôi → Huy hiệu; thông báo kết quả duyệt) — style Stitch "Huy hiệu & Xác minh (BadgeRequestCard)",
// khớp /toi/huy-hieu của web: header xanh (PageHero: quay lại trong mờ, tiêu đề + dòng phụ, hộp tóm tắt số huy hiệu đã có /
// đang chờ) → BadgeCenter: lợi ích → chọn 1 trong 4 huy hiệu (REQUESTABLE_BADGES; đã có / chờ duyệt / bị từ chối + lý do /
// chưa xin) → gửi ảnh giấy tờ (chụp / chọn, nén ≤ 1600 px WebP → useRequestBadge) → hộp riêng tư → nút "Gửi xác minh"
// dính đáy. Khách → mời đăng nhập; skeleton đúng hình; lỗi thử lại; kéo làm mới. Header xanh tràn lên vùng trạng thái →
// chữ thanh trạng thái sáng khi màn đang mở. Khác Stitch: xem đầu BadgeCenter.tsx / BadgeRequestCard.tsx.
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { backOrHome } from '@/features/listing/navigation';
import { BadgeCenter, BadgeSummary, BadgeSummarySkeleton } from '@/features/profile/components/BadgeCenter';
import { BadgeRequestCardSkeleton } from '@/features/profile/components/BadgeRequestCard';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { useBadgeStates } from '@/features/profile/hooks';
import { ErrorState, PageHero, Screen, useScheme } from '@/ui';

export default function BadgesScreen() {
  const { t } = useTranslation();
  const badges = useBadgeStates();
  const focused = useIsFocused();
  const scheme = useScheme();
  const signedOut = !badges.me.isLoading && !badges.me.userId;
  const ready = !signedOut && !badges.isLoading && !badges.isError;

  return (
    <Screen>
      <PageHero title={t('badge_request.title')} subtitle={t('badge_request.subtitle')} onBack={backOrHome}>
        {ready ? (
          <BadgeSummary states={badges.states} phoneVerified={badges.phoneVerified} />
        ) : badges.isLoading && !signedOut ? (
          <BadgeSummarySkeleton />
        ) : null}
      </PageHero>
      {signedOut ? (
        <SignInPrompt />
      ) : badges.isLoading ? (
        <View className="flex-1 gap-3 overflow-hidden pt-4">
          {Array.from({ length: 3 }, (_, i) => (
            <BadgeRequestCardSkeleton key={i} />
          ))}
        </View>
      ) : badges.isError ? (
        <ErrorState code={badges.errorCode} onRetry={() => void badges.refetch()} />
      ) : (
        <BadgeCenter states={badges.states} onRefresh={badges.refetch} />
      )}
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}

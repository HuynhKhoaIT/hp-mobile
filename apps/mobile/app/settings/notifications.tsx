// Screen type: Form
// Cài đặt thông báo (từ chuông Thông báo / tab Tôi) — style Stitch "Cài đặt thông báo đẩy (PushPermissionCard)": header xanh
// (PageHero: quay lại trong mờ, "Thông báo đẩy" + dòng phụ) → NotificationSettings: thẻ quyền push của máy (xin quyền mềm /
// mở Cài đặt máy / đã bật) → "Loại thông báo" + Bật tất cả → công tắc theo nhóm (profiles.notification_prefs — đổi ngay, lỗi
// thì trả lại) → cam kết không quảng cáo. Chỉ ảnh hưởng push; danh sách Thông báo trong app vẫn đủ. Khách → mời đăng nhập
// (SignInPrompt); hồ sơ đang về → skeleton đúng hình; lỗi → thử lại; kéo làm mới. Header xanh tràn lên vùng trạng thái → chữ
// thanh trạng thái sáng khi màn đang mở. Khác Stitch: xem đầu NotificationSettings.tsx / PushPermissionCard.tsx.
import { useMyProfile } from '@hp/core/react';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { backOrHome } from '@/features/listing/navigation';
import { NotificationSettings, NotificationSettingsSkeleton } from '@/features/notifications/components/NotificationSettings';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { ErrorState, PageHero, Screen, useScheme } from '@/ui';

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const me = useMyProfile();
  const focused = useIsFocused();
  const scheme = useScheme();

  return (
    <Screen>
      <PageHero title={t('notifications.prefs.title')} subtitle={t('notifications.prefs.subtitle')} onBack={backOrHome} />
      {!me.isLoading && !me.userId ? (
        <SignInPrompt description={t('notifications.login_body')} />
      ) : me.isError ? (
        <ErrorState code={me.error.code} onRetry={() => void me.refetch()} />
      ) : !me.data ? (
        // Có phiên nhưng hồ sơ chưa về (đang tải / đang khôi phục cache persist)
        <NotificationSettingsSkeleton />
      ) : (
        <NotificationSettings profile={me.data} onRefresh={me.refetch} />
      )}
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}

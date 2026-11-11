// Screen type: Hub
// Tab Tôi (style Stitch "Trang cá nhân & Quản lý tin đăng"): hero xanh tràn mép (tiêu đề + chuông, thẻ hồ sơ trong mờ:
// avatar bấm đổi ảnh, dấu xác minh, tên, khu, tham gia từ; nút Xem hồ sơ + Huy hiệu xác minh) → dải số liệu (tin đang
// đăng · lượt xem · đánh giá) → lối tắt (Đăng tin · Tin của tôi · Nhóm của tôi) → khối Tin của tôi (chip trạng thái có
// số + tối đa 3 thẻ quản lý) → Cài đặt & hỗ trợ (Tin đã lưu, Thông báo, Thông báo đẩy, Ngôn ngữ, Đăng xuất, Xoá tài
// khoản) → miễn trừ. Khách: hero mời đăng nhập → Ngôn ngữ → miễn trừ. Mỗi khối tự có khung chờ / rỗng / lỗi.
import { useMyProfile } from '@hp/core/react';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { MeListingsPreview } from '@/features/profile/components/MeListingsPreview';
import { MeSettings } from '@/features/profile/components/MeSettings';
import { ProfileHero } from '@/features/profile/components/ProfileHero';
import { ProfileShortcuts, ProfileShortcutsSkeleton } from '@/features/profile/components/ProfileShortcuts';
import { ProfileStats, ProfileStatsSkeleton } from '@/features/profile/components/ProfileStats';
import { ErrorState, Screen, Text, useScheme } from '@/ui';

export default function MeScreen() {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const scheme = useScheme();
  const me = useMyProfile();
  const profile = me.data ?? null;

  return (
    <Screen scroll edgeToEdge tab statusBar="primary">
      <ProfileHero profile={profile} loading={me.isLoading} error={me.isError} />

      <View className="gap-6 px-4 pt-4">
        {me.isLoading ? (
          <>
            <ProfileStatsSkeleton />
            <ProfileShortcutsSkeleton />
          </>
        ) : me.isError ? (
          <ErrorState code={me.error.code} onRetry={() => void me.refetch()} />
        ) : profile ? (
          <>
            <ProfileStats profile={profile} />
            <ProfileShortcuts />
            <MeListingsPreview />
          </>
        ) : null}

        {me.isLoading ? null : <MeSettings signedIn={!!profile} />}

        <Text variant="caption" tone="muted" className="text-center">
          {t('disclaimer')}
        </Text>
      </View>

      {/* Hero xanh: chữ / icon thanh trạng thái tương phản với primary (sáng → chữ trắng, tối → chữ tối). */}
      {focused ? <StatusBar style={scheme === 'dark' ? 'dark' : 'light'} /> : null}
    </Screen>
  );
}

// "Cài đặt & hỗ trợ" ở tab Tôi (style Stitch): tiêu đề vạch primary → MỘT thẻ các dòng ngăn vạch (ô icon 32 nền
// surface-2 icon primary + nhãn + mũi tên): Tin đã lưu · Thông báo · Thông báo đẩy → Ngôn ngữ (hàng chip vi / en / zh,
// đổi ngay) → Đăng xuất · Xoá tài khoản (ô icon danger/10, chữ danger đậm; xoá mở sheet gõ từ xác nhận).
// Khách: chỉ còn Ngôn ngữ.
import { LOCALES } from '@hp/shared';
import { Bell, BellRing, Heart, Languages, LogOut, UserX } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { openSavedListings } from '@/features/listing/navigation';
import { Card, Chip, Divider, Icon, MenuItem, Row, SectionHeader, Text } from '@/ui';
import { useChangeLocale, useSignOut } from '../hooks';
import { openNotifications, openNotificationSettings } from '../navigation';
import { DeleteAccountSheet } from './DeleteAccountSheet';

export function MeSettings({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation();
  const locale = useChangeLocale();
  const signOut = useSignOut();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <View className="gap-3">
      <SectionHeader bar="primary" title={t('profile.settings_section')} />
      <Card padded={false}>
        {signedIn ? (
          <>
            <MenuItem iconBox icon={Heart} label={t('listing:saved.title')} onPress={openSavedListings} />
            <Divider />
            <MenuItem iconBox icon={Bell} label={t('notifications.title')} onPress={openNotifications} />
            <Divider />
            <MenuItem iconBox icon={BellRing} label={t('notifications.prefs.title')} onPress={openNotificationSettings} />
            <Divider />
          </>
        ) : null}
        <View className="gap-3 px-4 py-3">
          <View className="flex-row items-center gap-3">
            <View className="size-8 items-center justify-center rounded-md bg-surface-2">
              <Icon icon={Languages} tone="primary" />
            </View>
            <Text variant="label" accessibilityRole="header">
              {t('settings.language')}
            </Text>
          </View>
          <Row gap={2} wrap>
            {LOCALES.map((l) => (
              <Chip key={l} label={t(`locale.${l}`)} selected={locale.current === l} onPress={() => locale.change(l)} />
            ))}
          </Row>
        </View>
        {signedIn ? (
          <>
            <Divider />
            <MenuItem iconBox icon={LogOut} label={t('auth:sign_out')} tone="danger" onPress={() => void signOut()} />
            <Divider />
            <MenuItem iconBox icon={UserX} label={t('account.delete_title')} tone="danger" chevron={false} onPress={() => setDeleteOpen(true)} />
          </>
        ) : null}
      </Card>
      {signedIn ? <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} /> : null}
    </View>
  );
}

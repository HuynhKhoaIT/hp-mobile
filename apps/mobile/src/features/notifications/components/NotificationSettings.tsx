// Thân màn Cài đặt thông báo (style Stitch "Cài đặt thông báo đẩy (PushPermissionCard)"), cuộn + kéo làm mới hồ sơ:
// thẻ quyền push của máy (PushPermissionCard, kể cả trạng thái đã bật) → tiêu đề có vạch cam "Loại thông báo" + "Bật tất
// cả" (khi còn nhóm đang tắt) → thẻ danh sách công tắc theo NOTIFICATION_PREF_KEYS (ToggleRow có ô icon màu: tin nhắn
// primary, tin đăng màu Pass đồ, ghép nhóm màu Ghép xe, đồ thất lạc màu Thất lạc) → hộp cam kết không gửi quảng cáo.
// Công tắc ghi profiles.notification_prefs qua useUpdateNotificationPrefs (@hp/core: đổi ngay, lỗi thì trả lại + toast).
// Chỉ ảnh hưởng push; danh sách Thông báo trong app vẫn đủ.
// Khác Stitch (cố ý): không "Khung giờ yên tĩnh (theo ca)" + giờ bắt đầu / thức dậy + "vẫn rung khi khẩn cấp" và không
// "Thử nghiệm nhận thông báo / Gửi thử ngay" (chưa có cột / Edge Function cho giờ yên tĩnh hay gửi thử); 4 nhóm thật thay
// 6 nhóm mẫu (Ghép xe, Việc làm, Kèo thể thao, Rơi đồ, Phòng trọ & thanh lý, Tin nhắn — notification_prefs chỉ có
// messages / listings / groups / lost_found); không nhãn "Quan trọng" trên nhóm đồ thất lạc; công tắc bật màu primary theo
// token (không cam); không footer phiên bản / bottom nav (màn con có nút quay lại).
import type { MyProfile } from '@hp/core';
import { useNotificationPrefs, useUpdateNotificationPrefs } from '@hp/core/react';
import { NOTIFICATION_PREF_KEYS, type NotificationPrefKey } from '@hp/shared';
import { Car, FileText, type LucideIcon, MessageCircle, SearchCheck, ShieldCheck } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useErrorText } from '@/lib/errors';
import { Card, Divider, Icon, Row, SectionHeader, type ServiceKey, Skeleton, Text, toast, ToggleRow, useTheme } from '@/ui';
import { PushPermissionCard } from './PushPermissionCard';

const PREF_LOOK: Record<NotificationPrefKey, { icon: LucideIcon; box: ServiceKey | 'primary' }> = {
  messages: { icon: MessageCircle, box: 'primary' },
  listings: { icon: FileText, box: 'pass' },
  groups: { icon: Car, box: 'ride' },
  lost_found: { icon: SearchCheck, box: 'lostFound' },
};

export function NotificationSettings({ profile, onRefresh }: { profile: MyProfile; onRefresh: () => Promise<unknown> }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const errorText = useErrorText();
  const prefs = useNotificationPrefs(profile);
  const update = useUpdateNotificationPrefs();
  const [refreshing, setRefreshing] = useState(false);
  const allOn = NOTIFICATION_PREF_KEYS.every((key) => prefs[key]);

  const save = (next: typeof prefs) => update.mutate(next, { onError: (e) => toast.show(errorText(e.code), 'danger') });
  const toggle = (key: NotificationPrefKey, value: boolean) => save({ ...prefs, [key]: value });
  const enableAll = () => save(Object.fromEntries(NOTIFICATION_PREF_KEYS.map((key) => [key, true])) as typeof prefs);

  const refresh = () => {
    setRefreshing(true);
    void onRefresh().finally(() => setRefreshing(false));
  };

  return (
    <ScrollView
      className="-mx-4 flex-1"
      contentContainerClassName="gap-5 px-4 pb-8 pt-4"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
          progressBackgroundColor={theme.colors.surface}
        />
      }
    >
      <PushPermissionCard showGranted />

      <View className="gap-3">
        <SectionHeader
          title={t('notifications.prefs.section_title')}
          bar="accent"
          action={allOn ? undefined : { label: t('notifications.prefs.enable_all'), onPress: enableAll }}
        />
        <Card padded={false}>
          {NOTIFICATION_PREF_KEYS.map((key, i) => (
            <Fragment key={key}>
              {i > 0 ? <Divider /> : null}
              <ToggleRow
                icon={PREF_LOOK[key].icon}
                iconBox={PREF_LOOK[key].box}
                label={t(`notifications.prefs.${key}`)}
                hint={t(`notifications.prefs.${key}_hint`)}
                value={prefs[key]}
                onValueChange={(next) => toggle(key, next)}
              />
            </Fragment>
          ))}
        </Card>
      </View>

      <Row gap={3} align="start" className="rounded-lg border border-border bg-surface-2 p-4">
        <Icon icon={ShieldCheck} tone="primary" />
        <Text tone="muted" className="flex-1">
          {t('notifications.prefs.commitment')}
        </Text>
      </Row>
    </ScrollView>
  );
}

export function NotificationSettingsSkeleton() {
  return (
    <View className="flex-1 gap-5 overflow-hidden pt-4" accessibilityElementsHidden>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-6 w-1/2 rounded-full" />
      <Skeleton className="h-72 w-full rounded-lg" />
    </View>
  );
}

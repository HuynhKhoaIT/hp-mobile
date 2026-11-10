// Screen type: Form
// Cài đặt thông báo: bật / tắt push theo nhóm (profiles.notification_prefs — công tắc đổi ngay, lỗi thì trả lại),
// thẻ bật quyền push của máy. Chỉ ảnh hưởng push; danh sách Thông báo trong app vẫn đủ. Khách → mời đăng nhập.
import { useMyProfile, useNotificationPrefs, useUpdateNotificationPrefs } from '@hp/core/react';
import { NOTIFICATION_PREF_KEYS, type NotificationPrefKey } from '@hp/shared';
import type { LucideIcon } from 'lucide-react-native';
import { BriefcaseBusiness, Car, MessageCircle, SearchCheck } from 'lucide-react-native';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { backOrHome } from '@/features/listing/navigation';
import { PushPermissionCard } from '@/features/notifications/components/PushPermissionCard';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { useErrorText } from '@/lib/errors';
import { Card, Col, Divider, ErrorState, Header, Screen, Skeleton, Text, toast, ToggleRow } from '@/ui';

const ICON: Record<NotificationPrefKey, LucideIcon> = {
  messages: MessageCircle,
  listings: BriefcaseBusiness,
  groups: Car,
  lost_found: SearchCheck,
};

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const me = useMyProfile();
  const prefs = useNotificationPrefs(me.data);
  const update = useUpdateNotificationPrefs();

  const toggle = (key: NotificationPrefKey, next: boolean) =>
    update.mutate({ ...prefs, [key]: next }, { onError: (e) => toast.show(errorText(e.code), 'danger') });

  return (
    <Screen scroll>
      <Header title={t('notifications.prefs.title')} back onBack={backOrHome} />
      {!me.isLoading && !me.userId ? (
        <SignInPrompt />
      ) : me.isError ? (
        <ErrorState code={me.error.code} onRetry={() => void me.refetch()} />
      ) : !me.data ? (
        // Có phiên nhưng hồ sơ chưa về (đang tải / đang khôi phục cache persist)
        <Col gap={3}>
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-64 w-full rounded-md" />
        </Col>
      ) : (
        <Col gap={4}>
          <PushPermissionCard />
          <Text tone="muted">{t('notifications.prefs.subtitle')}</Text>
          <Card padded={false}>
            {NOTIFICATION_PREF_KEYS.map((key, i) => (
              <Fragment key={key}>
                {i > 0 ? <Divider /> : null}
                <ToggleRow
                  icon={ICON[key]}
                  label={t(`notifications.prefs.${key}`)}
                  hint={t(`notifications.prefs.${key}_hint`)}
                  value={prefs[key]}
                  onValueChange={(next) => toggle(key, next)}
                />
              </Fragment>
            ))}
          </Card>
        </Col>
      )}
    </Screen>
  );
}

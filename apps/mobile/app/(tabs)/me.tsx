// Screen type: Hub
// Tab Tôi: hồ sơ (ảnh đại diện đổi được, tên, tham gia từ) → Tin của tôi, Tin đã lưu, Nhóm của tôi (tuần 8), Huy hiệu
// xác minh (tuần 10) → thông báo → ngôn ngữ → đăng xuất, Xoá tài khoản (sheet gõ từ xác nhận, tuần 10) → miễn trừ.
// Thông báo + cài đặt thông báo đẩy (tuần 6). Khách: lời mời đăng nhập + đổi ngôn ngữ.
import { useMyProfile } from '@hp/core/react';
import { LOCALES } from '@hp/shared';
import { router } from 'expo-router';
import { Bell, BellRing, Heart, ListChecks, LogOut, ShieldCheck, UserX, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openMyGroups } from '@/features/group/navigation';
import { openMyListings, openSavedListings } from '@/features/listing/navigation';
import { AvatarPicker } from '@/features/profile/components/AvatarPicker';
import { DeleteAccountSheet } from '@/features/profile/components/DeleteAccountSheet';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { useChangeLocale, useSignOut } from '@/features/profile/hooks';
import { openBadges } from '@/features/profile/navigation';
import { formatDate } from '@/lib/format';
import { Card, Chip, Col, Divider, ErrorState, MenuItem, Row, Screen, SectionHeader, Skeleton, Text } from '@/ui';

export default function MeScreen() {
  const { t } = useTranslation();
  const me = useMyProfile();
  const locale = useChangeLocale();
  const signOut = useSignOut();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <Screen scroll tab>
      <Text variant="heading" accessibilityRole="header" className="pb-3 pt-4">
        {t('nav.me')}
      </Text>

      {me.isLoading ? (
        <Col gap={3}>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-24 w-full" />
        </Col>
      ) : me.isError ? (
        <ErrorState code={me.error.code} onRetry={() => void me.refetch()} />
      ) : !me.data ? (
        <SignInPrompt />
      ) : (
        <Col gap={5}>
          <Card>
            <Col gap={3}>
              <Col gap={1}>
                <Text variant="title">{me.data.full_name}</Text>
                <Text variant="caption" tone="muted">
                  {t('listing:detail.member_since', { date: formatDate(me.data.created_at) })}
                </Text>
              </Col>
              <AvatarPicker userId={me.data.id} value={me.data.avatar_url} name={me.data.full_name} />
            </Col>
          </Card>
          <Card padded={false}>
            <MenuItem icon={ListChecks} label={t('listing:manage.title')} onPress={() => openMyListings()} />
            <Divider />
            <MenuItem icon={Heart} label={t('listing:saved.title')} onPress={openSavedListings} />
            <Divider />
            <MenuItem icon={Users} label={t('group:mine.title')} onPress={() => openMyGroups()} />
            <Divider />
            <MenuItem icon={ShieldCheck} label={t('badge_request.title')} onPress={openBadges} />
          </Card>
          <Card padded={false}>
            <MenuItem icon={Bell} label={t('notifications.title')} onPress={() => router.push('/notifications')} />
            <Divider />
            <MenuItem icon={BellRing} label={t('notifications.prefs.title')} onPress={() => router.push('/settings/notifications')} />
          </Card>
        </Col>
      )}

      <Col gap={3} className="pt-6">
        <SectionHeader title={t('settings.language')} />
        <Row gap={2} wrap>
          {LOCALES.map((l) => (
            <Chip key={l} label={t(`locale.${l}`)} selected={locale.current === l} onPress={() => locale.change(l)} />
          ))}
        </Row>
      </Col>

      {me.data ? (
        <Card padded={false} className="mt-6">
          <MenuItem icon={LogOut} label={t('auth:sign_out')} tone="danger" chevron={false} onPress={() => void signOut()} />
          <Divider />
          <MenuItem icon={UserX} label={t('account.delete_title')} tone="danger" chevron={false} onPress={() => setDeleteOpen(true)} />
        </Card>
      ) : null}
      <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />

      <Text variant="caption" tone="muted" className="pt-6 text-center">
        {t('disclaimer')}
      </Text>
    </Screen>
  );
}

// Screen type: Hub
// Tab Tôi: hồ sơ (ảnh đại diện đổi được, tên, tham gia từ) → Tin của tôi, Tin đã lưu → ngôn ngữ → đăng xuất → miễn trừ.
// Khách: lời mời đăng nhập + đổi ngôn ngữ. Cài đặt đầy đủ (thông báo, xoá tài khoản…) ở tuần 6.
import { useMyProfile } from '@hp/core/react';
import { LOCALES } from '@hp/shared';
import { Heart, ListChecks, LogOut } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { openMyListings, openSavedListings } from '@/features/listing/navigation';
import { AvatarPicker } from '@/features/profile/components/AvatarPicker';
import { SignInPrompt } from '@/features/profile/components/SignInPrompt';
import { useChangeLocale, useSignOut } from '@/features/profile/hooks';
import { formatDate } from '@/lib/format';
import { Card, Chip, Col, Divider, ErrorState, MenuItem, Row, Screen, SectionHeader, Skeleton, Text } from '@/ui';

export default function MeScreen() {
  const { t } = useTranslation();
  const me = useMyProfile();
  const locale = useChangeLocale();
  const signOut = useSignOut();

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
        </Card>
      ) : null}

      <Text variant="caption" tone="muted" className="pt-6 text-center">
        {t('disclaimer')}
      </Text>
    </Screen>
  );
}

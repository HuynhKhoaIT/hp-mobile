// Screen type: Hub
// Màn tạm cho tới khi có Hub thật (tuần 3): tên app, dòng miễn trừ, thử đăng nhập (requireAuth) / đăng xuất,
// lối vào ui-gallery khi chạy dev.
import { useMyProfile } from '@hp/core/react';
import { APP_NAME } from '@hp/shared';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { requireAuth, signOutApp } from '@/core/auth';
import { Avatar, Button, Card, Col, Row, Screen, Skeleton, Text, toast } from '@/ui';

export default function HomeScreen() {
  const { t } = useTranslation();
  const me = useMyProfile();

  return (
    <Screen>
      <Col gap={4} align="center" justify="center" className="flex-1">
        <Text variant="heading" className="text-center">
          {APP_NAME}
        </Text>
        <Text variant="caption" tone="muted" className="text-center">
          {t('disclaimer')}
        </Text>

        {me.isLoading ? (
          <Skeleton className="h-12 w-48" />
        ) : me.data ? (
          <Card className="self-stretch">
            <Row gap={3}>
              <Avatar name={me.data.full_name || '?'} uri={me.data.avatar_url} />
              <Text variant="label" className="flex-1">
                {me.data.full_name}
              </Text>
              <Button
                label={t('auth:sign_out')}
                variant="outline"
                size="sm"
                onPress={async () => {
                  await signOutApp();
                  toast.show(t('auth:signed_out'));
                }}
              />
            </Row>
          </Card>
        ) : (
          <Button label={t('auth:sign_in')} onPress={() => requireAuth(() => toast.show(t('auth:signed_in'), 'success'))} />
        )}

        {__DEV__ ? (
          <Link href="/ui-gallery" asChild>
            <Pressable accessibilityRole="link" className="mt-2 min-h-12 justify-center px-4">
              <Text variant="label" tone="primary">
                {t('dev.open_gallery')}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </Col>
    </Screen>
  );
}

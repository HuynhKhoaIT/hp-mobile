// Chọn / đổi ảnh đại diện (onboarding bước 2) — giống web AvatarPicker: ảnh tròn + nút, không bắt buộc,
// lỗi chỉ hiện dưới nút và không chặn bước tiếp theo. Chọn + upload qua useAvatarChange (hooks.ts, dùng chung hero tab
// Tôi) → cache hồ sơ tự cập nhật.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorText } from '@/lib/errors';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Button, Col, Row, Text } from '@/ui';
import { useAvatarChange } from '../hooks';

export function AvatarPicker({ userId, value, name }: { userId: string; value: string | null; name: string }) {
  const { t } = useTranslation('auth');
  const errorText = useErrorText();
  const [error, setError] = useState<string | null>(null);
  const avatar = useAvatarChange(userId, setError);

  const choose = () => {
    setError(null);
    avatar.choose();
  };

  return (
    <Col gap={2}>
      <Text variant="label">{t('onboarding.avatar_label')}</Text>
      <Row gap={4}>
        <Avatar uri={profileAvatarUrl(value)} name={name || '?'} size="lg" />
        <Button
          label={avatar.isUploading ? t('onboarding.avatar_uploading') : value ? t('onboarding.avatar_change') : t('onboarding.avatar_pick')}
          variant="outline"
          loading={avatar.isPending}
          onPress={choose}
        />
      </Row>
      <Text variant="caption" tone="muted">
        {t('onboarding.avatar_hint')}
      </Text>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {errorText(error)}
        </Text>
      ) : null}
    </Col>
  );
}

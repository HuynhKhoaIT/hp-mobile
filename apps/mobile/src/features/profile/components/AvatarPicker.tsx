// Chọn / đổi ảnh đại diện (onboarding bước 2) — giống web AvatarPicker: ảnh tròn + nút, không bắt buộc,
// lỗi chỉ hiện dưới nút và không chặn bước tiếp theo. Upload qua useUploadAvatar (@hp/core/react) → cache hồ sơ tự cập nhật.
import { useUploadAvatar } from '@hp/core/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorText } from '@/lib/errors';
import { profileAvatarUrl } from '@/lib/images';
import { Avatar, Button, Col, Row, Text } from '@/ui';
import { pickAvatar } from '../avatar';

export function AvatarPicker({ userId, value, name }: { userId: string; value: string | null; name: string }) {
  const { t } = useTranslation('auth');
  const errorText = useErrorText();
  const upload = useUploadAvatar();
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const pending = picking || upload.isPending;

  const choose = async () => {
    setError(null);
    setPicking(true);
    const prepared = await pickAvatar();
    setPicking(false);
    if (!prepared) return;
    if ('error' in prepared) return setError(prepared.error);
    upload.mutate({ userId, ...prepared.data }, { onError: (e) => setError(e.code) });
  };

  return (
    <Col gap={2}>
      <Text variant="label">{t('onboarding.avatar_label')}</Text>
      <Row gap={4}>
        <Avatar uri={profileAvatarUrl(value)} name={name || '?'} size="lg" />
        <Button
          label={upload.isPending ? t('onboarding.avatar_uploading') : value ? t('onboarding.avatar_change') : t('onboarding.avatar_pick')}
          variant="outline"
          loading={pending}
          onPress={() => void choose()}
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

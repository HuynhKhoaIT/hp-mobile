// Screen type: Form
// Bước 1 đăng nhập: số điện thoại → gửi OTP; hoặc Google. Đã có phiên (vd mở lại app) → đi tiếp luôn.
import { sendPhoneOtp } from '@hp/core';
import { useSession, useSupabase } from '@hp/core/react';
import { router } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { continueAfterSignIn, signInWithGoogleApp } from '@/core/auth';
import { useErrorText } from '@/lib/errors';
import { Button, Col, Divider, Header, Input, Row, Screen, Skeleton, Text } from '@/ui';

export default function PhoneScreen() {
  const { t } = useTranslation('auth');
  const errorText = useErrorText();
  const client = useSupabase();
  const { session, isLoading } = useSession();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (session) void continueAfterSignIn();
  }, [session]);

  const submit = async () => {
    setPending(true);
    setError(null);
    const result = await sendPhoneOtp(client, { phone });
    setPending(false);
    if (result.error) return setError(result.error.code);
    router.push({ pathname: '/otp', params: { phone: result.data.phone } });
  };

  const google = async () => {
    setPending(true);
    setError(null);
    const result = await signInWithGoogleApp();
    setPending(false);
    if (result.error && result.error.code !== 'cancelled') setError(result.error.code);
    // Thành công: onAuthStateChange → session → continueAfterSignIn ở effect trên.
  };

  if (isLoading || session) {
    return (
      <Screen>
        <Col gap={3} className="pt-16">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-12 w-full" />
        </Col>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboard>
      <Header />
      <Col gap={6} className="pt-4">
        <Col gap={2}>
          <Text variant="heading" accessibilityRole="header">
            {t('phone.title')}
          </Text>
          <Text tone="muted">{t('phone.subtitle')}</Text>
        </Col>
        <Input
          label={t('phone.label')}
          placeholder={t('phone.placeholder')}
          icon={Phone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          value={phone}
          onChangeText={setPhone}
          error={error ? errorText(error) : null}
          returnKeyType="send"
          onSubmitEditing={() => void submit()}
          autoFocus
        />
        <Button label={t('phone.submit')} fullWidth loading={pending} disabled={phone.trim().length === 0} onPress={() => void submit()} />
        <Row gap={3}>
          <Divider className="flex-1" />
          <Text variant="caption" tone="muted">
            {t('phone.or')}
          </Text>
          <Divider className="flex-1" />
        </Row>
        <Button label={t('phone.google')} variant="outline" fullWidth disabled={pending} onPress={() => void google()} />
      </Col>
    </Screen>
  );
}

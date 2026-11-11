// Screen type: Form
// Bước 1 đăng nhập (style Stitch "Đăng nhập gọn nhẹ"): biểu tượng app + tên + câu giới thiệu → thẻ (tiêu đề, câu phụ, ô số
// điện thoại, nút Gửi mã) → "hoặc" → Google → chân màn (Điều khoản · Chính sách bảo mật + miễn trừ). Không đăng nhập Zalo
// (không có). Số được chuẩn hoá / kiểm tra ở @hp/shared, giới hạn gửi lại do server. Đã có phiên (vd mở lại app) → đi tiếp luôn.
import { sendPhoneOtp } from '@hp/core';
import { useSession, useSupabase } from '@hp/core/react';
import { APP_NAME } from '@hp/shared';
import { router } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { continueAfterSignIn, signInWithGoogleApp } from '@/core/auth';
import { AuthLegal } from '@/features/auth/components/AuthLegal';
import { useErrorText } from '@/lib/errors';
import { Button, Card, Col, Divider, Header, Input, LogoMark, Row, Screen, Skeleton, Spacer, Text } from '@/ui';

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
        <Col gap={4} align="center" className="pt-24">
          <Skeleton className="size-14 rounded-lg" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </Col>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboard>
      <Header />
      <Col gap={6} className="pt-2">
        <Col gap={3} align="center">
          <LogoMark size="lg" />
          <Col gap={1} align="center">
            <Text variant="titleLg" weight="bold" tone="primary" className="text-center">
              {APP_NAME}
            </Text>
            <Text variant="caption" tone="muted" className="text-center">
              {t('phone.tagline')}
            </Text>
          </Col>
        </Col>

        <Card className="gap-4">
          <Col gap={1}>
            <Text variant="title" accessibilityRole="header">
              {t('phone.title')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('phone.subtitle')}
            </Text>
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
        </Card>

        <Row gap={3}>
          <Divider className="flex-1" />
          <Text variant="caption" tone="muted">
            {t('phone.or')}
          </Text>
          <Divider className="flex-1" />
        </Row>
        <Button label={t('phone.google')} variant="outline" fullWidth disabled={pending} onPress={() => void google()} />
      </Col>
      <Spacer size={6} />
      <AuthLegal />
    </Screen>
  );
}

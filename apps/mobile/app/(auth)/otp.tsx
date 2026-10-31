// Screen type: Form
// Bước 2 đăng nhập: nhập mã 6 số (iOS / Android tự điền từ tin nhắn), gửi lại sau 60 giây.
import { sendPhoneOtp, verifyPhoneOtp } from '@hp/core';
import { useSupabase } from '@hp/core/react';
import { formatVnPhone, OTP_LENGTH, OTP_RESEND_SECONDS } from '@hp/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { continueAfterSignIn } from '@/core/auth';
import { useErrorText } from '@/lib/errors';
import { Button, Col, Header, Input, Row, Screen, Text } from '@/ui';

export default function OtpScreen() {
  const { t } = useTranslation('auth');
  const errorText = useErrorText();
  const client = useSupabase();
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [wait, setWait] = useState(OTP_RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const verify = async (code = token) => {
    if (code.length !== OTP_LENGTH) return;
    setPending(true);
    setError(null);
    const result = await verifyPhoneOtp(client, { phone, token: code });
    if (result.error) {
      setPending(false);
      return setError(result.error.code);
    }
    const next = await continueAfterSignIn();
    if (next === 'error') {
      setPending(false);
      setError('unknown');
    }
  };

  const resend = async () => {
    setError(null);
    setWait(OTP_RESEND_SECONDS);
    const result = await sendPhoneOtp(client, { phone });
    if (result.error) setError(result.error.code);
  };

  return (
    <Screen scroll keyboard>
      <Header />
      <Col gap={6} className="pt-4">
        <Col gap={2}>
          <Text variant="heading" accessibilityRole="header">
            {t('otp.title')}
          </Text>
          <Text tone="muted">{t('otp.subtitle', { phone: phone ? formatVnPhone(phone) : '' })}</Text>
        </Col>
        <Input
          label={t('otp.label')}
          keyboardType="number-pad"
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          maxLength={OTP_LENGTH}
          value={token}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, '');
            setToken(digits);
            // Đủ 6 số (thường do hệ điều hành tự điền) → xác nhận luôn, khỏi bấm nút.
            if (digits.length === OTP_LENGTH) void verify(digits);
          }}
          error={error ? errorText(error) : null}
          className="text-center text-2xl"
          autoFocus
        />
        <Button label={t('otp.submit')} fullWidth loading={pending} disabled={token.length !== OTP_LENGTH} onPress={() => void verify()} />
        <Row justify="between" wrap>
          <Button label={t('otp.change_phone')} variant="ghost" size="sm" onPress={() => router.back()} />
          <Button
            label={wait > 0 ? t('otp.resend_in', { seconds: wait }) : t('otp.resend')}
            variant="ghost"
            size="sm"
            disabled={wait > 0}
            onPress={() => void resend()}
          />
        </Row>
      </Col>
    </Screen>
  );
}

// Screen type: Form
// Bước 2 đăng nhập (style Stitch "Nhập mã OTP"): ô khoá → tiêu đề → "Mã 6 số đã gửi qua tin nhắn tới" + viên số điện
// thoại có nút Đổi số → hàng 6 ô mã (OtpInput: iOS / Android tự điền từ tin nhắn, đủ 6 số tự xác nhận) → đếm ngược gửi
// lại (OTP_RESEND_SECONDS, server vẫn giới hạn) → nút Xác nhận → nhắc không chia sẻ mã. Không gửi qua Zalo / gọi thoại
// (không có).
import { sendPhoneOtp, verifyPhoneOtp } from '@hp/core';
import { useSupabase } from '@hp/core/react';
import { formatVnPhone, OTP_LENGTH, OTP_RESEND_SECONDS } from '@hp/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock, LockKeyhole, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { continueAfterSignIn } from '@/core/auth';
import { AuthHero } from '@/features/auth/components/AuthHero';
import { useErrorText } from '@/lib/errors';
import { Button, Col, Header, Icon, OtpInput, Row, Screen, Spacer, Text } from '@/ui';

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
        <AuthHero variant="center" icon={LockKeyhole} title={t('otp.title')} subtitle={t('otp.sent_to')}>
          <Row gap={2} className="mt-1 rounded-full border border-border bg-surface py-1 pl-3 pr-1">
            <Icon icon={Smartphone} tone="primary" size={16} />
            <Text weight="semibold">{phone ? formatVnPhone(phone) : ''}</Text>
            <Button
              size="sm"
              variant="ghost"
              shape="pill"
              label={t('otp.change')}
              accessibilityLabel={t('otp.change_phone')}
              onPress={() => router.back()}
            />
          </Row>
        </AuthHero>

        <OtpInput
          value={token}
          onChange={(digits) => {
            setToken(digits);
            if (error) setError(null);
            // Đủ 6 số (thường do hệ điều hành tự điền) → xác nhận luôn, khỏi bấm nút.
            if (digits.length === OTP_LENGTH) void verify(digits);
          }}
          length={OTP_LENGTH}
          label={t('otp.label')}
          error={error ? errorText(error) : null}
          autoFocus
        />

        <Row gap={2} justify="center" className="min-h-11">
          {wait > 0 ? (
            <>
              <Icon icon={Clock} tone="muted" size={16} />
              <Text variant="caption" tone="muted">
                {t('otp.resend_in', { seconds: wait })}
              </Text>
            </>
          ) : (
            <Button label={t('otp.resend')} variant="ghost" size="sm" onPress={() => void resend()} />
          )}
        </Row>

        <Button label={t('otp.submit')} fullWidth loading={pending} disabled={token.length !== OTP_LENGTH} onPress={() => void verify()} />
      </Col>
      <Spacer size={6} />
      <Row gap={2} justify="center">
        <Icon icon={ShieldCheck} tone="success" size={16} />
        <Text variant="caption" tone="muted" className="shrink text-center">
          {t('otp.security_note')}
        </Text>
      </Row>
    </Screen>
  );
}

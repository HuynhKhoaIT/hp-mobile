// Khách mở màn cần tài khoản (Tôi, Tin của tôi, Tin đã lưu): giải thích + nút Đăng nhập (requireAuth → quay lại đúng màn).
import { LogIn } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { requireAuth } from '@/core/auth';
import { EmptyState } from '@/ui';

export function SignInPrompt() {
  const { t } = useTranslation('auth');
  return (
    <EmptyState
      icon={LogIn}
      title={t('dialog.title')}
      description={t('dialog.description')}
      action={{ label: t('sign_in'), onPress: () => requireAuth() }}
    />
  );
}

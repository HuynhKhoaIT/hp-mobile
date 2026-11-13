// Dòng miễn trừ "ứng dụng cộng đồng, không thuộc Tập đoàn Hòa Phát" (common:disclaimer — APP_DISCLAIMER_KEY) cuối các tab
// của mini-app (Trang chủ, Bộ lọc, Đã lưu, Chat, Quản lý tin). Chữ caption 14 — cỡ nhãn tối thiểu, như tab Tôi / hồ sơ.
import { useTranslation } from 'react-i18next';
import { Text } from '@/ui';

export function MiniDisclaimer({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Text variant="caption" tone="muted" className={['text-center', className].filter(Boolean).join(' ')}>
      {t('common:disclaimer')}
    </Text>
  );
}

// Header gradient màu Gọi thợ dùng chung cho 4 tab của mini-app (MiniAppHeader của @/ui): nút viên "← Quay lại" rời mini-app
// về super app, ô icon Wrench nền accent, tiêu đề + dòng phụ; `children` (ô tìm kiếm…) ở cuối header.
import { Wrench } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MiniAppHeader } from '@/ui';
import { backOrHome } from '../navigation';

export function ThoTabHeader({ title, subtitle, children }: { title?: string; subtitle?: string; children?: ReactNode }) {
  const { t } = useTranslation(['tho', 'common']);
  return (
    <MiniAppHeader
      back={{ label: t('common:actions.back'), onPress: backOrHome }}
      title={title ?? t('tho:title')}
      subtitle={subtitle}
      icon={Wrench}
    >
      {children}
    </MiniAppHeader>
  );
}

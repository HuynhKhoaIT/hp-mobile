// Cột phải của /tin-nhan khi chưa chọn hội thoại (chỉ thấy từ 1024px; nhỏ hơn thì trang chỉ có hộp thư).
import { MessagesSquare } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/shared/empty-state';

export async function ChatEmptyPane() {
  const t = await getTranslations('web.chat');
  return (
    <div className="flex flex-1 flex-col justify-center bg-bg">
      <EmptyState icon={MessagesSquare} title={t('select_title')} description={t('select_body')} />
    </div>
  );
}

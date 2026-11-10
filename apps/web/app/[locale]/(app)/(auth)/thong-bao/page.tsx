// /thong-bao — danh sách thông báo (tin nhắn mới, kết quả duyệt tin…). Đọc ở trình duyệt qua @hp/core/react (RLS: của
// mình) + Realtime; khu (auth): proxy.ts chặn khách, noindex. Web không có push (capabilities.appOnly).
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { NotificationsView } from '@/features/notifications/components/notifications-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.notifications');
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default function Page() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col py-6">
      <NotificationsView />
    </section>
  );
}

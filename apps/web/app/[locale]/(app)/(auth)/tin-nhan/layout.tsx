// /tin-nhan — khung chat: hộp thư (cột trái, giữ nguyên khi đổi hội thoại) + nội dung con (khung chat / cột trống).
// Toàn bộ là Client Component (Realtime, optimistic qua @hp/core/react); khu (auth): proxy.ts chặn khách, noindex.
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ChatShell } from '@/features/chat/components/chat-shell';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('chat');
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default function ChatLayout({ children }: LayoutProps<'/[locale]/tin-nhan'>) {
  return <ChatShell>{children}</ChatShell>;
}

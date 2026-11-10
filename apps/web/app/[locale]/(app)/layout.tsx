// Khu người dùng: header (tìm, Đăng tin, tin nhắn, thông báo, tài khoản) + thanh điều hướng dưới trên điện thoại.
// Điện thoại trông như app: không footer website, chỉ dòng miễn trừ; ngôn ngữ / giao diện / pháp lý ở trang "Tôi".
// DataProvider: TanStack Query + Supabase cho hook chung @hp/core/react và Realtime chấm đỏ (tin nhắn, thông báo).
// Client nhận thêm ns `chat` (hộp thư, khung chat, nút Nhắn tin ở chi tiết tin), `push` (chữ thông báo ở /thong-bao) và
// `group` (thẻ nhóm của "Xem thêm", nút tham gia / duyệt, form tạo nhóm).
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AppHeader } from '@/components/shared/app-header';
import { BottomNav } from '@/components/shared/bottom-nav';
import { DataProvider } from '@/components/shared/data-provider';
import { MobileDisclaimer, SiteFooter } from '@/components/shared/site-footer';
import { clientWebMessages } from '@/i18n/client-messages';

export default async function AppLayout({ children }: LayoutProps<'/[locale]'>) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={{
        web: clientWebMessages(messages.web),
        common: messages.common,
        errors: messages.errors,
        auth: messages.auth,
        listing: messages.listing,
        group: messages.group,
        chat: messages.chat,
        push: messages.push,
      }}
    >
      <DataProvider>
        <AppHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter className="hidden sm:block" />
        <MobileDisclaimer />
        <BottomNav />
      </DataProvider>
    </NextIntlClientProvider>
  );
}

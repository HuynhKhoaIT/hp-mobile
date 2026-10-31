// Khu người dùng: header (tìm, Đăng tin, tin nhắn, thông báo, tài khoản) + thanh điều hướng dưới trên điện thoại.
// Điện thoại trông như app: không footer website, chỉ dòng miễn trừ; ngôn ngữ / giao diện / pháp lý ở trang "Tôi".
import { AppHeader } from '@/components/shared/app-header';
import { BottomNav } from '@/components/shared/bottom-nav';
import { MobileDisclaimer, SiteFooter } from '@/components/shared/site-footer';

export default function AppLayout({ children }: LayoutProps<'/[locale]'>) {
  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter className="hidden sm:block" />
      <MobileDisclaimer />
      <BottomNav />
    </>
  );
}

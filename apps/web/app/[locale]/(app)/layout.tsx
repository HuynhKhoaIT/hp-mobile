// Khu người dùng: header (tìm, Đăng tin, tin nhắn, thông báo, tài khoản) + thanh điều hướng dưới trên điện thoại.
import { AppHeader } from '@/components/shared/app-header';
import { BottomNav } from '@/components/shared/bottom-nav';
import { SiteFooter } from '@/components/shared/site-footer';

export default function AppLayout({ children }: LayoutProps<'/[locale]'>) {
  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      {/* Chừa chỗ cho BottomNav (cao 56px + vùng an toàn) trên điện thoại. */}
      <div className="pb-20 sm:pb-0">
        <SiteFooter />
      </div>
      <BottomNav />
    </>
  );
}

// Khu marketing: landing, giới thiệu, pháp lý. Nội dung tĩnh; header chỉ phần tài khoản đọc theo request (Suspense).
import { SiteFooter } from '@/components/shared/site-footer';
import { SiteHeader } from '@/components/shared/site-header';

export default function MarketingLayout({ children }: LayoutProps<'/[locale]'>) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}

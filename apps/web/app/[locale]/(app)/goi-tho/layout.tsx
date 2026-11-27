// /goi-tho — mini-app Gọi thợ (mẫu thứ ba: người cần đăng yêu cầu → thợ báo giá → chọn → chat → hoàn thành → đánh giá). Cổng bật /
// tắt (admin cấu hình ở /admin/catalog, bảng mini_apps; mặc định TẮT): đang tắt → 404 cho cả trang chủ lẫn trang con. Khung màu
// riêng data-app-theme="goi-tho" (tím violet) + header / dải tab GoiThoNav cho mọi trang con.
import { GoiThoNav } from '@/features/goi-tho/components/goi-tho-nav';
import { MiniAppGate } from '@/features/home/components/mini-app-gate';

export default function Layout({ children }: LayoutProps<'/[locale]/goi-tho'>) {
  return (
    <MiniAppGate code="goiTho">
      <div data-app-theme="goi-tho" className="flex flex-1 flex-col">
        <GoiThoNav />
        {children}
      </div>
    </MiniAppGate>
  );
}

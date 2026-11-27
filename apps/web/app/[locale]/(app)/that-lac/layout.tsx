// /that-lac — cổng bật / tắt mini-app (admin cấu hình ở /admin/catalog, bảng mini_apps): đang tắt → 404 cho cả trang chủ lẫn trang con.
import { MiniAppGate } from '@/features/home/components/mini-app-gate';

export default function Layout({ children }: LayoutProps<'/[locale]/that-lac'>) {
  return <MiniAppGate code="lostFound">{children}</MiniAppGate>;
}
